const cache = require('../state/cache');
const manager = cache.get('apiKeyManager');

module.exports = {
  get: function (ctx) {
    ctx.body = manager.get();
  },
  add: function (ctx) {
    const content = ctx.request.body;

    manager.add(content.exchange, content.values);

    ctx.body = {
      status: 'ok'
    };
  },
  remove: function (ctx) {
    const exchange = ctx.request.body.exchange;

    manager.remove(exchange);

    ctx.body = {
      status: 'ok'
    };
  }
}
