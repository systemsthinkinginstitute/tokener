const crypto = require('crypto');

class Token {

  constructor(options) {
    const { secret, timeStep } = options;
    if (!secret) throw new Error('secret is required');
    if (!timeStep) throw new Error('timeStep is required');
    if ('cache' in options) {
      this.caching = options.cache;
    } else {
      this.caching = true;
    }
    this.secret = secret;
    this.timeStep = timeStep;
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
      this.items[key] = crypto.createHmac('sha512', this.secret).update(key).digest('base64');
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
    return crypto.createHmac('sha512', secret).update(data + epoch).digest('base64');
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
}

module.exports = Token;
