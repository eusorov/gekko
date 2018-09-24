/*jshint esversion: 6 */

var _ = require('lodash');
var moment = require('moment');
var Handle = require('./handle');
var log = require('../../core/log');
var util = require('../../core/util.js');
var config = util.getConfig();
var mysqlUtil = require('./util');
var resilient = require('./resilient');

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

  var queryStr = `INSERT INTO ${mysqlUtil.table('candles',this.watch)} (start, open, high,low, close, vwp, volume, trades) VALUES ? ON DUPLICATE KEY UPDATE start = start`;
  let candleArrays = cache.map((c) => [c.start.unix(), c.open, c.high, c.low, c.close, c.vwp, c.volume, c.trades]);

  log.debug('writing: ' + cache.length + ' '+cache[0].start.format() +' - '+ cache[cache.length-1].start.format());
  try {
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


Store.prototype.writeIndicatorResult = async function(indicatorResult) {
  if (!this.config.gekko_id)
    return;

  const date = moment.utc(indicatorResult.date).unix();
  // console.log(date.format('YYYY-MM-DD HH:mm'))
  var queryStr = `INSERT INTO ${mysqlUtil.table('iresults',this.watch)} (gekko_id, date, result) VALUES ( '${this.config.gekko_id}', ${date}, '${JSON.stringify(indicatorResult.indicators)}')
     ON DUPLICATE KEY UPDATE result = '${JSON.stringify(indicatorResult.indicators)}'
  `;

  try {
    await resilient.callFunctionWithIntervall(60, ()=> this.dbpromise.query(queryStr).catch((err) => {log.debug(err)}), 5000);
  }catch(err){
    log.error("Error while inserting indicator result: "); log.error(err);
  }
}

module.exports = Store;
