const _ = require('lodash');
const fs = require('fs');
const {promisify} = require('util');
const readdirAsync = promisify(fs.readdir);
const readFileAsync = promisify(fs.readFile);

const gekkoRoot = __dirname + '/../../';

module.exports = async function (ctx) {
  const strategyDir = await readdirAsync(gekkoRoot + 'strategies');
  const strats = strategyDir
    .filter(f => _.last(f, 3).join('') === '.js')
    .map(f => {
      return { name: f.slice(0, -3) }
    });

  // for every strat, check if there is a config file and add it
  const stratConfigPath = gekkoRoot + 'config/strategies';
  const strategyParamsDir = await readdirAsync(stratConfigPath);

  for(let i = 0; i < strats.length; i++) {
    let strat = strats[i];
    if(strategyParamsDir.indexOf(strat.name + '.toml') !== -1)
      strat.params = await readFileAsync(stratConfigPath + '/' + strat.name + '.toml', 'utf8')
    else
      strat.params = '';
  }

  ctx.body = strats;
}
