// global window.CONFIG

const config = window.CONFIG.ui;
const endpoint = `${config.host}`;

let basePath, restPath, wsPath;

// rest API path
if(process.env.VUE_APP_SSL === 'true') {
  basePath = `https://${process.env.VUE_APP_HOST}${config.path}`;
} else {
    basePath = `http://${process.env.VUE_APP_HOST}:${process.env.VUE_APP_PORT}${config.path}`;
}

restPath = basePath + 'api/';
// ws API path
if(process.env.VUE_APP_SSL === 'true') {
  wsPath = `wss://${process.env.VUE_APP_HOST}${config.path}api`;
} else {
    wsPath = `ws://${process.env.VUE_APP_HOST}:${process.env.VUE_APP_PORT}${config.path}api`;
}

export {
  wsPath,
  restPath,
  basePath
};
