const _ = require('lodash');
const {promisify} = require('util');

const scan = promisify(require('../../core/workers/datasetScan/parent'));

// starts a scan
// requires a post body with configuration of:
//
// - config.watch
const route = async function (ctx) {

  var config = require('./baseConfig');

  _.merge(config, ctx.request.body);

  ctx.body = await scan(config);
};

module.exports = route;
