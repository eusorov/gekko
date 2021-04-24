'use strict';
var _ = require('lodash');
const log = require('../core/log.js');

const util = require('../core/util.js');
const config = util.getConfig();

const Writer = require(util.dirs().gekko + 'plugins/'+config.adapter+'/writer');

var StrategyUpdateWriter = function(done) {
  console.log(" adapter ========= "+config.adapter + " config.gekko_id:"+config.gekko_id);
  this.writer = new Writer(done);

  _.bindAll(this);
};

/*
  stratUpdate [{date: xxx, indicators: {ind1: result, ind2: result}}]
*/
StrategyUpdateWriter.prototype.processStratUpdate = function(stratUpdate) {
  this.writer.writeIndicatorResult(config.gekko_id, stratUpdate)
}

StrategyUpdateWriter.prototype.processTradeCompleted = function(trade) {
  this.writer.writeTrade(trade)
}

StrategyUpdateWriter.prototype.finalize = function(done) {
  this.writer.finalize(done);
};


module.exports = StrategyUpdateWriter;
