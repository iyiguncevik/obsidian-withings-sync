function nowUnix() {
  return Math.floor(Date.now() / 1000);
}

function startOfTodayUnix() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return Math.floor(start.getTime() / 1000);
}

module.exports = {
  nowUnix,
  startOfTodayUnix,
};
