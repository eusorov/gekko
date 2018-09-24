// example usage:
const _ = require('lodash');

var ForkTask = require('relieve').tasks.ForkTask;
var fork = require('child_process').fork;


module.exports = (config, callback) => {
  var debug = typeof v8debug === 'object';
  if (debug) {
    process.execArgv = [];
  }

  task = new ForkTask(fork(__dirname + '/child'));

  task.send('start', config);

  const done = _.once(callback);

  task.once('indicatorResults', results => {
    return done(false, results);
  });

  task.on('exit', code => {
    if(code !== 0)
      done('ERROR, unable to load candles, please check the console.');
  });
}
