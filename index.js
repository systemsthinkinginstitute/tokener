const crypto = require('crypto');
const base62 = require('base62/lib/ascii');

class Tokener {

  constructor(options) {
    const { secret, timeStep, digestBase=64 } = options;
    if (!secret) throw new Error('secret is required');
    if (!timeStep) throw new Error('timeStep is required');
    if (![64, 62].includes(digestBase)) throw new Error(`invalid digestBase: ${digestBase}`);
    if ('cache' in options) {
      this.caching = options.cache;
    } else {
      this.caching = true;
    }
    this.secret = secret;
    this.timeStep = timeStep;
    this.digestBase = digestBase;
    this.items = {};
    this.INVALID = 0;
    this.VALID = 1;
    this.EXPIRING = 2;
  }

  cache(key) {
    if(!this.items[key] || !this.caching) {
      if(Object.keys(this.items).length > 500) {
        this.items = {};
      }
      const hmac = crypto.createHmac('sha512', this.secret).update(key);
      this.items[key] = this.digestBase === 62 ? this.base62EncodeDigest(hmac.digest()) : hmac.digest('base64');
    }
    return this.items[key];
  }

  verify(data, hash) {
    if(typeof data !== 'string' || typeof hash !== 'string' ) {
      return false;
    }
    var epoch = Math.floor(new Date().getTime() / 1000 / this.timeStep); // e.g. http://tools.ietf.org/html/rfc6238
    // allow data to be empty, always take into account the time
    if (hash === this.cache(data + epoch) || hash === this.cache(data + (epoch + 1))) {
      return this.VALID; // truthy, valid and current
    }
    if (hash === this.cache(data + (epoch - 1))) {
      return this.EXPIRING; // truthy, expired but still valid
    }
    return this.INVALID;
  };

  generate(data, opts) {
    if(typeof data !== 'string') {
      return false;
    }
    var now = opts && opts.now || (new Date().getTime()),
        ts = opts && opts.timeStep || this.timeStep,
        secret =  opts && opts.secret || this.secret,
        epoch = Math.floor(now / 1000 / ts); // e.g. http://tools.ietf.org/html/rfc6238
    const hmac = crypto.createHmac('sha512', this.secret).update(data + epoch);
    return this.digestBase === 62 ? this.base62EncodeDigest(hmac.digest()) : hmac.digest('base64');
  };

  invalidate(data, hash) {
    var isValidHash = this.verify(data, hash),
      epoch = Math.floor(new Date().getTime() / 1000 / this.timeStep);

    if (!isValidHash) {
      throw 'invalid hash';
    } else {
      this.items[hash + epoch] = null;
    }

    return true;
  };

  base62EncodeDigest(buffer) {
    let encoded = '';
    for (let i = 0; i < buffer.length; i++) {
      encoded += base62.encode(buffer[i]);
    }
    return encoded;
  }
}

module.exports = Tokener;
