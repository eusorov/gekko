/*jshint esversion: 6 */

var log = require('../core/log.js');
var helper = require('../plugins/strategieshelper.js');

// Let's create our own method
var method = {};

// Prepare everything our method needs
method.init = function() {
  this.name = 'tulip-cci-bear-daily';

  this.hasBoughtBull = false;
  this.hasBoughtBear = false;

  this.cci = undefined;
  // how many candles do we need as a base
  // before we can start giving advice?
  this.requiredHistory = this.tradingAdvisor.historySize;
  
  let factor = 1440 / this.tradingAdvisor.candleSize;

  // define the indicators we need
  this.addIndicator('ccibear', 'CCI', this.settings.ccibear.parameters.optInTimePeriod * factor);
  this.addIndicator('ccibull', 'CCI', this.settings.ccibull.parameters.optInTimePeriod * factor);

 // this.addIndicator('smaLong', 'SMA', this.settings.smaLong.parameters.optInTimePeriod);
  this.addIndicator('smaMiddle', 'SMA', this.settings.smaMiddle.parameters.optInTimePeriod* factor);

    //eth 1667% 1d
    //eth  924% 4h
    //eth  683% 1h

};

// What happens on every new candle?
method.update = function(candle) {
   this.ccibear = this.indicators.ccibear.result;
   this.ccibull = this.indicators.ccibull.result;

   this.smaMiddle = this.indicators.smaMiddle.result;
  };
  
  
  method.log = function(candle) {
  };
  
  // Based on the newly calculated
  // information, check if we should
  // update or not.
  method.check = function(candle) {
    
  // this.smaLong = this.indicators.smaLong.result;
  //this.bearMarket=  this.smaMiddle < this.smaLong ? true : false;
  this.bearMarket=  candle.close < this.smaMiddle ? true : false;
  if (this.ccibull) {
    log.debug (candle.start.format('YYYY-MM-DD HH:mm')+ ' ccibull: '+this.ccibull.toFixed(2));
  }

  // buy bull trend
  if (this.hasBoughtBull || !this.bearMarket){
    this.bullTrendStrat(candle);
  }
  // buy bear trend
  if (this.hasBoughtBear || this.bearMarket){
    this.bearTrendStrat(candle);
  }
};

method.bullTrendStrat = function(candle){
  if(!this.hasBoughtBull && !this.hasBoughtBear && 
    this.settings.ccibull.thresholds.up < this.ccibull){ //strong long
    this.hasBoughtBull = true;
    this.stop = candle.close*0.90; 
    this.advice('long', candle, {ccibull: this.ccibull});
  }else if(this.hasBoughtBull && 
    (
      this.settings.ccibull.thresholds.down > this.ccibull 
   || (candle.close < this.stop)
    )) { //strong short
    this.hasBoughtBull = false;
    this.advice('short', candle, {ccibull: this.ccibull});
  }
};

method.bearTrendStrat = function(candle){
  if(!this.hasBoughtBear && !this.hasBoughtBull
    && this.settings.ccibear.thresholds.down > this.ccibear //strong buy bear
    ){
     this.hasBoughtBear = true;
     this.stop = candle.close*1.10; 
     this.advice('long bear', candle, {ccibear: this.ccibear});
  }else  if( this.hasBoughtBear  && 
    (this.settings.ccibear.thresholds.up < this.ccibear 
    || (candle.close > this.stop))
    ) { //strong sell bear
     this.hasBoughtBear = false;
     this.advice('short bear', candle, {ccibear: this.ccibear});
  }
};

module.exports = method;
