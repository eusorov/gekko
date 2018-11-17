//#!/bin/sh
//exec /opt/plesk/node/9/bin/node "$@" --config sample-config.js --ui

process.argv[1]='--config';
process.argv[2]='sample-config.js';
process.argv[3]='--ui';

const gekko = require('./gekko.js');
