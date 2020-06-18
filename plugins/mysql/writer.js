/*jshint esversion: 6 */

var _ = require('lodash');
var moment = require('moment');
var Handle = require('./handle');
var log = require('../../core/log');
var util = require('../../core/util.js');
var config = util.getConfig();
var mysqlUtil = require('./util');
var resilient = require('./resilient');
var crypto =  require('crypto');

var Store = function(done) {
  _.bindAll(this);
  this.done = done;

  this.watch = config.watch;
  this.config = config;

  const handle = new Handle(this.config);
  this.db = handle.getConnection();
  this.dbpromise = handle.getConnection().promise();

  this.upsertTables();

  this.cache = [];
  this.indicatorResultCache = [];

  //writing in TICKRATE
  let TICKRATE = 20;
  if (this.config.watch.tickrate)
    TICKRATE = this.config.watch.tickrate;
  else if(this.config.watch.exchange === 'okcoin')
    TICKRATE = 2;

  this.tickrate = TICKRATE;

  console.log("start mysql writer");
};


Store.prototype.upsertTables = function() {
  var createQueries = [
    `CREATE TABLE IF NOT EXISTS
    ${mysqlUtil.table('candles',this.watch)} (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      start INT UNSIGNED UNIQUE,
      open DOUBLE NOT NULL,
      high DOUBLE NOT NULL,
      low DOUBLE NOT NULL,
      close DOUBLE NOT NULL,
      vwp DOUBLE NOT NULL,
      volume DOUBLE NOT NULL,
      trades INT UNSIGNED NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS
    ${mysqlUtil.table('iresults',this.watch)} (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      gekko_id VARCHAR(60) NOT NULL,
      date INT UNSIGNED NOT NULL,
      result TEXT NOT NULL,
      UNIQUE (gekko_id, date)
    );`,
    `CREATE TABLE IF NOT EXISTS gekkos
    (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      gekko_id VARCHAR(60) NOT NULL,
      date INT UNSIGNED NOT NULL,
      state MEDIUMTEXT NOT NULL,
      UNIQUE (gekko_id, date)
    );`,
    `CREATE TABLE IF NOT EXISTS trades
    (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      gekko_id VARCHAR(60) NOT NULL,
      date INT UNSIGNED NOT NULL,
      trade TEXT NOT NULL,
      UNIQUE (gekko_id, date)
    );`,
    `CREATE TABLE IF NOT EXISTS telegramsub
    (
      chatid VARCHAR(60) PRIMARY KEY
    );`,
    `CREATE TABLE IF NOT EXISTS backtest
    (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      method VARCHAR(20) NOT NULL,
      asset  VARCHAR(5) NOT NULL,
      currency VARCHAR(5) NOT NULL,
      datefrom INT UNSIGNED NOT NULL,
      dateto INT UNSIGNED NOT NULL,
      confighash VARCHAR(255) NOT NULL,
      config LONGTEXT NOT NULL,
      backtest LONGTEXT NOT NULL,
      performance LONGTEXT NOT NULL,
      UNIQUE (method, asset, currency, datefrom, dateto, confighash)
    );`
  ];

  var next = _.after(_.size(createQueries), this.done);

  _.each(createQueries, function(q) {
    this.db.query(q,next);
  }, this);
}

Store.prototype.writeCandles = async function(cache) {
  if(_.isEmpty(cache)){
    return;
  }

  try {
    var queryStr = `INSERT INTO ${mysqlUtil.table('candles',this.watch)} (start, open, high,low, close, vwp, volume, trades) VALUES ? ON DUPLICATE KEY UPDATE open = open, high = high,low = low, close = close, vwp = vwp, volume = volume, trades = trades`;
    let candleArrays = cache.map((c) => [c.start.unix(), c.open, c.high, c.low, c.close, c.vwp, c.volume, c.trades]);

    log.debug('writing: ' + cache.length + ' '+cache[0].start.format() +' - '+ cache[cache.length-1].start.format());

    await resilient.callFunctionWithIntervall(60, ()=> this.dbpromise.query(queryStr, [candleArrays]).catch((err) => {log.debug(err)}), 5000);
  }catch(err){
    log.error("Error while inserting candle: "); log.error(err);
  }
};

