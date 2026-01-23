// pass back all messages as is
// (except for errors and logs)

module.exports = cb => {

  return {
    message: message => {

      if(message.type === 'error') {
        let err = message.error;
        if (typeof err === 'string') err = new Error(err);
        cb(err);
      }

      else
        cb(null, message);

    },
    exit: status => {
      if(status !== 0)
        cb(new Error('Child process has died.'));
      else
        cb(null, { done: true });
    }
  }
}