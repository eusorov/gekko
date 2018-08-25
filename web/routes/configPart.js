const _ = require('lodash');
const fs = require('fs');

const parts = {
  paperTrader: 'config/plugins/paperTrader',
  candleWriter: 'config/plugins/candleWriter',
  performanceAnalyzer: 'config/plugins/performanceAnalyzer'
}

const gekkoRoot = __dirname + '/../../';

module.exports = function (ctx) {
  if(!_.has(parts, ctx.params.part))
    return ctx.body = 'error :(';

  const fileName = gekkoRoot + '/' + parts[ctx.params.part] + '.toml';
  ctx.body = {
    part: fs.readFileSync(fileName, 'utf8')
  }
}
