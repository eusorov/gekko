const cache = require('../state/cache');

module.exports = function(name) {
  return function (ctx) {
    ctx.body = cache.get(name).list();
  }
}