/*jshint esversion: 6 */
// simple POST request that returns the indicator results requested

const _ = require('lodash');
const {promisify} = require('util');
const loadIndicatorResults = promisify(require('../../core/workers/loadIndicatorResults/parent'));
const base = require('./baseConfig');

module.exports = async function (ctx) {

  config = {};
  _.merge(config, base, ctx.request.body);
  ctx.body = await loadIndicatorResults(config);
}