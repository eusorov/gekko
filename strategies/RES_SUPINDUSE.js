/*jshint esversion: 6 */
// helpers
var _ = require('lodash');
var log = require('../core/log.js');
var helper = require('../plugins/strategieshelper.js');


// let's create our own method
var method = {};

// prepare everything our method needs
method.init = function () {
  this.hasBoughtBull = false;
  this.hasBoughtBear = false;

  this.prevValues = [];
  this.settings.candleSize = this.tradingAdvisor.candleSize;

  this.addIndicator('RES_SUPIND', 'RES_SUPIND', this.settings);
  // this.addIndicator('RES_SUP_BULL', 'RES_SUP_BULL', this.settings);

  // this.addIndicator('smaMiddle20', 'EMA_ENVELOPE', {optInTimePeriod : (20), offset: (60)/1 });
  // this.addIndicator('smaMiddle60', 'EMA_ENVELOPE', {optInTimePeriod : (20), offset: (0)/1 });
  // this.addIndicator('smaMiddle100', 'EMA_ENVELOPE', {optInTimePeriod : (20), offset: (-60)/1 });
  //this.addTulipIndicator('aroonosc', 'aroonosc', this.settings.aroonosc.parameters);
  
  /*
  * 1. generiert mehr Signale
  * 2. der bull-wave wird in kleine Abschnitte unterbrochen.
  * 3. stoch. generiert auch falsch Signale. Wenn diese Filtern, dann wird die Welle nicht bis zum Schluss genutzt.
  * 4. ohne stoploss -20% was zu viel ist. mit stoploss weniger Performance. 
  * 5. insgesamt ist die Performance schlechter als ohne Unterbrechungen. ab 01.05.2017
  * 6. Aber ab 01.01.2018 ist sie besser. 
  * 
  */
  this.addTulipIndicator('stochasticTulip', 'stoch', this.settings.stochasticTulip.parameters);

  let factor = 1440 / this.settings.candleSize

  this.smaDailies = [20, 60, 100, 140, 180, 220, 260];
  this.smaDailies.forEach(v => {
    this.addIndicator('smaMiddle' + v + 'daily', 'EMA_ENVELOPE', { optInTimePeriod: (20 * factor), offset: (140 - v) *0.03 });
  });
}

// for debugging purposes: log the last calculated
method.log = function (candle) {
}

method.check = function (candle) {
  let currentValue = {};

  let indicatorNames = Object.keys(this.indicators);
  indicatorNames.forEach((name) => currentValue[name] = this.indicators[name].result);

  indicatorNames = Object.keys(this.tulipIndicators);
  indicatorNames.forEach((name) => currentValue[name] = this.tulipIndicators[name].result);

  this.prevValue = this.prevValues[this.prevValues.length - 1];
  this.currentValue = currentValue;

  this.prevValues.push(currentValue);
  if (this.prevValues.length > 10) {
    this.prevValues.shift();
  }


  this.buyResSupImmidiatelyBull = false;
  if (this.currentValue.RES_SUPIND > 0  && this.prevValue
    && this.prevValue.RES_SUPIND == 0
    ){
      this.buyResSupImmidiatelyBull = true;
  }

  this.buyResSupImmidiatelyBear = false;
  if (this.currentValue.RES_SUPIND < 0  && this.prevValue
    && this.prevValue.RES_SUPIND == 0
    ){
      this.buyResSupImmidiatelyBear = true;
  }

  this.sellResSupImmidiatelyBull = false;
  if (this.currentValue.RES_SUPIND <= 0  && this.prevValue
    && this.prevValue.RES_SUPIND == 100
    ){
      this.sellResSupImmidiatelyBull = true;
  }
  this.sellResSupImmidiatelyBear = false;
  if (this.currentValue.RES_SUPIND >= 0  && this.prevValue
    && this.prevValue.RES_SUPIND == -100
    ){
      this.sellResSupImmidiatelyBear = true;
  }

  // if (this.currentValue.RES_SUPIND == 100 ) {
  //  // log.debug(this.prevValue);
  //   log.debug (candle.start.utc().format('YYYY-MM-DD HH:mm') + " buyResSupImmidiatelyBull:"+this.buyResSupImmidiatelyBull);
  // }
}

method.updateOneMin = function (candle) {
  this.indicators.RES_SUPIND.updateOneMin(candle);
  // this.indicators.RES_SUP_BULL.updateOneMin(candle);
  if (!this.completedWarmup || !this.currentValue) {
    return
  }


  let buyStochBull = false;
  if (this.currentValue.RES_SUPIND > 0  && this.prevValue
    && helper.crossLong(this.prevValue.stochasticTulip.stochK, this.prevValue.stochasticTulip.stochD, this.currentValue.stochasticTulip.stochK, this.currentValue.stochasticTulip.stochD)
    && this.currentValue.stochasticTulip.stochK < 50
    && this.currentValue.stochasticTulip.stochD < 50
    ){
      buyStochBull = true;
  }

  let buyStochBear = false;
  if (this.currentValue.RES_SUPIND < 0  && this.prevValue 
    && helper.crossShort(this.prevValue.stochasticTulip.stochK, this.prevValue.stochasticTulip.stochD, this.currentValue.stochasticTulip.stochK, this.currentValue.stochasticTulip.stochD)
    && this.currentValue.stochasticTulip.stochK > 50
    && this.currentValue.stochasticTulip.stochD > 50
    ){
      buyStochBear = true;
  }

  let sellStochBull = false;
  if (this.currentValue.RES_SUPIND > 0  && this.prevValue
    && this.prevValue.stochasticTulip.stochD > 80
    && this.currentValue.stochasticTulip.stochK < 80
    && this.currentValue.stochasticTulip.stochD < 80
    ){
      sellStochBull = true;
  }

  let sellStochBear = false;
  if (this.currentValue.RES_SUPIND < 0  && this.prevValue
    && this.prevValue.stochasticTulip.stochD < 20
    && this.currentValue.stochasticTulip.stochK > 20
    && this.currentValue.stochasticTulip.stochD > 20
    ){
      sellStochBear = true;
  }

  let buyadviceProp = {RES_SUPIND_RESULT : this.indicators.RES_SUPIND.result, buyStochBull, buyStochBear }
  let selladviceProp = {RES_SUPIND_RESULT : this.indicators.RES_SUPIND.result, sellStochBull, sellStochBear}

  // buy bull trend
  if (this.hasBoughtBull || buyadviceProp.RES_SUPIND_RESULT >= 0){
    this.bullTrendStrat(candle, buyadviceProp, selladviceProp);
    //
  }
  // buy bear trend
  if (this.hasBoughtBear || buyadviceProp.RES_SUPIND_RESULT <= 0){
    this.bearTrendStrat(candle, buyadviceProp, selladviceProp);
  }

}  

