const { getObj, freeObj } = require('./helpers');

module.exports.manifest = {
  getRaw: 'promise',
  verify: 'promise',
  free: 'sync'
};

/**
 * Generate raw string copy of the public sign key
 * @name window.safeCryptoPubSignKey.getRaw
 *
 * @param {PubSignKeyHandle} pubSignKeyHandle
 *
 * @returns {Promise<Buffer>} the raw sign key
 *
 * @example // Retrieving a raw string copy of the sign key:
 * window.safeCrypto.getAppPubSignKey(appHandle)
 *    .then((pubSignKeyHandle) => window.safeCryptoPubSignKey.getRaw(pubSignKeyHandle))
 *    .then((rawPk) => console.log('Sign key: ', rawPk.buffer.toString('hex')));
 */
module.exports.getRaw = (pubSignKeyHandle) => {
  return getObj(pubSignKeyHandle)
    .then((obj) => obj.netObj.getRaw());
};

/**
 * Verify the given signed data (buffer or string) using the public sign key
 * @name window.safeCryptoPubSignKey.verify
 *
 * @param {PubSignKeyHandle} pubSignKeyHandle
 *
 * @returns {Promise<Buffer>} verified data
 */
module.exports.verify = (pubSignKeyHandle, data) => {
  return getObj(pubSignKeyHandle)
    .then((obj) => obj.netObj.verify(data));
};

/**
 * Free the PubSignKey instance from memory
 * @name window.safeCryptoPubSignKey.free
 *
 * @param {PubSignKeyHandle} pubSignKeyHandle the PubSignKey handle
*/
module.exports.free = (pubSignKeyHandle) => freeObj(pubSignKeyHandle);

/**
 * @name PubSignKeyHandle
 * @typedef {String} PubSignKeyHandle
 * @description Holds the reference to a PubSignKey instance.
 * Note that it is required to free the memory used by such an instance when it's
 * not needed anymore by the client aplication, please refer to the `free` function.
*/
