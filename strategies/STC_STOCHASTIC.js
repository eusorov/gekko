/*jshint esversion: 6 */

// helpers
var _ = require('lodash');
var log = require('../core/log.js');
var helper = require('../plugins/strategieshelper.js');

// let's create our own method
var method = {};

// prepare everything our method needs
method.init = function () {
  this.requiredHistory = this.tradingAdvisor.historySize;

  this.hasBoughtBull = false;
  this.hasBoughtBear = false;
  this.bearMarket = false;

  this.prevValues = [];
  this.breakSmaProcent = 6;
  this.targetProcent = 10;
  this.stopLossProcent = 10;

  // always calculate daily sma
  // 24h =  1440; 1440/240 = 6
  let factor = 1440 / this.tradingAdvisor.candleSize;

  this.crossedStochPersistent = 0;
  this.shortCrossSma20Persistent = 0;

  // define the indicators we need
  this.addIndicator('smaShort20', 'SMA', this.settings.smaShort20.parameters.optInTimePeriod * factor);
  this.addIndicator('ema100', 'EMA', this.settings.ema100.parameters.optInTimePeriod * factor);
  // this.addIndicator('smaMiddle80', 'SMA', this.settings.smaMiddle80.parameters.optInTimePeriod*factor);
  // this.addIndicator('smaMiddle60', 'SMA', this.settings.smaMiddle60.parameters.optInTimePeriod*factor);
  // this.addIndicator('smaMiddle40', 'SMA', this.settings.smaMiddle40.parameters.optInTimePeriod*factor);

  this.addIndicator('stc', 'STC', this.settings.stc.parameters);
  this.addIndicator('roc', 'ROC', this.settings.roc.parameters.optInTimePeriod);
  this.addTulipIndicator('stochasticTulip', 'stoch', this.settings.stochasticTulip.parameters);

// eth 3187 % (2Stoploss: 2999 %)!!!! 1h
// xbt                      87% nein
// XRP                     112% 3 positiv 13 neg. nein
};

// what happens on every new candle?
method.update = function (candle) {

}

// for debugging purposes: log the last calculated
// EMAs and diff.
method.log = function (candle) {
}

