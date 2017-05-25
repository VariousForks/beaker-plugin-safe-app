const safeApp = require('safe-app');
const ipc = require('./ipc');
const { genHandle, getObj, freeObj } = require('./helpers');

module.exports.manifest = {
  initialise: 'promise',
  connect: 'promise',
  authorise: 'promise',
  connectAuthorised: 'promise',
  webFetch: 'promise',
  isRegistered: 'promise',
  canAccessContainer: 'promise',
  refreshContainersPermissions: 'promise',
  getContainersNames: 'promise',
  getHomeContainer: 'promise',
  getContainer: 'promise',
  free: 'sync'
};

/**
 * @typedef {String} SAFEAppToken
 * @description Holds the reference to a SAFEApp instance which is the primary interface to interact
 * with the SAFE network.
 * Note that it is required to free the memory used by such an instance when it's
 * not needed anymore by the client aplication, please refer to the `free` function.
 **/

/**
 * @typedef {Object} AppInfo
 * @description Holds the information about tha client application, needed for authentication.
 * @param {String} id - unique identifier for the app
 *        (e.g. 'net.maidsafe.examples.mail-app')
 * @param {String} name - human readable name of the app (e.g. "Mail App")
 * @param {String} vendor - human readable name of the vendor (e.g. "MaidSafe Ltd.")
 **/

 /**
  * @typedef {String} AuthURI
  * @description The auth URI (`'safe-auth://...'`) returned by the Authenticator after the user has
  * authorised the application. This URL can be used by the
  * application to connect to the network wihout the need to get authorisation
  * from the Authenticator again. Although if the user decided to revoke the application
  * the auth URI shall be obtained again from the Authenticator.
  **/

/**
 * Create a new SAFEApp instance without a connection to the network
 *
 * @param {AppInfo} appInfo
 *
 * @returns {Promise<SAFEAppToken>} new app instace token
 **/
module.exports.initialise = (appInfo) => {
  if (this && this.sender) {
    const wholeUrl = this.sender.getURL();
    appInfo.scope = wholeUrl;
  } else {
    appInfo.scope = null;
  }

  return safeApp.initializeApp(appInfo)
    .then((app) => genHandle(app, null));
};

/**
 * Create a new, unregistered session (read-only),
 * e.g. useful for browsing web sites or just publicly avaiable data.
 *
 * @param {SAFEAppToken} appToken the app handle
 *
 * @returns {Promise<SAFEAppToken>} same app token
 **/
module.exports.connect = (appToken) => {
  return getObj(appToken)
    .then((obj) => obj.app.auth.connectUnregistered())
    .then(() => appToken);
};

/**
 * Request the Authenticator (and user) to authorise this application
 * with the given permissions and optional parameters.
 *
 * @param {SAFEAppToken} appToken the app handle
 * @param {Object} permissions - mapping the container-names
 *                  to a list of permissions you want to
 *                  request
 * @param {Object} options - optional parameters
 * @param {Boolean} [options.own_container=false] - whether or not to request
 *    our own container to be created for the app.
 *
 * @returns {Promise<AuthURI>} auth granted `safe-auth://`-URI
 *
 * @example // Example of authorising an app:
 * window.safeApp.authorise(
 *    appToken, // the app token obtained when invoking `initialise`
 *    {
 *      _public: ['Insert'], // request to insert into `_public` container
 *      _other: ['Insert', 'Update'] // request to insert and update in `_other` container
 *    },
 *    {own_container: true} // and we want our own container, too
 * )
 **/
module.exports.authorise = (appToken, permissions, options) => {
  return new Promise((resolve, reject) => {
    getObj(appToken)
      .then((obj) => obj.app.auth.genAuthUri(permissions, options)
        .then((authReq) => ipc.sendAuthReq(authReq, (err, res) => {
          if (err) {
            return reject(new Error('Unable to authorise the application: ', err));
          }
          return resolve(res);
        })))
      .catch(reject);
  });
};

/**
 * Create a new, registered Session (read-write)
 * If you have received a response URI (which you are allowed
 * to store securely), you can directly get an authenticated app
 * by using this helper function. Just provide said URI as the
 * second value.
 *
 * @param {SAFEAppToken} appToken the app handle
 * @param {AuthURI} authUri granted auth URI
 *
 * @returns {Promise<SAFEAppToken>} same app token
 **/
module.exports.connectAuthorised = (appToken, authUri) => {
  return getObj(appToken)
    .then((obj) => obj.app.auth.loginFromURI(authUri))
    .then((_) => appToken);
};

