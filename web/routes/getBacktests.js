const route = async function (ctx) {

  var config = require('./baseConfig');

  const Reader = require('../../plugins/'+config.adapter+'/reader');
  
  var reader = new Reader(()=> {});
  
  const promise = new Promise ((resolve, reject) => {
    reader.getBacktests((err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });

  ctx.body = await promise;
};

module.exports = route;