const Platform = {
  OS: 'android',
  select: (objs) => objs.android || objs.default,
};

module.exports = {
  Platform,
};
