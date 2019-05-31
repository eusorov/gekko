const p = require('../../package.json');

// Retrieves API information
module.exports = function (ctx) {
  ctx.body = {
    version: p.version
  }
}