// global window.CONFIG

const config = window.CONFIG.ui;
const endpoint = `${config.host}`;

let basePath, restPath, wsPath;

// rest API path
if(config.ssl) {
  basePath = `https://${process.env.VUE_APP_HOST}`;
} else {
    basePath = `http://${process.env.VUE_APP_HOST}:${process.env.VUE_APP_PORT}${config.path}`;
}

restPath = basePath + 'api/';
// ws API path
if(config.ssl) {
  wsPath = `wss://${process.env.VUE_APP_HOST}${config.path}api`;
} else {
    wsPath = `ws://${process.env.VUE_APP_HOST}:${process.env.VUE_APP_PORT}${config.path}api`;
}

export {
  wsPath,
  restPath,
  basePath
};
