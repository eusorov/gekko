var prepareForTulip = function (customSettings){
  customSettings.optInTimePeriod =  Number(customSettings.optInTimePeriod);
  return customSettings;
}

var crossLong = function(prev1, prev2, current1, current2, candle){
  //  log.debug(candle.start.format('YYYY-MM-DD HH:mm')+' ' +prev1+' '+prev2 +' '+ current1 +' '+current2 +' '+ (prev1<prev2 && current1>current2));
  return prev1<prev2 && current1>current2;
}

var crossShort = function (prev1, prev2, current1, current2){
  return prev1>prev2 && current1<current2;
}


module.exports = {prepareForTulip, crossLong, crossShort}
