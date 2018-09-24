// @link http://en.wikipedia.org/wiki/Exponential_moving_average#Exponential_moving_average

var SMA = require('./SMA.js');

var Indicator = function(settings) {
  this.input = 'price';
  this.result = false;
  this.settings = settings;
  this.sma = new SMA(settings.optInTimePeriod);

};

Indicator.prototype.calcstd = function(prices, Average)
{
    var squareDiffs = prices.map(function(value){
        var diff = value - Average;
        var sqr = diff * diff;
        return sqr;
    });

    var sum = squareDiffs.reduce(function(sum, value){
        return sum + value;
    }, 0);

    var avgSquareDiff = sum / squareDiffs.length;

    return Math.sqrt(avgSquareDiff);
};

Indicator.prototype.update = function(price) {
  this.sma.update(price);

  this.middle = this.sma.result;
  var std = this.calcstd(this.sma.prices, this.middle);

  this.result = this.sma.result;

  if(this.settings && this.settings.offset){
    this.result = this.result + (this.settings.offset*0.03 * std);  // 10.000 0.1 bei SMA20! no bearMarket! 140 // 17.900 0.03 SMA120! 
                                                                   //  1100% 0.03 BTC bei SMA120
  }
  this.std = std;
  
  return this.result;
};


module.exports = Indicator;
