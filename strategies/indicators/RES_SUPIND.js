/*jshint esversion: 6 */
// helpers
var _ = require('lodash');
var log = require('../../core/log.js');
const EMA_ENVELOPE = require('./EMA_ENVELOPE.js');
const TULIPASYNC = require('./TulipAsync');


var Indicator = function(settings) {
  this.input = 'candle';
  this.settings = settings;

  this.nearSmaProcent = this.settings.res_sup.nearSmaProcent;
  this.breakSmaProcent = this.settings.res_sup.breakSmaProcent; //6 best btc = 3% xrp = 3%

  this.buyingAge = 0;

  this.trend = {
    direction: 'undefined',
  };

  this.hasBoughtBull = false;
  this.hasBoughtBear = false;
  this.bearMarket = false;
  this.prevValues = [];

  this.indicators = {};

  // always calculate daily sma
  // 24h =  1440; 1440/240 = 6 oder 1440/60=24 
  // let factor = 1440 / this.tradingAdvisor.candleSize;
  let factor = 1440 / this.settings.candleSize

  //TODO evtl. 140 +-10!
  this.smaDailies = [20,60,100, 140, 180,220,260]; //
  this.smaDailies.forEach(v => {
    this.indicators['smaMiddle'+v+'daily'] = new EMA_ENVELOPE({optInTimePeriod : (20 * factor ), offset: (140-v)*0.03 });
  });

  this.settings.aroonosc.parameters.optInTimePeriod = 14* factor/6; //aroonsc alwyas 14 for as 4h 56 for 1H
  this.tulipIndicators = {};
  this.tulipIndicators.aroonosc = new TULIPASYNC({ indicator: 'aroonosc', length: 900,
       candleinput: 'high,low',
       options: [this.settings.aroonosc.parameters.optInTimePeriod] });

  this.result = 0;
}

// what happens on every new candle?
Indicator.prototype.update = async function(candle) {
  
  this.smaDailies.forEach(v => {
    this.indicators['smaMiddle'+v+'daily'].update(candle.close);
  });
  this.skipCandle = false;
  
  let currentValue = {};
  currentValue.candle = candle;
  
  let indicatorNames = Object.keys(this.indicators);
  indicatorNames.forEach((name) => currentValue[name] = this.indicators[name].result);
  
  this.prevValue = this.prevValues[this.prevValues.length-1];
  currentValue.smaDailies = this.smaDailies;
  
  const aroonosc = await this.tulipIndicators.aroonosc.update(candle);
  currentValue.aroonosc = aroonosc[0];

  this.currentValue = currentValue;
  
  this.prevValues.push(currentValue);

  if (this.prevValues.length > 50) {
    this.prevValues.shift();
  }


  this.buyingAge = this.buyingAge > 0? this.buyingAge+1 : 0;
  //sell when sma broken
  //1. candle close under sma
  this.breakSma = 0;
  if ((!this.bearMarket && this.hasBoughtBull) || (this.bearMarket && this.hasBoughtBear)){
    const smaDailies = this.bearMarket ? this.smaDailies.reverse() : this.smaDailies;
    smaDailies.some((v)=> {

      const smaDaily = currentValue['smaMiddle'+v+'daily'];
      if (breakSmaFn(this.breakSmaProcent, currentValue.candle, smaDaily, this.bearMarket, (this.buyBullSma === v) 
                || (this.buyBearSma === v)
                // sell if eg MA20 breaks with one of three prevCandle > MA20
                || (!this.bearMarket && this.buyBullSma > v &&  this.prevValues.some((prevValue) => prevValue.candle.close > smaDaily ))
                || ( this.bearMarket && this.buyBearSma < v &&  this.prevValues.some((prevValue) => prevValue.candle.close < smaDaily )) //prevValue['smaMiddle'+v+'daily'] is more right, but lowers performance
          )){

        this.breakSma = v;

        if (!this.bearMarket && (currentValue.candle.close < currentValue['smaMiddle'+this.settings.res_sup.breakSmaBearMarket+'daily'])){ //
          this.bearMarket = true; //break MA then bearMarket
        }else if (this.bearMarket && (currentValue.candle.close >  currentValue['smaMiddle'+this.settings.res_sup.breakSmaBullMarket+'daily'])){
          //XBT 140 vs 140 3%breakSma ETH bull 100 vs bear 180 6%breakSMA XRP 140 vs 140
          this.bearMarket = false;
        }
        return true;
      }
    });
  }

}

