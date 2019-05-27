var _ = require('lodash');
var util = require('../../core/util.js');
var log = require('../../core/log');
var Handle = require('./handle');
var config = util.getConfig();
var mysqlUtil = require('./util');
var resilient = require('./resilient');

var Reader = function() {
  _.bindAll(this);


  const handle = new Handle(config);
  this.dbpromise = handle.getConnection().promise()

  this.config = config;
  this.watch = config.watch;
}

// returns the furtherst point (up to `from`) in time we have valid data from
Reader.prototype.mostRecentWindow = async function(from, to, next) {
  to = to.unix();
  from = from.unix();

  var maxAmount = to - from + 1;

  var queryStr = `
  SELECT start from ${mysqlUtil.table('candles',this.watch)}
  WHERE start <= ${to} AND start >= ${from}
  ORDER BY start DESC
  `;

  try {
    const [rows, fields] = await resilient.callFunctionWithIntervall(60, ()=> this.dbpromise.query(queryStr).catch((err) => {}), 5000);
    // After all data is returned, close connection and return results
    // no candles are available
    if(rows.length === 0) {
      return next(false);
    }

    if(rows.length === maxAmount) {

      // full history is available!

      return next({
        from: from,
        to: to
      });
    }

    // we have at least one gap, figure out where
    var mostRecent = _.first(rows).start;

    var gapIndex = _.findIndex(rows, function(r, i) {
      return r.start !== mostRecent - i * 60;
    });

    // if there was no gap in the records, but
    // there were not enough records.
    if(gapIndex === -1) {
      var leastRecent = _.last(rows).start;
      return next({
        from: leastRecent,
        to: mostRecent
      });
    }

    // else return mostRecent and the
    // the minute before the gap
    return next({
      from: rows[ gapIndex - 1 ].start,
      to: mostRecent
    });

  }catch(err){
    // bail out if the table does not exist
    if (err.message.indexOf(' does not exist') !== -1)
      return next(false);

    log.error(err);
    return util.die('DB error while reading mostRecentWindow');
  }
}

Reader.prototype.tableExists = async function (name, next) {

  const queryStr =  `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema='${this.config.mysql.database}'
      AND table_name='${mysqlUtil.table(name, this.watch)}';
  `;
  try {
    const [rows, fields] = await resilient.callFunctionWithIntervall(60, ()=> this.dbpromise.query(queryStr).catch((err) => {}), 5000);
    next(null, rows.length === 1);
  }catch(err){
    log.error(err);
    return util.die('DB error at `tableExists`');
  }
}
Reader.prototype.get = async function(from, to, what, next) {
  if(what === 'full'){
    what = '*';
  }

  const queryStr = `
  SELECT ${what} from ${mysqlUtil.table('candles',this.watch)}
  WHERE start <= ${to} AND start >= ${from}
  ORDER BY start ASC
  `;

  try{
    const [rows, fields] = await resilient.callFunctionWithIntervall(60, () => this.dbpromise.query(queryStr).catch((err) => {}), 5000);
    next(null, rows);
  }catch(err){
    // we have permanent error
    log.error(err);
    next(err);
  }
}

Reader.prototype.count = async function(from, to, next) {
  var queryStr = `
  SELECT COUNT(*) as count from ${mysqlUtil.table('candles',this.watch)}
  WHERE start <= ${to} AND start >= ${from}
  `;

  try{
    const [rows, fields] = await resilient.callFunctionWithIntervall(60, () => this.dbpromise.query(queryStr).catch((err) => {}), 5000);
    next(null, _.first(rows).count);
  }catch(err){
    // we have permanent error
    log.error(err);
    next(err);
  }
}

Reader.prototype.countTotal = async function(next) {
  var queryStr = `
  SELECT COUNT(*) as count from ${mysqlUtil.table('candles',this.watch)}
  `;

  try{
    const [rows, fields] = await resilient.callFunctionWithIntervall(60, () => this.dbpromise.query(queryStr).catch((err) => {}), 5000);
    next(null, _.first(rows).count);
  }catch(err){
    // we have permanent error
    log.error(err);
    next(err);
  }
}

Reader.prototype.getBoundry = async function(next) {
  var queryStr = `
  SELECT (
    SELECT start
    FROM ${mysqlUtil.table('candles',this.watch)}
    ORDER BY start LIMIT 1
  ) as first,
  (
    SELECT start
    FROM ${mysqlUtil.table('candles',this.watch)}
    ORDER BY start DESC
    LIMIT 1
  ) as last
  `;

  try{
    const [rows, fields] = await resilient.callFunctionWithIntervall(60, () => this.dbpromise.query(queryStr).catch((err) => {}), 5000);
    next(null, _.first(rows));
  }catch(err){
    // we have permanent error
    log.error(err);
    next(err);
  }
}

Reader.prototype.getIndicatorResults = async function(from, to, next) {
  if (!this.config.gekko_id){
    return next("gekko_id is required", null);
  }
  const queryStr = `
    SELECT * from ${mysqlUtil.table('iresults', this.watch)}
    WHERE date <= ${to} AND date >= ${from} AND gekko_id = '${this.config.gekko_id}'
    ORDER BY date ASC
    `;

  try{
    const [rows, fields] = await resilient.callFunctionWithIntervall(60, () => this.dbpromise.query(queryStr).catch((err) => {}), 5000);
    const rowsResturn = [];
    rows.forEach((row) => {
      row.result = JSON.parse(row.result);
      rowsResturn.push(row);
    })

    next(null, rowsResturn);
  }catch(err){
      // we have permanent error
    log.error(err);
    next(err);
  }
}

Reader.prototype.close = function() {
   //
}

Reader.prototype.getGekkos = async function(next) {

  var queryStr = `select gekko_id, date, state FROM gekkos `;

  try {
    const [rows, fields] =  await resilient.callFunctionWithIntervall(60, ()=> this.dbpromise.query(queryStr).catch((err) => {log.debug(err)}), 5000);
    const rowsResturn = [];
    rows.forEach((row) => {
      row.state = JSON.parse(row.state);
      rowsResturn.push(row);
    })

    return next(null, rowsResturn);
  }catch(err){
    log.error("Error while inserting gekkos: "); log.error(err);
  }

}

Reader.prototype.getTelegramSubscribers = async function(next) {

  var queryStr = `select chatid FROM telegramsub `;

  try {
    const [rows] =  await resilient.callFunctionWithIntervall(60, ()=> this.dbpromise.query(queryStr).catch((err) => {log.debug(err)}), 5000);

    return next(null, rows);
  }catch(err){
    log.error("Error while reading telegram subscribers: "); log.error(err);
  }

}

module.exports = Reader;
