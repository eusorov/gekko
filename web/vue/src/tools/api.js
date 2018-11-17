// global window.CONFIG

const config = window.CONFIG.ui;
const endpoint = `${config.host}`;

let basePath, restPath, wsPath;

// rest API path
if(config.ssl) {
  basePath = `https://${endpoint}`;
} else {
  if (process.env.NODE_ENV==="production"){
    basePath = `http://${config.host}${config.path}`;
  }else{
    basePath = `http://${config.host}:${process.env.PORT}${config.path}`;
  }
}
restPath = basePath + 'api/';
// ws API path
if(config.ssl) {
  wsPath = `wss://${config.host}${config.path}api`;
} else {
  if (process.env.NODE_ENV==="production"){
    wsPath = `ws://${config.host}${config.path}api`;
  }else{
    wsPath = `ws://${config.host}:${process.env.PORT}${config.path}api`;
  }
}

export {
  wsPath,
  restPath,
  basePath
};
