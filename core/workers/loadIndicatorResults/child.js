var _ = require('lodash');
var ipc = require('relieve').IPCEE(process);

ipc.on('start', config => {
  var util = require(__dirname + '/../../util');

  // force correct gekko env
  util.setGekkoEnv('child-process');

  // force disable debug
  config.debug = true;
  util.setConfig(config);

  var dirs = util.dirs();

  var IndicatorLoader = require(dirs.tools + 'indicatorResultsLoader');

  const indicatorLoaderInstance = new IndicatorLoader(config);

  indicatorLoaderInstance.load(results => {
    ipc.send('indicatorResults', results);
    process.exit(0);
  })
})