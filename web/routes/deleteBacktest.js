
const route = async function (ctx) {

  var config = require('./baseConfig');

  const Writer = require('../../plugins/'+config.adapter+'/writer');
  
  var writer = new Writer(()=> {});
  
  const err = await writer.deleteBacktestById(ctx.params.id);
  if (err){
    ctx.status = 404;
    ctx.body = { status: 'error' };
  }else{
    ctx.status = 200;
    ctx.body = { status: 'ok' };
  }
};

module.exports = route;