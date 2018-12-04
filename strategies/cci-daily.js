/*jshint esversion: 6 */
var log = require('../core/log.js');
// Let's create our own method
var method = {};

// Prepare everything our method needs
method.init = function() {
  this.name = 'cci-daily';
  
  this.hasBought = false;
  this.cci = undefined;
  // how many candles do we need as a base
  // before we can start giving advice?
  this.requiredHistory = this.tradingAdvisor.historySize;

  // define the indicators we need
  this.addIndicator('cci', 'CCI', this.settings.cci.parameters.optInTimePeriod);

  //eth 1206% 1d
  //xbt 428%
  //xrp 194%
};

// What happens on every new candle?
method.update = function(candle) {
};


method.log = function(candle) {
};

method.check = function(candle) {
  this.cci = this.indicators.cci.result;
  
  if (this.cci){
    log.debug (candle.start.format('YYYY-MM-DD HH:mm')+  ' cci: '+this.cci.toFixed(2));
  }

  if(this.settings.cci.thresholds.up < this.cci && !this.hasBought){ //strong long
    this.hasBought = true;
    this.advice('long');
  }else  if(this.settings.cci.thresholds.down > this.cci && this.hasBought) { //strong short
    this.hasBought = false;
    this.advice('short');
  }
};

module.exports = method;
