// global window.CONFIG

const config = window.CONFIG.ui;
const endpoint = `${process.env.HOST}`;

let basePath, restPath, wsPath;

// rest API path
if(config.ssl) {
  basePath = `https://${endpoint}`;
} else {
  if (process.env.NODE_ENV==="production"){
    basePath = `http://${process.env.HOST}${config.path}`;
  }else{
    basePath = `http://${process.env.HOST}:${process.env.PORT}${config.path}`;
  }
}
restPath = basePath + 'api/';
// ws API path
if(config.ssl) {
  wsPath = `wss://${process.env.HOST}${config.path}api`;
} else {
  if (process.env.NODE_ENV==="production"){
    wsPath = `ws://${process.env.HOST}${config.path}api`;
  }else{
    wsPath = `ws://${process.env.HOST}:${process.env.PORT}${config.path}api`;
  }
}

export {
  wsPath,
  restPath,
  basePath
};
