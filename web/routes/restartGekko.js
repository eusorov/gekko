const cache = require('../state/cache');
const gekkoManager = cache.get('gekkos');

// stops a Gekko
// requires a post body with an id
module.exports = async function (ctx) {

  let id = ctx.request.body.id;

  if(!id) {
    ctx.body = { status: 'not ok' }
    return;
  }

  const gekkoList = gekkoManager.list();
  let restartedState = gekkoManager.restart(gekkoList.archive[id]);

  if(!restartedState) {
    ctx.body = { status: 'not ok' }
    return; 
  }

  ctx.body = { status: 'ok' };
}