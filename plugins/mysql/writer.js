/*jshint esversion: 6 */

var _ = require('lodash');
var handle = require('./handle');
var log = require('../../core/log');
var util = require('../../core/util.js');
var config = util.getConfig();
var mysqlUtil = require('./util');

var Store = function(done) {
  _.bindAll(this);
  this.done = done;

  this.watch = config.watch;

  this.db = handle;
  this.upsertTables();

  this.cache = [];

  //writing in TICKRATE
  let TICKRATE = 20;
  if (config.watch.tickrate)
    TICKRATE = config.watch.tickrate;
  else if(config.watch.exchange === 'okcoin')
    TICKRATE = 2;

  this.tickrate = TICKRATE;
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
    );`
  ];

  var next = _.after(_.size(createQueries), this.done);

  _.each(createQueries, function(q) {
    this.db.query(q,next);
  }, this);
}

Store.prototype.writeCandles = function(cache) {
  if(_.isEmpty(cache)){
    return;
  }

  //log.debug('mysql write cache size:'+cache.length);

  //write as an array of candles for performance reasons
  const query = `INSERT INTO ${mysqlUtil.table('candles', this.watch)}
    (start, open, high,low, close, vwp, volume, trades)
    VALUES ? ON DUPLICATE KEY UPDATE start = start`;

  const candleArrays = cache.map(
    (c)=> [c.start.unix(), c.open, c.high, c.low, c.close, c.vwp, c.volume, c.trades]);

  this.db.query(query, [candleArrays],  err => {
    if (err) console.log("Error while inserting candle: " + err);
  });
};

Store.prototype.processCandle = function(candle, done) {
  if(!config.candleWriter.enabled){
    return done();
  }

  // always cache candles up to 1000,
  // when in realtime write in TICKRATE intervalls
  if(_.isEmpty(this.cache)){
    setTimeout(()=> {
      this.writeCandles(this.cache);
      this.cache = [];
    }, this.tickrate*1000);
  }

  this.cache.push(candle);
  if (this.cache.length > 1000){ //always cache candles
    console.log(this.cache.length);
    this.writeCandles(this.cache); //pass cache to mysql and clear
    this.cache = [];
  }

  done();
};

Store.prototype.finalize = function(done) {
  if(!config.candleWriter.enabled){
    return done();
  }

  this.writeCandles(this.cache);
  this.db = null;
  done();
}

module.exports = Store;