method.bullTrendStrat = function(candle, buyadviceProp, selladviceProp){
  if (!this.hasBoughtBull
    && !this.hasBoughtBear
    && ( buyadviceProp.RES_SUPIND_RESULT == 100 )
    && ( this.buyResSupImmidiatelyBull 
      || buyadviceProp.buyStochBull
    )
  ){
    this.hasBoughtBull = true;
    this.buyResSupImmidiatelyBull = false;
    if (buyadviceProp.buyStochBull) {
      this.hasBoughtStochBull = true;
    }
    this.sellResSupImmidiatelyBull = false;
    this.advice('long', candle, this.indicators.RES_SUPIND.resultprops);
    this.stop = candle.close*0.90;   // stoploss max 10%
  }else if (this.hasBoughtBull
    // && (buyadviceProp.RES_SUPIND_RESULT == 0) 
    && (this.sellResSupImmidiatelyBull 
       || ( selladviceProp.sellStochBull && candle.close > this.stop * 1.15)
       || ( candle.close < this.stop && !this.hasBoughtStochBull)
      )
  ){
    this.hasBoughtBull = false;
    this.hasBoughtStochBull = false;
    this.buyResSupImmidiatelyBull = false;
    this.sellResSupImmidiatelyBull = false;
    this.advice('short', candle, this.indicators.RES_SUPIND.resultprops);
    this.stop = 0;
  }
}

method.bearTrendStrat = function(candle, buyadviceProp, selladviceProp){
  if (!this.hasBoughtBear
    && !this.hasBoughtBull
    && ( buyadviceProp.RES_SUPIND_RESULT == -100 )
    && ( this.buyResSupImmidiatelyBear 
      || buyadviceProp.buyStochBear
    )
  ){
    this.hasBoughtBear = true;
    this.buyResSupImmidiatelyBear = false;
    this.sellResSupImmidiatelyBear= false;
    if (buyadviceProp.buyStochBear) {
      this.hasBoughtStochBear = true;
    }
    this.advice('long bear', candle, this.indicators.RES_SUPIND.resultprops);
    this.stop = candle.close*1.10;   // stoploss max 5%
  }else if (this.hasBoughtBear
    // && (selladviceProp.RES_SUPIND_RESULT == 0
    //   )
    && (this.sellResSupImmidiatelyBear 
        || (selladviceProp.sellStochBear && candle.close < this.stop * 0.85)
        || (candle.close > this.stop && !this.hasBoughtStochBear)
      )      
  ){
    this.hasBoughtBear = false;
    this.buyResSupImmidiatelyBear = false;
    this.sellResSupImmidiatelyBear= false;
    this.hasBoughtStochBear = false;
    this.advice('short bear', candle, this.indicators.RES_SUPIND.resultprops);
    this.stop = 0;
  }
}

// {
//   if (this.completedWarmup && this.currentValue) {
//     if (this.hasBoughtBull && (
//       this.indicators.RES_SUPIND.result == 0
//       // ||
//       // this.indicators.RES_SUP_BULL.result == 0
//       )) {
//       this.advice('short', candle, this.indicators.RES_SUPIND.resultprops)
//       this.hasBoughtBull = false;
//       // this.indicators.RES_SUPIND.result = 0;
//       // this.indicators.RES_SUPIND.result = 0;
//     } else if (this.hasBoughtBear && this.indicators.RES_SUPIND.result == 0) {
//       this.advice('short bear', candle, this.indicators.RES_SUPIND.resultprops)
//       this.hasBoughtBear = false;
//       // this.indicators.RES_SUPIND.result = 0;
//     }

//     if (!this.hasBoughtBull && !this.hasBoughtBear && this.indicators.RES_SUPIND.result > 0) { //&& this.indicators.RES_SUPIND.result > 0
//       // if (this.indicators.RES_SUP_BULL.result > 0){

//         this.advice('long', candle, this.indicators.RES_SUPIND.resultprops)
//         this.hasBoughtBull = true;
//         this.indicators.RES_SUPIND.hasBoughtBull = true;
//         this.indicators.RES_SUP_BULL.hasBoughtBull = true;
//         // this.indicators.RES_SUPIND.prevValues.length = 0;        
//         // this.indicators.RES_SUP_BULL.prevValues.length = 0;    
//       // }
//     } else if (!this.hasBoughtBear && !this.hasBoughtBull && this.indicators.RES_SUPIND.result < 0) {
//        this.advice('long bear', candle, this.indicators.RES_SUPIND.resultprops)
//        this.hasBoughtBear = true;
//     }
//   }
// }

module.exports = method;
