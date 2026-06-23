const DEFAULT_SHARE = {
  title: '同城名惠 - 本地优惠券、置换、抽奖一站管理',
  path: '/pages/home/index',
  imageUrl: '/assets/images/home-banners/banner-1.jpg',
};

function enableShareMenu() {
  if (typeof wx === 'undefined' || typeof wx.showShareMenu !== 'function') {
    return;
  }

  wx.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage', 'shareTimeline'],
  });
}

function buildShareMessage(overrides = {}) {
  return {
    ...DEFAULT_SHARE,
    ...overrides,
  };
}

function buildShareTimeline(overrides = {}) {
  const payload = {
    title: overrides.title || DEFAULT_SHARE.title,
    query: overrides.query || '',
    imageUrl: overrides.imageUrl || DEFAULT_SHARE.imageUrl,
  };

  return payload;
}

module.exports = {
  DEFAULT_SHARE,
  buildShareMessage,
  buildShareTimeline,
  enableShareMenu,
};
