const log = require('../core/log');
const moment = require('moment');
const _ = require('lodash');
const utc = moment.utc;
const telegram = require("node-telegram-bot-api");
const config = require('./routes/baseConfig');

const Writer = require('./../plugins/'+config.adapter+'/writer');
const Reader = require('./../plugins/'+config.adapter+'/reader');

const Telegrambot = function() {
  _.bindAll(this);

  this.writer = new Writer(()=> {});
  this.reader = new Reader(()=> {});

  this.candle = {start : utc(), close : 0}; // empty

  this.commands = {
    '/start': 'emitStart',
    '/subscribe': 'emitSubscribe',
    '/unsubscribe': 'emitUnSubscribe',
    '/help': 'emitHelp'
  };

  this.rawCommands = _.keys(this.commands);

  //read all subscribers at the beginning
  this.reader.getTelegramSubscribers((err, rows)=> {
    if (!err){
      this.subscribers = rows.map( row => row.chatid );
    }
  })

  this.bot = new telegram(process.env.TELEGRAM_TOKEN, {
    polling: true,
  });

//  let url = 'https://6c1c0c3c.ngrok.io';
//  this.bot.setWebHook(`${url}/bot${process.env.TELEGRAM_TOKEN}`);

  this.bot.on('polling_error', (error) => {
    log.error(error);
  });

  this.bot.onText(/(.+)/, this.verifyQuestion);
};

Telegrambot.prototype.processAdvice = function(config, advice) {
    this.subscribers.forEach((chatId)=> {
      this.emitAdvice(chatId, config, advice)
    });
};

  // we got error that we cannnot retrieve candles from exchange
Telegrambot.prototype.processNoCandles = function(config, payload) {
    this.subscribers.forEach((chatId)=> {
      this.emitCandleDelayed(chatId, config, payload)
    });
}

Telegrambot.prototype.emitCandleDelayed = function(chatId, config, payload) {
  let message = 'ATTENTION!!! No candles from exchange: '+
        config.watch.exchange + ' asset: ' +
        config.watch.asset + ' currency: '+ config.watch.currency +
        ' since more than: ' + moment.duration(utc().diff(payload.lastFetchedTradeUtc)).asMinutes()+
        ' min.';

  if (chatId){
    this.bot.sendMessage(chatId, message);
  }
};

Telegrambot.prototype.verifyQuestion = function(msg, text) {
  if (text[1].toLowerCase() in this.commands) {
    this[this.commands[text[1].toLowerCase()]](msg);
  } else {
    this.emitHelp(msg);
  }
};

Telegrambot.prototype.emitStart = function(msg) {
  this.bot.sendMessage(msg.chat.id, 'Welcome to gekkobot, soon you will be rich ;-) ');
  this.emitSubscribe(msg);
};

Telegrambot.prototype.emitSubscribe = function(msg) {
  if (!this.subscribers.includes(""+msg.chat.id)) {
    this.subscribers.push(""+msg.chat.id);
    // write to DB!
    this.writer.writeTelegramSubscriber(msg.chat.id);

    this.bot.sendMessage(msg.chat.id, `Success! Got ${this.subscribers.length} subscribers.`);
  } else {
    this.bot.sendMessage(msg.chat.id, "You are already subscribed.");
  }
};

Telegrambot.prototype.emitUnSubscribe = function(msg) {
  if (this.subscribers.includes(""+msg.chat.id)) {
    this.subscribers.splice(this.subscribers.indexOf(""+msg.chat.id), 1);
    // delete from DB!
    this.writer.deleteTelegramSubscriber(msg.chat.id);

    this.bot.sendMessage(msg.chat.id, "Success!");
  } else {
    this.bot.sendMessage(msg.chat.id, "You are not subscribed.");
  }
};

Telegrambot.prototype.emitAdvice = function(chatid, config, advice) {
  let message = [
    'Advice for ',
    config.watch.exchange,
    ' ',
    config.watch.currency,
    '/',
    config.watch.asset,
    ' using ',
    config.tradingAdvisor.method,
    ' at ',
    config.tradingAdvisor.candleSize,
    ' minute candles, is:\n',
  ].join('');

  if (advice) {
    message += advice.recommendation
    if (advice.candle){
      message += ' price: ' + advice.candle.close +
      ' ' + moment(advice.candle.start).format('YYYY-MM-DD HH:mm') + ' UTC Time';
    }

  } else {
    message += 'None'
  }

  if (chatid) {
    this.bot.sendMessage(chatid, message);
  }
};


Telegrambot.prototype.emitHelp = function(msg) {
  let message = _.reduce(
    this.rawCommands,
    function(message, command) {
      return message + ' ' + command + ',';
    },
    'Possible commands are:'
  );
  message = message.substr(0, _.size(message) - 1) + '.';
  this.bot.sendMessage(msg.chat.id, message);
};

Telegrambot.prototype.logError = function(message) {
  log.error('Telegram ERROR:', message);
};

module.exports = Telegrambot;
