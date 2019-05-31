const _ = require('lodash');
const fs = require('fs');
const util = require('util');
const readFileAsync = util.promisify(fs.readFile);

const parts = {
  paperTrader: 'config/plugins/paperTrader',
  candleWriter: 'config/plugins/candleWriter',
  performanceAnalyzer: 'config/plugins/performanceAnalyzer'
}

const gekkoRoot = __dirname + '/../../';

module.exports = async function (ctx) {
  if(!_.has(parts, ctx.params.part))
    return ctx.body = 'error :(';

  const fileName = gekkoRoot + '/' + parts[ctx.params.part] + '.toml';

  const data = await readFileAsync(fileName, 'utf8');
  ctx.body = {part : data};
}