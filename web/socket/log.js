
function log(msg) {
  if (process.env.NODE_ENV === 'production' &&
      process.env.DEBUG == null) {
    return;
  }
  console.log(msg);
}

module.exports = log;