/**
 * Request the Authenticator (and user) to authorise this application
 * with further continer permissions.
 *
 * @param {SAFEAppToken} appToken the app handle
 * @param {Object} permissions mapping container name to list of permissions
 *
 * @returns {Promise<AuthURI>} auth granted `safe-auth://`-URI
 *
 * @example // Requesting further container authorisation:
 * window.safeApp.authoriseContainer(
 *   appToken, // the app token obtained when invoking `initialise`
 *   { _publicNames: ['Insert'] } // request to insert into `_publicNames` container
 * )
 **/
module.exports.authoriseContainer = (appToken, permissions) => {
  return new Promise((resolve, reject) => {
    getObj(appToken)
      .then((obj) => obj.app.auth.genContainerAuthUri(permissions)
        .then((authReq) => ipc.sendAuthReq(authReq, (err, res) => {
          if (err) {
            return reject(new Error('Unable to authorise the application: ', err)); // TODO send Error in specific
          }
          return resolve(res);
        })))
      .catch(reject);
  });
};

/**
 * Lookup a given `safe://`-URL in accordance with the
 * convention and fetch the requested object.
 *
 * @param {SAFEAppToken} appToken the app handle
 * @param {AuthURI} authUri granted auth URI
 *
 * @returns {Promise<File>} the file object found for that URL
 **/
module.exports.webFetch = (appToken, url) => {
  return getObj(appToken)
    .then((obj) => obj.app.webFetch(url)
      .then((f) => app.immutableData.fetch(f.dataMapName))
      .then((i) => i.read())
    );
};

/**
 * Whether or not this is a registered/authenticated session.
 *
 * @param {SAFEAppToken} appToken the app handle
 *
 * @returns {Boolean} true if this is an authenticated session
 **/
module.exports.isRegistered = (appToken) => {
  return getObj(appToken)
    .then((obj) => obj.app.auth.registered);
};

/**
 * Current network connection state, e.g. `Connected` or `Disconnected`.
 *
 * @param {SAFEAppToken} appToken the app handle
 *
 * @returns {String} network state
 **/
module.exports.networkState = (appToken) => {
  return getObj(appToken)
    .then((obj) => obj.app.networkState);
};

/**
 * Whether or not this session has specifc permission access of a given
 * container.
 *
 * @param {SAFEAppToken} appToken the app handle
 * @param {String} name name of the container, e.g. `_public`
 * @param {(String|Array<String>)} [permissions=['Read']] permissions to check for
 *
 * @returns {Promise<Boolean>} true if this app can access the container with given permissions
 **/
module.exports.canAccessContainer = (appToken, name, permissions) => {
  return getObj(appToken)
    .then((obj) => obj.app.auth.canAccessContainer(name, permissions));
};

/**
 * Refresh permissions for accessible containers from the network. Useful when
 * you just connected or received a response from the authenticator.
 *
 * @param {SAFEAppToken} appToken the app handle
 *
 * @returns {Promise} resolves when finished refreshing
 */
module.exports.refreshContainersPermissions = (appToken) => {
  return getObj(appToken)
    .then((obj) => obj.app.auth.refreshContainersPermissions())
    .then((_) => appToken);
};

/**
 * Get the names of all containers found.
 *
 * @param {SAFEAppToken} appToken the app handle
 *
 * @returns {Promise<Array<String>>} list of containers names
 */
module.exports.getContainersNames = (appToken) => {
  return getObj(appToken)
    .then((obj) => obj.app.auth.getContainersNames());
};

/**
 * Get the MutableData for the apps own container generated by Authenticator
 *
 * @param {SAFEAppToken} appToken the app handle
 *
 * @return {Promise<MutableDataHandle>} the handle for the MutableData behind it
 */
module.exports.getHomeContainer = (appToken) => {
  return getObj(appToken)
    .then((obj) => obj.app.auth.getHomeContainer()
      .then((md) => genHandle(obj.app, md)));
};

/**
 * Lookup and return the information necessary to access a container.
 *
 * @param {SAFEAppToken} appToken the app handle
 * @param {String} name name of the container, e.g. `_public`
 *
 * @returns {Promise<MutableDataHandle>} the MutableData handle the handle for the MutableData behind it
 */
module.exports.getContainer = (appToken, name) => {
  return getObj(appToken)
    .then((obj) => obj.app.auth.getContainer(name)
      .then((md) => genHandle(obj.app, md)));
};

/**
 * Free the SAFEApp instance from memory
 *
 * @param {SAFEAppToken} appToken the app handle
 */
module.exports.free = (appToken) => freeObj(appToken);
