// global window.CONFIG

const config = window.CONFIG.ui;

let basePath, restPath, wsPath;

// rest API path
basePath = `${window.location.origin}${config.path}`;

restPath = basePath + 'api/';
// ws API path - use host (not origin) to avoid embedding http:// in ws:// URL
const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
wsPath = `${wsProtocol}://${window.location.host}${config.path}api`;

export {
  wsPath,
  restPath,
  basePath
};
