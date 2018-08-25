const _ = require('lodash');
const fs = require('fs');

const gekkoRoot = __dirname + '/../../';
var util = require(__dirname + '/../../core/util');

var config = {};

config.debug = false;
config.silent = false;

util.setConfig(config);

module.exports = function (ctx) {
  const exchangesDir = fs.readdirSync(gekkoRoot + 'exchange/wrappers/');
  const exchanges = exchangesDir
    .filter(f => _.last(f, 3).join('') === '.js')
    .map(f => f.slice(0, -3));

  let allCapabilities = [];

  exchanges.forEach(function (exchange) {
    let Trader = null;

    try {
      Trader = require(gekkoRoot + 'exchange/wrappers/' + exchange);
    } catch (e) {
      return;
    }

    if (!Trader || !Trader.getCapabilities) {
      return;
    }

    allCapabilities.push(Trader.getCapabilities());
  });

  ctx.body = allCapabilities;
}
