const _ = require('lodash');
const moment = require('moment');

const broadcast = require('./cache').get('broadcast');
const Logger = require('./logger');
const pipelineRunner = require('../../core/workers/pipeline/parent');
const reduceState = require('./reduceState.js');
const now = () => moment().format('YYYY-MM-DD HH:mm');

var util = require(__dirname + '/../../core/util');
const config = require('../routes/baseConfig');

const GekkoManager = function() {
  this.gekkos = {};
  this.instances = {};
  this.loggers = {};

  this.archivedGekkos = {};

  // check if we have running gekkos, which we need to run
  util.setGekkoMode("realtime");
  config.watch = {exchange : "kraken", currency : "ETH", asset : "ETH"};
  util.setConfig(config);

  const Writer = require('../../plugins/'+config.adapter+'/writer');
  const Reader = require('../../plugins/'+config.adapter+'/reader');
  this.writer = new Writer(()=> {});
  this.reader = new Reader(()=> {});

  this.reader.getGekkos((err, data) => {
    if (err) return;

    // start active Gekkos
    data.filter((gekko)=> !gekko.state.stopped).forEach((gekko)=> {
      // state was not updated, get recent trades / portfolio / performanceUpdate etc.
      // a) we save all state info in DB (Mongo?)
      // b) we save all state info in DB but in Tables: Trades, Portfolio, PerformanceReport etc
      //    and we retrieve it all here and attach to state Object. singeGekko.vue require a lot of state Infos.
      //    we dont need to save large state - Object
      /*
      this.reader.getTrades((errTrades, trades) => {
        if (errTrades) return;

        gekko.state.latest.tradeCompleted = [];
        trades.forEach((trade) => {
          gekko.state.latest.tradeCompleted.push(trade.trade);
        })
      })
      */
      this.restart(gekko.state);
    });

    // show stopped Gekkos
    data.filter((gekko)=> gekko.state.stopped).forEach((gekko)=> {
      this.archivedGekkos[gekko.gekko_id] = gekko.state;
    });
  });
}

GekkoManager.prototype.restart = function(state) {
  if (!state)
    return;

  state.active = true;
  state.stopped = false;

  if (state.events && state.events.latest.portfolioChange) { //{"asset":87.78682153,"currency":0}
    state.config.portfolioChange = state.events.latest.portfolioChange; // let paperTrade know about portfolioChange
  };



  return this.add({mode: state.mode, config: state.config, gekkostate: state});
}

GekkoManager.prototype.add = function({mode, config, gekkostate}) {
  // set type
  let type;
  if(mode === 'realtime') {
    if(config.market && config.market.type)
      type = config.market.type;
    else
      type = 'watcher';
  } else {
    type = '';
  }

  let logType = type;
  if(logType === 'leech') {
    if(config.trader && config.trader.enabled)
      logType = 'tradebot';
    else
      logType = 'papertrader';
  }

  const date = now().replace(' ', '-').replace(':', '-');
  const n = (Math.random() + '').slice(3);
  let id = `${date}-${logType}-${n}`;

  // if we have already a gekko_id, than reuse it.
  if (config.gekko_id) {
    id = config.gekko_id;
  }else {
    config.gekko_id = id; // pass id to the backend;
  }

  // make sure we catch events happening inside te gekko instance
  config.childToParent.enabled = true;

  const state = {
    mode,
    config,
    id,
    type,
    logType,
    active: true,
    stopped: false,
    errored: false,
    errorMessage: false,
    events: {
      initial: {},
      latest: {}
    },
    start: moment()
  }

  if (gekkostate){
    this.gekkos[id] = gekkostate;
    if (this.archivedGekkos[id])
      delete this.archivedGekkos[id];
  }else{
    this.gekkos[id] = state;
  }


  this.loggers[id] = new Logger(id);

  // start the actual instance
  this.instances[id] = pipelineRunner(mode, config, this.handleRawEvent(id));

  // after passing API credentials to the actual instance we mask them
  if(logType === 'trader') {
    config.trader.key = '[REDACTED]';
    config.trader.secret = '[REDACTED]';
  }

  console.log(`${now()} Gekko ${id} started.`);

  broadcast({
    type: 'gekko_new',
    id,
    state
  });

  if (mode ==="realtime"){
    this.writer.writeGekko(id, state);
  }

  return state;
}