method.check = function (candle) {
  this.stc = this.indicators.stc.result;
  this.roc = this.indicators.roc.result;
  this.smaShort20 = this.indicators.smaShort20.result;
  this.ema100 = this.indicators.ema100.result;

  let currentValue = {};
  currentValue.candle = candle;

  let indicatorNames = Object.keys(this.indicators);
  indicatorNames.forEach((name) => currentValue[name] = this.indicators[name].result);

  indicatorNames = Object.keys(this.tulipIndicators);
  indicatorNames.forEach((name) => currentValue[name] = this.tulipIndicators[name].result);

  this.prevValue = this.prevValues[this.prevValues.length-1];
  this.currentValue = currentValue;

  this.prevValues.push(currentValue);

  if (this.prevValues.length > 100) {
    this.prevValues.shift();
  }

  if (this.prevValues.length == 1){
    return;
  }

  //The 100-period EMA is seen to be pointing upwards.
  let emaUpwards = currentValue.ema100 > this.prevValue.ema100 ? true: false ;

  // The Stochastics lines have crossed at oversold levels
  // log.debug(this.prevValue);
  //stochastic cross at down thresholds
  if (!this.hasBoughtBull
    // 2. Stochastics crossed at oversold levels in the past 10 days!
    && helper.crossLong(this.prevValue.stochasticTulip.stochK, this.prevValue.stochasticTulip.stochD, this.currentValue.stochasticTulip.stochK, this.currentValue.stochasticTulip.stochD)
    && this.currentValue.stochasticTulip.stochK <= this.settings.stochasticTulip.thresholds.buy.strong_down
    && this.currentValue.stochasticTulip.stochD <= this.settings.stochasticTulip.thresholds.buy.strong_down
  ) {
    this.crossedStochPersistentBull = 1;
  }
  this.crossedStochPersistentBull = isCrossOld(this.crossedStochPersistentBull, this.settings.stochasticTulip.thresholds.cross_in_last_days);


  if (!this.hasBoughtBear
    // 2. Stochastics crossed at overbought levels in the past 10 days!
    && helper.crossShort(this.prevValue.stochasticTulip.stochK, this.prevValue.stochasticTulip.stochD, this.currentValue.stochasticTulip.stochK, this.currentValue.stochasticTulip.stochD)
    && this.currentValue.stochasticTulip.stochK >= this.settings.stochasticTulip.thresholds.up
    && this.currentValue.stochasticTulip.stochD >= this.settings.stochasticTulip.thresholds.up
  ) {
    this.crossedStochPersistentBear = 1;
  }
  this.crossedStochPersistentBear = isCrossOld(this.crossedStochPersistentBear, this.settings.stochasticTulip.thresholds.cross_in_last_days);


  // if (this.hasBoughtBull
  //   && helper.crossShort(this.prevValue.stc, this.settings.stc.thresholds.up, this.currentValue.stc, this.settings.stc.thresholds.up)
  // ) {
  //   this.crossedStochPersistentBullSell = 1;
  // }

  // if (this.hasBoughtBear
  //   && helper.crossLong(this.prevValue.stc, this.settings.stc.thresholds.down, this.currentValue.stc, this.settings.stc.thresholds.down)
  // ) {
  //   this.crossedStochPersistentBearSell = 1;
  // }
  // this.crossedStochPersistentBullSell = isCrossOld(this.crossedStochPersistentBullSell, this.settings.stochasticTulip.thresholds.cross_in_last_days);
  // this.crossedStochPersistentBearSell = isCrossOld(this.crossedStochPersistentBearSell, this.settings.stochasticTulip.thresholds.cross_in_last_days);

  // breakSmaWithMomentum(2, candle, this.prevCandle, this.prevsmaShort20, this.smaShort20, this.roc);

  this.breakSma = 0;
  if ((!this.bearMarket && this.hasBoughtBull) || (this.bearMarket && this.hasBoughtBear)) {
    const smaDaily = this.smaShort20;
    if (breakSmaFn(this.breakSmaProcent, currentValue.candle, smaDaily, this.bearMarket,
          !this.bearMarket && this.prevValues.some((prevValue)=>prevValue.candle.close > prevValue.smaShort20)
       ||  this.bearMarket && this.prevValues.some((prevValue)=>prevValue.candle.close < prevValue.smaShort20)
      )) {
      this.breakSma = true;
    }
  // log.debug (candle.start.utc().format('YYYY-MM-DD HH:mm') + " bearMarket: "+this.bearMarket + " breakSma:"+this.breakSma + " candle.close:"+(candle.close * (1-(this.breakSmaProcent+0)*0.01)).toFixed(2) + " sma:"+smaDaily.toFixed(2) + " " +this.prevValues.some((prevValue)=>prevValue.candle.close < prevValue.smaShort20))
  }

  if (breakSmaFn(this.breakSmaProcent, currentValue.candle, this.smaShort20, this.bearMarket, true)){
    if (!this.bearMarket && (currentValue.candle.close < this.smaShort20)){ //
      this.bearMarket = true; //break MA then bearMarket
      console.log('set bearMarket = true');
    }else if (this.bearMarket && (currentValue.candle.close >  this.smaShort20)){
      this.bearMarket = false;
      console.log('set bearMarket = false');
    }
  }

  //check if crosses are too old

  if (this.breakSma){
    //log.debug (candle.start.format('YYYY-MM-DD HH:mm') + ' stc: '+this.stc.toFixed(2) + ' '   + ' crossedStochPersistentBull: '+this.crossedStochPersistentBull+ ' roc: '+(this.roc? this.roc.toFixed(2):'') );
  }

  // isTrend: isTrend
  let buyadviceProp = {
    crossedStochPersistentBull: this.crossedStochPersistentBull,
    crossedStochPersistentBear: this.crossedStochPersistentBear,
    stc: this.stc,
    emaUpwards: emaUpwards,
    prevStc: this.prevValue.stc,
    bearMarket: this.bearMarket
  };
  let selladviceProp = {
    breakSma: this.breakSma,
    roc: this.roc, roc_thresholds_down: this.settings.roc.thresholds.down,
    bearMarket: this.bearMarket,
    crossedStochPersistentBullSell: this.crossedStochPersistentBullSell,
    crossedStochPersistentBearSell: this.crossedStochPersistentBearSell
  };

  // buy bull trend
  if (this.hasBoughtBull || !this.bearMarket) {
    this.bullTrendStrat(candle, buyadviceProp, selladviceProp);
  }
  // buy bear trend
  if (this.hasBoughtBear || this.bearMarket){
    this.bearTrendStrat(candle, buyadviceProp, selladviceProp);
  }
};

