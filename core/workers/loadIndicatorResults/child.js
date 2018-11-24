var start = (config) => {
  var util = require(__dirname + '/../../util');

  // force correct gekko env
  util.setGekkoEnv('child-process');

  // force disable debug
  config.debug = false;
  util.setConfig(config);

  var dirs = util.dirs();

  var IndicatorLoader = require(dirs.tools + 'indicatorResultsLoader');
  const indicatorLoaderInstance = new IndicatorLoader(config);

  indicatorLoaderInstance.load(results => {
    process.send(results);
  })
}

process.send('ready');

process.on('message', (m) => {
  if(m.what === 'start')
    start(m.config);
});

process.on('disconnect', function() {
  process.exit(0);
})
