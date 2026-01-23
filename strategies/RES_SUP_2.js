/*jshint esversion: 6 */
// helpers
var _ = require('lodash');
var helper = require('../plugins/strategieshelper.js');
const TULIPASYNC = require('./indicators/TulipAsync');

// let's create our own method
var method = {};

// prepare everything our method needs
method.init = function () {
  this.hasBoughtBull = false;
  this.hasBoughtBear = false;
  this.bearMarket = false;
  this.buyingAge = 0;

  this.prevValues = [];
  this.settings.candleSize = this.tradingAdvisor.candleSize;

  // Defaults if not in settings
  this.nearSmaProcent = (this.settings.res_sup && this.settings.res_sup.nearSmaProcent) || 1; 
  this.breakSmaProcent = (this.settings.res_sup && this.settings.res_sup.breakSmaProcent) || 3;

  this.buyBullSma = 0;
  this.buyBearSma = 0;
  this.breakSma = 0;

  let factor = 1440 / this.settings.candleSize

  this.smaDailies = [20, 60, 100, 140, 180, 220, 260];
  this.smaDailies.forEach(v => {
    this.addIndicator('smaMiddle' + v + 'daily', 'EMA_ENVELOPE', { optInTimePeriod: (20 * factor), offset: (140 - v) *0.03 });
  });

  this.addTulipIndicator('stochasticTulip', 'stoch', this.settings.stochasticTulip.parameters);

  this.customTulipIndicators = {};
  this.customTulipIndicators.aroonosc = new TULIPASYNC({ indicator: 'aroonosc', length: 900,
       candleinput: 'high,low',
       options: [this.settings.aroonosc.parameters.optInTimePeriod * factor/6] });

       
  this.addIndicator('smaMiddle100Factor', 'SMA', 100 * factor);

}

// for debugging purposes: log the last calculated
method.log = function (candle) {
}

method.check = async function (candle) {
  let currentValue = {};
  currentValue.candle = candle;
  
  // 1. Gather SMA values


  let indicatorNames = Object.keys(this.indicators);
  indicatorNames.forEach((name) => currentValue[name] = this.indicators[name].result);

  // 2. Update and gather Aroon
  const aroonoscResult = await this.customTulipIndicators.aroonosc.update(candle);
  currentValue.aroonosc = aroonoscResult[0];
 

  // 3. Manage History
  this.prevValue = this.prevValues[this.prevValues.length-1];
  this.currentValue = currentValue;
  this.prevValues.push(currentValue);
  if (this.prevValues.length > 50) this.prevValues.shift();

  this.buyingAge = this.buyingAge > 0? this.buyingAge+1 : 0;

  // 4. Check Bear Market & Break SMA
  this.breakSma = 0;
  if ((!this.bearMarket && this.hasBoughtBull) || (this.bearMarket && this.hasBoughtBear)){
    const smaDailies = this.bearMarket ? this.smaDailies.slice().reverse() : this.smaDailies;
    
    smaDailies.some((v)=> {

      const smaDaily = currentValue['smaMiddle'+v+'daily'];
      // logic adapted from RES_SUPIND.js
      if (breakSmaFn(this.breakSmaProcent, currentValue.candle, smaDaily, this.bearMarket, (!this.bearMarket && this.buyBullSma === v) || (this.bearMarket && this.buyBearSma === v) 
               || (!this.bearMarket && this.buyBullSma > v &&  this.prevValues.some((prevValue) => prevValue.candle.close > smaDaily ))
              || ( this.bearMarket && this.buyBearSma < v &&  this.prevValues.some((prevValue) => prevValue.candle.close < smaDaily )) 
          )){

        this.breakSma = v;
        
        // Defaults for market switch thresholds if not in settings
        const breakSmaBearMarket = (this.settings.res_sup && this.settings.res_sup.breakSmaBearMarket) || 140;
        const breakSmaBullMarket = (this.settings.res_sup && this.settings.res_sup.breakSmaBullMarket) || 140;

        if (!this.bearMarket && (currentValue.candle.close < currentValue['smaMiddle100Factor'])){ 
          this.bearMarket = true; 
        }else if (this.bearMarket && (currentValue.candle.close >  currentValue['smaMiddle100Factor'])){
          this.bearMarket = false;
        }
        return true;
      }
    });
  }

  //stochastic
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
}

// we can make hier a stoploss?
method.updateOneMin = function(candle) {
  if (!this.currentValue){
    return;
  }
  let isTrend = this.currentValue.aroonosc >= 50 || this.currentValue.aroonosc <= -50;
  //isTrend = true;
  //near smaLine within x%
  let nearSma = getNearSma(candle, this.prevValue, this.smaDailies, this.currentValue, this.nearSmaProcent, this.bearMarket, ((!this.bearMarket && !this.hasBoughtBull) || (this.bearMarket && !this.hasBoughtBear)));

  let buyadviceProp = {nearSma : nearSma, isTrend: isTrend, bearMarket: this.bearMarket}
  let selladviceProp = {breakSma: this.breakSma, bearMarket: this.bearMarket}
  // buy bull trend
  if (this.hasBoughtBull || !this.bearMarket){
    this.bullTrendStrat(candle, buyadviceProp, selladviceProp);
  }
  // buy bear trend
  if (this.hasBoughtBear || this.bearMarket){
    this.bearTrendStrat(candle, buyadviceProp, selladviceProp);
  }

}