// we can make hier a stoploss?
Indicator.prototype.updateOneMin = function(candle) {
  if (!this.currentValue){
    return;
  }
  let isTrend = this.currentValue.aroonosc >= 50 || this.currentValue.aroonosc <= -50;
  //isTrend = true;
  //near smaLine within x%
  let nearSma = getNearSma(candle, this.prevValue, this.smaDailies, this.currentValue, this.nearSmaProcent, this.bearMarket, ((!this.bearMarket && !this.hasBoughtBull) || (this.bearMarket && !this.hasBoughtBear)));
  // if (nearSma){
  //   log.debug (candle.start.format('YYYY-MM-DD HH:mm')
  //   + ' currCandle: '+candle.close.toFixed(2)
  //   + ' std: '+(this.indicators.smaMiddle140daily ? (this.indicators.smaMiddle140daily.std * 0.1).toFixed(2) : '')
 
  //  );
  // }
  // if (this.breakSma){
  //   log.debug (candle.start.format('YYYY-MM-DD HH:mm')
  //   + ' break currCandle: '+candle.close.toFixed(2)
  //   + ' std: '+(this.indicators.smaMiddle140daily ? (this.indicators.smaMiddle140daily.std * 0.1).toFixed(2) : '')
 
  //  );
  // }
  let buyadviceProp = {nearSma : nearSma, isTrend: isTrend, bearMarket: this.bearMarket}
  let selladviceProp = {breakSma: this.breakSma, bearMarket: this.bearMarket} //, resistanceSma: resistanceSma
  // buy bull trend
  if (this.hasBoughtBull || !this.bearMarket){
    this.bullTrendStrat(candle, buyadviceProp, selladviceProp);
  }
  // buy bear trend
  if (this.hasBoughtBear || this.bearMarket){
    this.bearTrendStrat(candle, buyadviceProp, selladviceProp);
  }

  // buy range

}

Indicator.prototype.bullTrendStrat = function(candle, buyadviceProp, selladviceProp){

  if (!this.hasBoughtBull
    && !this.hasBoughtBear
    && ( buyadviceProp.nearSma > 0 )
    && buyadviceProp.isTrend
  ){
    this.hasBoughtBull = true;
    this.trend.direction = 'long';
    this.result = 100;
    this.resultprops = buyadviceProp;

    // merken sma
    this.buyBullSma = buyadviceProp.nearSma;
    this.breakSma = 0;
    this.prevValues.length = 0; // get rid of previous values
    this.stop = candle.close*0.90;   // stoploss max 10%
  }else if (this.hasBoughtBull
    && (selladviceProp.breakSma > 0
      // || selladviceProp.resistanceSma > 0
      // || (candle.close < this.stop)
      ) //|| this.buyingAge >= 10

  ){
    this.hasBoughtBull = false;
    this.trend.direction = 'short';
    this.result = 0;
    this.resultprops = selladviceProp;
    this.buyingAge = 0;
    this.breakSma = 0;
    this.buyBullSma = 0;
    this.stop = 0;
    this.skipCandle = true;
  }
}


Indicator.prototype.bearTrendStrat = function(candle, buyadviceProp, selladviceProp){

  if (!this.hasBoughtBear
    && !this.hasBoughtBull
    && ( buyadviceProp.nearSma > 0 )
    && buyadviceProp.isTrend
  ){
    this.hasBoughtBear = true;
    this.trend.direction = 'long bear';
    this.result = -100;
    this.resultprops = buyadviceProp;
    this.buyingAge = 1;
    // merken sma
    this.buyBearSma = buyadviceProp.nearSma;
    this.breakSma = 0;
    this.prevValues.length = 0; // get rid of previous values
    this.stop = candle.close*1.10;   // stoploss max 5%
  }else if (this.hasBoughtBear
    && (selladviceProp.breakSma > 0
      //  || selladviceProp.resistanceSma > 0
      //  || (candle.close > this.stop)
      ) //|| this.buyingAge >= 10

  ){
    this.hasBoughtBear = false;
    this.trend.direction = 'short bear';
    this.result = 0;
    this.resultprops = selladviceProp;
    this.buyingAge = 0;
    this.breakSma = 0;
    this.buyBearSma = 0;
    this.stop = 0;
    this.skipCandle = true;
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

module.exports = Indicator;
