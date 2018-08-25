const _ = require('lodash');
const fs = require('fs');

const gekkoRoot = __dirname + '/../../';

module.exports = function (ctx) {
  const strategyDir = fs.readdirSync(gekkoRoot + 'strategies');
  const strats = strategyDir
    .filter(f => _.last(f, 3).join('') === '.js')
    .map(f => {
      return { name: f.slice(0, -3) }
    });

  // for every strat, check if there is a config file and add it
  const stratConfigPath = gekkoRoot + 'config/strategies';
  const strategyParamsDir = fs.readdirSync(stratConfigPath);

  for(let i = 0; i < strats.length; i++) {
    let strat = strats[i];
    if(strategyParamsDir.indexOf(strat.name + '.toml') !== -1)
      strat.params = fs.readFileSync(stratConfigPath + '/' + strat.name + '.toml', 'utf8')
    else
      strat.params = '';
  }

  ctx.body = strats;
}
