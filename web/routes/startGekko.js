const _ = require('lodash');

const cache = require('../state/cache');
const Logger = require('../state/logger');
const apiKeyManager= cache.get('apiKeyManager');
const gekkoManager = cache.get('gekkos');

const base = require('./baseConfig');

// starts an import
// requires a post body with a config object
module.exports = function *() {
  const mode = this.request.body.mode;

  let config = {};
  //console.log(this.request.body)
  if(this.request.body.type === 'market watcher' && base.tradingAdvisor){
    base.tradingAdvisor = {enabled : false}
    base.paperTrader = {enabled : false}
    base.performanceAnalyzer = {enabled : false}
    base.nodeipc={enabled : false}
  }else if (this.request.body.type !== 'importer'){
    base.tradingAdvisor.enabled = true;
  }

  //console.log("==================================== base ")
  //console.log(base)
  _.merge(config, base, this.request.body);

  // Attach API keys
  if(config.trader && config.trader.enabled && !config.trader.key) {

    const keys = apiKeyManager._getApiKeyPair(config.watch.exchange);

    if(!keys) {
      this.body = 'No API keys found for this exchange.';
      return;
    }

    _.merge(
      config.trader,
      keys
    );
  }

  const state = gekkoManager.add({config, mode});

  this.body = state;
}
