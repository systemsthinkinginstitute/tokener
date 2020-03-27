const assert = require('assert');
const Tokener = require('../index.js');

const token1 = new Tokener({ secret: 'AAB', timeStep: 2 * 60 });
const t1 = token1.generate('foo');

assert(token1.verify('foo', t1) === 1);
assert(token1.verify('food', t1) === 0);

const token2 = new Tokener({ secret: 'CDD', timeStep: 30 * 60 });
const t2 = token2.generate('bar');

assert(token2.verify('bar', t2) === 1);
assert(token2.verify('bard', t2) === 0);

assert(token1.verify('foo', t1) === 1);
assert(token1.verify('food', t1) === 0);