method.bullTrendStrat = function(candle, buyadviceProp, selladviceProp){
  if (!this.hasBoughtBull
    && !this.hasBoughtBear
    && ( buyadviceProp.nearSma > 0 )
    && buyadviceProp.isTrend
  ){
   
    this.hasBoughtBull = true;
    this.advice('long', candle, {nearSma: buyadviceProp.nearSma, isTrend: buyadviceProp.isTrend, bearMarket: buyadviceProp.bearMarket}); // Executing buy
    
    // merken sma
    this.buyBullSma = buyadviceProp.nearSma;
    this.breakSma = 0;
    this.prevValues.length = 0; // get rid of previous values
    this.stop = candle.close*0.90;   // stoploss max 10%
  }else if (this.hasBoughtBull
    && (selladviceProp.breakSma > 0
      // || selladviceProp.resistanceSma > 0
      // || (candle.close < this.stop)
      ) 
  ){
    this.hasBoughtBull = false;
    this.advice('short', candle, {breakSma: selladviceProp.breakSma, bearMarket: selladviceProp.bearMarket}); // Executing sell
    
    this.buyingAge = 0;
    this.breakSma = 0;
    this.buyBullSma = 0;
    this.stop = 0;
  }
}

method.bearTrendStrat = function(candle, buyadviceProp, selladviceProp){
  if (!this.hasBoughtBear
    && !this.hasBoughtBull
    && ( buyadviceProp.nearSma > 0 )
    && buyadviceProp.isTrend
  ){
    this.hasBoughtBear = true;
    this.advice('long bear', candle, {nearSma: buyadviceProp.nearSma, isTrend: buyadviceProp.isTrend, bearMarket: buyadviceProp.bearMarket}); 
    
    this.buyingAge = 1;
    this.buyBearSma = buyadviceProp.nearSma;
    this.breakSma = 0;
    this.prevValues.length = 0; 
    this.stop = candle.close*1.10;   
  }else if (this.hasBoughtBear
    && (selladviceProp.breakSma > 0) 
  ){
    this.hasBoughtBear = false;
    this.advice('short bear', candle, {breakSma: selladviceProp.breakSma, bearMarket: selladviceProp.bearMarket}); // Exit short = Buy back
    
    this.buyingAge = 0;
    this.breakSma = 0;
    this.buyBearSma = 0;
    this.stop = 0;
  }
}

function getNearSma(candle, prevValue, smaDailies, indicators, procent, bearMarket, shouldCheck) {
  let nearSma = 0;
  if (shouldCheck) { // first try with lowest SMA
    smaDailies = !bearMarket ? smaDailies.reverse() : smaDailies;
    const smaDailiesFiltered = smaDailies.filter((v) => bearMarket ? v < 220 : v > 60); //60ETH

    smaDailiesFiltered.some((v) => {
      // if ((!bearMarket && v < 100) || (bearMarket && v >180)) return false; // no buy at upper bands or lower bands
      const smaNext = !bearMarket ? v - 40 : v+40;
      const smaDaily = indicators['smaMiddle' + v + 'daily'];
      const smaNextDaily = indicators['smaMiddle' + smaNext + 'daily'];
      if (nearSmaFn(procent, candle, smaDaily, prevValue, bearMarket, (!bearMarket && smaDaily < smaNextDaily) || (bearMarket)
          // with reverse with need check MA20 explicitly
          || (!bearMarket && v=== 20 && smaDaily  > indicators['smaMiddle' + (v+40) + 'daily'])
          || ( bearMarket && v=== 220 && smaDaily < indicators['smaMiddle' + (v-40) + 'daily'])
        )) {
        nearSma = v;
        //if (bearMarket) console.log('bear Market should buy bear!' +nearSma)
        return true;
      }
    });
  }
  return nearSma;
}

function nearSmaFn (procent, candle, sma, prevValue, bearMarket, shouldCheck){
  let nearSma = false;
  if (!shouldCheck) return false;


  if (!bearMarket){
    // if the momentum (roc too strong, adjust we buy below sma) ??
    if (candle.close * (1-procent*0.01)<=sma && candle.close >= sma){
      nearSma = true;
    }
  }else{
    if (candle.close * (1+procent*0.01)>=sma && candle.close <= sma){
      nearSma = true;
    }
  }

  let prevCandle = prevValue ? prevValue.candle : undefined;

  if (nearSma && prevCandle && ((!bearMarket && prevCandle.close > sma) || (bearMarket && prevCandle.close < sma))) {
    nearSma = true;
  }else{
    nearSma = false;
  }

  return nearSma;
}

function breakSmaFn (procent, candle, sma, bearMarket, shouldCheck){
  let breakSma = false;
  if (!shouldCheck)  return false;

  //if (bearMarket) console.log('bearMarket breakSMA shouldCheck')

  if ((!bearMarket && candle.close * (1+(procent+0)*0.01) < sma) || (bearMarket && candle.close * (1-(procent+0)*0.01) > sma)){
    breakSma = true;
    //if (bearMarket) console.log('bearMarket breakSMA')
  }
  //log.debug (candle.start.utc().format('YYYY-MM-DD HH:mm') + "breakSma:"+breakSma + " candle.close:"+(candle.close * (1-(procent+0)*0.01)).toFixed(2) + " sma:"+sma.toFixed(2));

  return breakSma;
}

module.exports = method;
