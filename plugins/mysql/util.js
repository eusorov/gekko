var config = require('../../core/util.js').getConfig();

var watch = config.watch;
if(watch) {
  var settings = {
    exchange: watch.exchange,
    pair: [watch.currency, watch.asset]
  }
}

module.exports = {
  settings: settings,
  host: config.mysql.host,
  database: config.mysql.database,
  user: config.mysql.user,
  password: config.mysql.password,

  // returns table name
  table: function (name, watch) {
    return [watch.exchange, name, watch.currency, watch.asset].join('_');
  }
}
