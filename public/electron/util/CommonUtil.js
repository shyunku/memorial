function fastInterval(callback, interval) {
  callback();
  let id = setInterval(callback, interval);
  return id;
}

module.exports = {
  fastInterval,
};
