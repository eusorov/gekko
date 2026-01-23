// global window.CONFIG

const config = window.CONFIG.ui;

let basePath, restPath, wsPath;

const host = process.env.VUE_APP_HOST || config.host;
const port = process.env.VUE_APP_PORT || config.port;
const ssl = (process.env.VUE_APP_SSL === 'true') || config.ssl;

// rest API path
if(ssl) {
  basePath = `https://${host}${config.path}`;
} else {
  basePath = `http://${host}:${port}${config.path}`;
}

restPath = basePath + 'api/';
// ws API path
if(ssl) {
  wsPath = `wss://${host}${config.path}api`;
} else {
  wsPath = `ws://${host}:${port}${config.path}api`;
}

export {
  wsPath,
  restPath,
  basePath
};
