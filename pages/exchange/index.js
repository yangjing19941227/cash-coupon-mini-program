const { syncTabBar } = require('../../utils/tabbar-service');

Page({
  onShow() {
    syncTabBar(this, 2);
  },

  goExchangeSubmit(event) {
    const { id } = event.currentTarget.dataset;

    wx.navigateTo({
      url: id ? `/pages/exchange-submit/index?id=${id}` : '/pages/exchange-submit/index',
    });
  },

  goRecharge() {
    wx.navigateTo({
      url: '/pages/recharge/index',
    });
  },

  onShareAppMessage() {
    return {
      title: '同城名惠 - 本地优惠券、置换、抽奖一站管理',
      path: '/pages/home/index',
      imageUrl: '/assets/images/home-banners/banner-1.jpg',
    };
  },

  onShareTimeline() {
    return {
      title: '同城名惠 - 本地优惠券、置换、抽奖一站管理',
      query: '',
      imageUrl: '/assets/images/home-banners/banner-1.jpg',
    };
  },
});
