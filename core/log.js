/*

  Lightweight logger, print everything that is send to error, warn
  and messages to stdout (the terminal). If config.debug is set in config
  also print out everything send to debug.

*/
var winston = require('winston');
const { format } = winston;
const { combine, timestamp, label, printf } = format;

const SentryTransport = require('./logstransport/sentry_transport');
const LogzTransport = require('./logstransport/logz_transport');

var moment = require('moment');
var fmt = require('util').format;
var _ = require('lodash');
var util = require('./util');
var config = util.getConfig();
var debug = config.debug;
var silent = config.silent;

const winstonLogger = winston.createLogger({
  transports: [

    new winston.transports.File({
      name : 'filelogger',
      filename: 'logs/all-gekko.log',
      level: 'info',
      handleExceptions: false,
      json: false,
      maxsize: 10242880, //10MB
      maxFiles: 5,
      colorize: false,
      format: winston.format.printf(info =>`${info.timestamp} ${info.level}: ${info.message}`)
    }),

    // send only errors to Sentry (good library for errors fixing)

    new SentryTransport({
       token : process.env.SENTRY_DSN,
       level: 'error'
    }),

    /*
    new LogzTransport({
      token: process.env.LOGZ_KEY,
      host: 'listener.logz.io',
      type: 'gekko',
      level: 'error'
    }),
    */
  ]
});

var sendToParent = function() {
  var send = method => (...args) => {
    process.send({log: method, message: args.join(' ')});
  }

  return {
    error: send('error'),
    warn: send('warn'),
    info: send('info'),
    write: send('write')
  }
}

var Log = function() {
  _.bindAll(this);
  this.env = util.gekkoEnv();

  if(this.env === 'standalone')
    this.output = console;
  else if(this.env === 'child-process')
    this.output = sendToParent();
};

Log.prototype = {
  _write: function(method, args, name) {
    if(!name)
      name = method.toUpperCase();

    var message = moment().format('YYYY-MM-DD HH:mm:ss');
    message += ' (' + name + '):\t';
    message += fmt.apply(null, args);

    console.log(message);
    winstonLogger.log(method, message);
    this.output[method](message);
  },
  error: function() {
    this._write('error', arguments);
  },
  warn: function() {
    this._write('warn', arguments);
  },
  info: function() {
    this._write('info', arguments);
  },
  write: function() {
    var args = _.toArray(arguments);
    var message = fmt.apply(null, args);
    this.output.info(message);
  }
}

if(debug)
  Log.prototype.debug = function() {
    this._write('info', arguments, 'DEBUG');
  }
else
  Log.prototype.debug = _.noop;

if(silent) {
  Log.prototype.debug = _.noop;
  Log.prototype.info = _.noop;
  Log.prototype.warn = _.noop;
  Log.prototype.error = _.noop;
  Log.prototype.write = _.noop;
}

module.exports = new Log;
