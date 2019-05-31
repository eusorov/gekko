/*jshint esversion: 6 */

var BATCH_SIZE = 60; // minutes = 80h
var MISSING_CANDLES_ALLOWED = 3; // minutes, per batch

var _ = require('lodash');
var moment = require('moment');
var nodeUtil  = require('util');

var util = require('../util');
var config = util.getConfig();
var dirs = util.dirs();
var log = require(dirs.core + 'log');

var adapter = config[config.adapter];
var Reader = require(dirs.gekko + adapter.path + '/reader');

var reader = new Reader();

var readerTableExists = nodeUtil.promisify(reader.tableExists);
var readerGetBoundry = nodeUtil.promisify(reader.getBoundry);
var readerCountTotal = nodeUtil.promisify(reader.countTotal);
var readerCount = nodeUtil.promisify(reader.count);

async function scan(done) {
  log.info('Scanning local history for backtestable dateranges.');

  try {
    const exists = await readerTableExists('candles');
    if(!exists){
      return done(null, [], reader);
    }

    const res = await Promise.all([readerGetBoundry(), readerCountTotal()]);

    var first = res[0].first;
    var last = res[0].last;

    var available = res[1];

    if (config.watch.exchange === "stocks"){
      var optimal = available-1;
    }else{
      var optimal = (last - first) / 60;
    }
    

    log.debug(config.watch.asset, 'first', first, 'last', last, 'Available', available);
    log.debug('Optimal', optimal);

    // There is a candle for every minute
    if (available === optimal + 1) {
      log.info('Gekko is able to fully use the local history.');
      const ranges = [{ from: first, to: last }]
      return done(null, ranges, reader);
    }

    // figure out where the gaps are..

    var missing = optimal - available + 1;

    log.info(`The database has ${missing} candles missing, Figuring out which ones...`);

    var iterator = {
      from: last - (BATCH_SIZE * 60),
      to: last
    }

    var batches = [];
    // loop through all candles we have
    // in batches and track whether they
    // are complete
    console.time("while_ranges")

    while(iterator.from > first){
      var from = iterator.from;
      var to = iterator.to;

      const count = await readerCount(from, iterator.to);

      const complete = count + MISSING_CANDLES_ALLOWED > BATCH_SIZE;
        if (complete){
          batches.push({
            to: to,
            from: from
          });
        }
      iterator.from -= BATCH_SIZE * 60;
      iterator.to -= BATCH_SIZE * 60;
    }
    console.timeEnd("while_ranges");

    if (!_.size(batches))
      util.die('Not enough data to work with (please manually set a valid `backtest.daterange`)..', true);

    // batches is now a list like
    // [ {from: unix, to: unix } ]

    let ranges = [batches.shift()];

    _.each(batches, batch => {
      var curRange = _.last(ranges);
      if (batch.to === curRange.from)
        curRange.from = batch.from;
      else
        ranges.push(batch);
    })

    // ranges is now a list like
    // [ {from: unix, to: unix } ]
    //
    // it contains all valid dataranges available for the
    // end user.
    return done(null, ranges, reader);
  }catch (err){
    log.error(err);
    return done(err, null, reader);
  }
};

module.exports = scan;