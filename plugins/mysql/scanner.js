const _ = require('lodash');
var mysql = require('mysql');

const util = require('../../core/util.js');
const config = util.getConfig();

module.exports = done => {

  var scanClient = mysql.createConnection({
    host: config.mysql.host,
    database: config.mysql.database,
    user: config.mysql.user,
    password: config.mysql.password,
  });


  scanClient.connect( (err) => {
    if (err) {
      return util.die("Error connecting to database: ", err);
    }

    var sql = `
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = '${config.mysql.database}'`;

    var query = scanClient.query(sql, function(err, result) {
      if(err) {
        return util.die("DB error while scanning tables: " + err);
      }

      const markets = result.map((table) => {
        let parts = table.table_name.split('_');
        let exchangeName = parts.shift();
        let first = parts.shift();

        if(first === 'candles') {
          return {
            exchange: exchangeName,
            currency: _.first(parts),
            asset: _.last(parts)
          };
        }
      }).filter(n => n); // remove empty items

      scanClient.end();
      done(err, markets);
    });
  });
}
