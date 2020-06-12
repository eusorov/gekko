const route = async function (ctx) {

  var config = require('./baseConfig');

  const Reader = require('../../plugins/'+config.adapter+'/reader');
  
  var reader = new Reader(()=> {});
  
  const promise = new Promise ((resolve, reject) => {
    reader.getBacktestById(ctx.params.id, (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });

  rows = await promise;

  if (rows.length == 1 ) {
    ctx.status = 200;
    ctx.body = rows[0];
  } else {
    ctx.status = 404;
    ctx.body = {
      status: 'error',
      message: 'That id does not exist.'
    };
  }
};

module.exports = route;