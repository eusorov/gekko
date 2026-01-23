module.exports = cb => {

  return {
    message: message => {

      if(message.event === 'marketUpdate')
        cb(null, {
          done: false,
          latest: message.payload
        })

      else if(message.type === 'error') {
        let err = message.error;
        if (typeof err === 'string') err = new Error(err);
        cb(err);
      }

      else if(message.type === 'log')
        console.log(message.log);
    },
    exit: status => {
      if(status !== 0)
        return cb(new Error('Child process has died.'));
      else
        cb(null, { done: true });
    }
  }
}