Store.prototype.processCandle = function(candle, done) {
  if(!this.config.candleWriter.enabled){
    return done();
  }

  if(_.isEmpty(this.cache)){
    setTimeout(()=> { this.writeCandles(this.cache); this.cache = [];  }, this.tickrate*1000);
  }

  this.cache.push(candle);
  if (this.cache.length > 1000){
    this.writeCandles(this.cache);
    this.cache = [];
  }

  done();
};

Store.prototype.finalize = function(done) {
  if(!this.config.candleWriter.enabled){
    return done();
  }

  this.writeCandles(this.cache).then(() => done());
}


Store.prototype.writeIndicatorResults = async function(indicatorResultCache) {
  if(_.isEmpty(indicatorResultCache)){
    return;
  }

//  const date = moment.utc(indicatorResult.date).unix();
//  var queryStr = `INSERT INTO ${mysqlUtil.table('iresults',this.watch)} (gekko_id, date, result) VALUES ( '${this.config.gekko_id}', ${date}, '${JSON.stringify(indicatorResult.indicators)}')
//     ON DUPLICATE KEY UPDATE result = '${JSON.stringify(indicatorResult.indicators)}'
//  `;
  var queryStr = `INSERT INTO ${mysqlUtil.table('iresults',this.watch)} (gekko_id, date, result) VALUES ? ON DUPLICATE KEY UPDATE result = result`;
  let valueArrays = indicatorResultCache.map((indicatorResult) => [this.config.gekko_id, moment.utc(indicatorResult.date).unix(), JSON.stringify(indicatorResult.indicators)]);

  try {
    await resilient.callFunctionWithIntervall(60, ()=> this.dbpromise.query(queryStr, [valueArrays]).catch((err) => {log.debug(err)}), 5000);
  }catch(err){
    log.error("Error while inserting indicator result: "); log.error(err);
  }

}
Store.prototype.writeIndicatorResult = async function(indicatorResult) {
  if (!this.config.gekko_id)
    return;

  if(_.isEmpty(this.indicatorResultCache)){
    setTimeout(()=> { this.writeIndicatorResults(this.indicatorResultCache); this.indicatorResultCache = [];  }, this.tickrate*1000);
  }

  this.indicatorResultCache.push(indicatorResult);
  if (this.indicatorResultCache.length > 4000){
    this.writeIndicatorResults(this.indicatorResultCache);
    this.indicatorResultCache = [];
  }
}

Store.prototype.writeGekko = async function(id, state) {
  if (!id)
    return;

  const date = moment.utc().unix();

  let queryStr = `select gekko_id FROM gekkos WHERE gekko_id = '${id}'`;

  try {
    const [rows] =  await resilient.callFunctionWithIntervall(60, ()=> this.dbpromise.query(queryStr).catch((err) => {log.debug(err)}), 5000);
    if (rows.length >=1) { //update
      queryStr = `UPDATE gekkos SET state = '${JSON.stringify(state)}'
        WHERE gekko_id = '${id}'   `;
    }else{
      queryStr = `INSERT INTO gekkos (gekko_id, date, state) VALUES ( '${id}', ${date}, '${JSON.stringify(state)}')
         ON DUPLICATE KEY UPDATE state = '${JSON.stringify(state)}'
         `;
    }
    await resilient.callFunctionWithIntervall(60, ()=> this.dbpromise.query(queryStr).catch((err) => {log.debug(err)}), 5000);

  }catch(err){
    log.error("Error while inserting gekkos: "); log.error(err);
  }
}

Store.prototype.deleteGekko = async function(id) {
  if (!id)
    return;

  let queryStr1 = `DELETE FROM gekkos WHERE gekko_id = '${id}'  `;
  let queryStr2 = `DELETE FROM trades WHERE gekko_id = '${id}'  `;

  const promiseAll =  [];

  try {
    promiseAll.push(resilient.callFunctionWithIntervall(60, ()=> this.dbpromise.query(queryStr1).catch((err) => {log.debug(err)}), 5000));
    promiseAll.push(resilient.callFunctionWithIntervall(60, ()=> this.dbpromise.query(queryStr2).catch((err) => {log.debug(err)}), 5000));
    await Promise.all(promiseAll);

  }catch(err){
    log.error("Error while deleting gekkos/trades: "); log.error(err);
  }
}