method.bullTrendStrat = function (candle, buyadviceProp, selladviceProp) {
  if (!this.hasBoughtBull && !this.hasBoughtBear &&
    ( buyadviceProp.crossedStochPersistentBull > 0 &&      // 2. Stochastics crossed at oversold levels in the past x days!
      buyadviceProp.stc >= this.settings.stc.thresholds.down &&// 3. STC left oversold level and is above +10 or thresholds.down
      buyadviceProp.prevStc <= this.settings.stc.thresholds.down //
     // && buyadviceProp.emaUpwards // is ema100 upwards
    )
  ) {
    this.hasBoughtBull = true;
    this.advice('long', candle, buyadviceProp);
    this.crossedStochPersistentBull = 0;
    this.prevValues.length = 0 // get rid of previous values
    // this.stop = this.prevCandle.open < candle.close ? Math.min(this.prevCandle.open, this.candle.open * 0.9) : candle.close*0.9;   // stoploss max 10%
    if (candle.close < this.smaShort20){
    //   this.target = this.candle.close * (1+this.targetProcent*0.01);
      this.stop = candle.close*(1-this.stopLossProcent*0.01);   // stoploss max 10%
    }
  } else if (this.hasBoughtBull &&
    (selladviceProp.breakSma
      // && selladviceProp.roc <= selladviceProp.roc_thresholds_down
       || (candle.close < this.stop)
      // || (selladviceProp.crossedStochPersistentBullSell > 0)
      // || (candle.close >= this.target && candle.close < this.smaShort20)
    )
  ) {

    this.hasBoughtBull = false;
    this.advice('short', candle, selladviceProp);
    this.crossedStochPersistentBull = 0;
    this.crossedStochPersistentBullSell = 0;
    this.target = undefined;
    this.stop = undefined;

  }
};

method.bearTrendStrat = function (candle, buyadviceProp, selladviceProp) {
  if (!this.hasBoughtBear && !this.hasBoughtBull &&
    (buyadviceProp.crossedStochPersistentBear > 0 &&      // 2. Stochastics crossed at overbought levels in the past x days!
      buyadviceProp.stc <= this.settings.stc.thresholds.up &&// 3. STC left overbought level and is belowe -10 or thresholds.up
      buyadviceProp.prevStc >= this.settings.stc.thresholds.up //
     // && !buyadviceProp.emaUpwards // is ema100 upwards
    )
  ) {
    this.hasBoughtBear = true;
    this.advice('long bear', candle, buyadviceProp);
    this.crossedStochPersistentBear = 0;
    this.prevValues.length = 0
    //this.stop = this.prevCandle.open < this.candle.close ? Math.min(this.prevCandle.open, this.candle.open * 0.9) : this.candle.close;   // stoploss max 10%
    this.stop = this.candle.close * 1.1;   // stoploss max 10%
  } else if (this.hasBoughtBear &&
    (selladviceProp.breakSma
      // && selladviceProp.roc <= selladviceProp.roc_thresholds_down
      || (candle.close > this.stop)
    //  || (selladviceProp.crossedStochPersistentBearSell > 0)
    )
  ) {
    this.hasBoughtBear = false;
    this.advice('short bear', candle, selladviceProp);
    this.crossedStochPersistentBear = 0;
    this.target = undefined;
    this.stop = undefined;
  }
};

function isCrossOld(cross, maxAge) {
  if (cross > 0 && cross < maxAge) {
    cross++;
  } else {
    cross = 0; // cross is too old, reset.
  }

  return cross;
}

function breakSmaFn (procent, candle, sma, bearMarket, shouldCheck){
  let breakSma = false;
  if (!shouldCheck)  return false;

  //if (bearMarket) console.log('bearMarket breakSMA shouldCheck')

  if ((!bearMarket && candle.close * (1+(procent+0)*0.01) < sma) || (bearMarket && candle.close * (1-(procent+0)*0.01) > sma)){
    breakSma = true;
    //if (bearMarket) console.log('bearMarket breakSMA')
  }
 // log.debug (candle.start.utc().format('YYYY-MM-DD HH:mm') + " bearMarket: "+bearMarket + " breakSma:"+breakSma + " candle.close:"+(candle.close * (1-(procent+0)*0.01)).toFixed(2) + " sma:"+sma.toFixed(2));

  return breakSma;
}
module.exports = method;