GekkoManager.prototype.handleRawEvent = function(id) {
  const logger = this.loggers[id];

  return (err, event) => {
    if(err) {
      return this.handleFatalError(id, err);
    }

    if(!event) {
      return;
    }

    if(event.log) {
      return logger.write(event.message);
    }

    if(event.type) {
      this.handleGekkoEvent(id, event);
    }
  }
}

GekkoManager.prototype.handleGekkoEvent = function(id, event) {
  this.gekkos[id] = reduceState(this.gekkos[id], event);

  // if too many candles ws is broken, so now filter them out.
  if ( event.type === 'stratUpdate' || event.type==='stratCandle' || event.type==='candle'){
     return;
  }

  broadcast({
    type: 'gekko_event',
    id,
    event
  });

  if (this.gekkos[id].mode === "realtime"){
    this.writer.writeGekko(id, this.gekkos[id]);
  }
}

GekkoManager.prototype.handleFatalError = function(id, err) {
  const state = this.gekkos[id];

  if(!state || state.errored || state.stopped)
    return;

  state.errored = true;
  state.errorMessage = err;
  console.error('RECEIVED ERROR IN GEKKO INSTANCE', id);
  console.error(err);
  broadcast({
    type: 'gekko_error',
    id,
    error: err
  });

  if (state.mode === "realtime"){
    this.writer.writeGekko(id, state);
  }

  this.archive(id);

  if(state.logType === 'watcher') {
    this.handleWatcherError(state, id);
  }
}

// There might be leechers depending on this watcher, if so
// figure out it we can safely start a new watcher without
// the leechers noticing.
GekkoManager.prototype.handleWatcherError = function(state, id) {
  console.log(`${now()} A gekko watcher crashed.`);
  if(!state.events.latest.candle) {
    console.log(`${now()} was unable to start.`);
  }

  let latestCandleTime = moment.unix(0);
  if(state.events.latest && state.events.latest.candle) {
    latestCandleTime = state.events.latest.candle.start;
  }
  const leechers = _.values(this.gekkos)
    .filter(gekko => {
      if(gekko.type !== 'leech') {
        return false;
      }

      if(_.isEqual(gekko.config.watch, state.config.watch)) {
        return true;
      }
    });

  if(leechers.length) {
    console.log(`${now()} ${leechers.length} leecher(s) were depending on this watcher.`);
    if(moment().diff(latestCandleTime, 'm') < 60) {
      console.log(`${now()} Watcher had recent data, starting a new one in a minute.`);
      // after a minute try to start a new one again..
      setTimeout(() => {
        const mode = 'realtime';
        const config = state.config;
        this.add({mode, config});
      }, 1000 * 60);
    } else {
      console.log(`${now()} Watcher did not have recent data, killing its leechers.`);
      leechers.forEach(leecher => this.stop(leecher.id));
    }

  }
}

GekkoManager.prototype.stop = function(id) {
  if(!this.gekkos[id])
    return false;

  console.log(`${now()} stopping Gekko ${id}`);

  this.gekkos[id].stopped = true;
  this.gekkos[id].active = false;

  // todo: graceful shutdown (via gekkoStream's
  // finish function).
  this.instances[id].kill();

  broadcast({
    type: 'gekko_stopped',
    id
  });

  this.writer.writeGekko(id, this.gekkos[id]);

  this.archive(id);

  return true;
}

GekkoManager.prototype.archive = function(id) {
  this.archivedGekkos[id] = this.gekkos[id];
  this.archivedGekkos[id].stopped = true;
  this.archivedGekkos[id].active = false;
  delete this.gekkos[id];

  broadcast({
    type: 'gekko_archived',
    id
  });
}

GekkoManager.prototype.delete = function(id) {
  if(this.gekkos[id]) {
    throw new Error('Cannot delete a running Gekko, stop it first.');
  }

  if(!this.archivedGekkos[id]) {
    throw new Error('Cannot delete unknown Gekko.');
  }

  console.log(`${now()} deleting Gekko ${id}`);

  broadcast({
    type: 'gekko_deleted',
    id
  });


  if (this.archivedGekkos[id].mode === "realtime"){
    this.writer.deleteGekko(id);
  }

  delete this.archivedGekkos[id];

  return true;
}

GekkoManager.prototype.archive = function(id) {
  this.archivedGekkos[id] = this.gekkos[id];
  this.archivedGekkos[id].stopped = true;
  this.archivedGekkos[id].active = false;
  delete this.gekkos[id];

  broadcast({
    type: 'gekko_archived',
    id
  });
}

GekkoManager.prototype.list = function() {
  return { live: this.gekkos, archive: this.archivedGekkos };
}

module.exports = GekkoManager;