/** not really usefull for now */
Store.prototype.writeTrade = async function(trade) {
  if (!this.config.gekko_id)
    return;

  const date = trade.date.unix();

  let queryStr = `INSERT INTO trades (gekko_id, date, trade) VALUES ( '${this.config.gekko_id}', ${date}, '${JSON.stringify(trade)}')
     ON DUPLICATE KEY UPDATE trade = '${JSON.stringify(trade)}'
     `;
  try {
    await resilient.callFunctionWithIntervall(60, ()=> this.dbpromise.query(queryStr).catch((err) => {log.debug(err)}), 5000);

  }catch(err){
    log.error("Error while inserting trade: "); log.error(err);
  }
}


Store.prototype.writeTelegramSubscriber = async function(chatid) {
  if (!chatid)
    return;

  let queryStr = `INSERT INTO telegramsub (chatid) VALUES ( '${chatid}')
      ON DUPLICATE KEY UPDATE chatid = '${chatid}'
   `;
  try {
    await resilient.callFunctionWithIntervall(60, ()=> this.dbpromise.query(queryStr).catch((err) => {log.debug(err)}), 5000);
  }catch(err){
    log.error("Error while inserting Telegram Subscriber: "); log.error(err);
  }
}

Store.prototype.deleteTelegramSubscriber = async function(chatid) {
  if (!chatid)
    return;

  let queryStr1 = `DELETE FROM telegramsub WHERE chatid = '${chatid}'  `;
  try {
    await resilient.callFunctionWithIntervall(60, ()=> this.dbpromise.query(queryStr1).catch((err) => {log.debug(err)}), 5000);
  }catch(err){
    log.error("Error while deleting telegram subscriber: "); log.error(err);
  }
}

Store.prototype.writeBacktest = async function(backtest, config, performanceReport) {
  if (!backtest)
    return;

  var from = moment.utc(config.backtest.daterange.from,  "YYYY-MM-DD");
  var to = moment.utc(config.backtest.daterange.to,  "YYYY-MM-DD");

  //deep copy
  var configDb = JSON.parse(JSON.stringify(config));
  delete configDb.mysql; 

  //save performanceReport extra

  //create sha256 hash vor comparing. We cannot put TEXT - column in index. So we put hash!
  const hash = crypto.createHash('sha256').update(JSON.stringify(configDb)).digest('base64');
  
  let queryStr = `INSERT INTO backtest (method, asset, currency, datefrom, dateto, confighash, config, backtest, performance) 
        VALUES ( '${config.tradingAdvisor.method}', 
                 '${config.watch.asset}', 
                 '${config.watch.currency}', 
                  ${from.unix()}, 
                  ${to.unix()},
                 '${hash}',
                 '${JSON.stringify(configDb)}',
                 '${JSON.stringify(backtest)}',
                 '${JSON.stringify(performanceReport)}'
                 )
                 ON DUPLICATE KEY UPDATE backtest = '${JSON.stringify(backtest)}'
    
     `;
  try {
    await resilient.callFunctionWithIntervall(60, ()=> this.dbpromise.query(queryStr).catch((err) => {log.debug(err)}), 5000);

  }catch(err){
    log.error("Error while inserting gekkos: "); log.error(err);
  }

  return;
}

Store.prototype.deleteBacktestById = async function(id) {
  if (!id){
    return;
  }

  let queryStr = `DELETE FROM backtest WHERE id = ? `;
  try {
    await resilient.callFunctionWithIntervall(60, ()=> this.dbpromise.query(queryStr, [id]).catch((err) => {log.debug(err)}), 5000);

    return;
  }catch(err){
    log.error("Error while deleting backtest: "); log.error(err);
    return err;
  } 
}

module.exports = Store;
