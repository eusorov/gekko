var _ = require('lodash');
var mysql = require('mysql2');

var util = require('../../core/util.js');

var log = require('../../core/log');

let pool = undefined;
var Handle = function(config) {
  this.config = config;

  // verify the correct dependencies are installed
if (config.mysql && config.mysql.dependencies){
    var pluginHelper = require('../../core/pluginUtil');
    var pluginMock = {
      slug: 'mysql adapter',
      dependencies: config.mysql.dependencies
    };

    var cannotLoad = pluginHelper.cannotLoad(pluginMock);
    if(cannotLoad){
      util.die(cannotLoad);
    }
  }
}

Handle.prototype.getConnection = function () {

  if (pool){
    return pool;
  }else{
    pool = mysql.createPool({
      connectionLimit : 10,
      host: this.config.mysql.host,
      user: this.config.mysql.user,
      password: this.config.mysql.password,
      database: this.config.mysql.database,
    });
  }

  // Check if we could connect to the db
  pool.promise().getConnection().then((connection) =>{
    log.debug("Verified MySQL setup: connection possible");
    connection.release();
  }).catch(util.die);

  pool.on('error', function(err) {
    log.error(err);
  });

  return pool;
}

module.exports = Handle;
