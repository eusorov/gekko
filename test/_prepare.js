// overwrite config with test-config
process.env.NODE_ENV = 'test';

var utils = require(__dirname + '/../core/util');
var testConfig = require(__dirname + '/test-config.json');
utils.setConfig(testConfig);