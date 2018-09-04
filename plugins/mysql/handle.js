var _ = require('lodash');
var mysql = require('mysql');

var util = require('../../core/util.js');
var config = util.getConfig();
var dirs = util.dirs();

var log = require(util.dirs().core + 'log');
var myUtil = require('./util');

var adapter = config.mysql;

// verify the correct dependencies are installed
var pluginHelper = require(dirs.core + 'pluginUtil');
var pluginMock = {
  slug: 'mysql adapter',
  dependencies: config.mysql.dependencies
};

var cannotLoad = pluginHelper.cannotLoad(pluginMock);
if(cannotLoad){
  util.die(cannotLoad);
}

var plugins = require(util.dirs().gekko + 'plugins');

var version = adapter.version;

var dbHost = myUtil.host;
var dbName = myUtil.database;
var dbUser = myUtil.user;
var dbPass = myUtil.password;

var database = mysql.createConnection({
  host: dbHost,
  user: dbUser,
  password: dbPass,
  database: dbName
});

var mode = util.gekkoMode();

// Check if we could connect to the db
database.connect(function(err) {
  if(err) {
    util.die(err);
  }
  log.debug("Verified MySQL setup: connection possible");
});

module.exports = database;
