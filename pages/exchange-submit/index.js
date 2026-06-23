const { createExchangeRecord } = require('../../utils/mock-service');

Page({
  data: {
    merchantId: 'merchant-island-yard',
  },

  onLoad(options = {}) {
    if (options.id) {
      this.setData({
        merchantId: options.id,
      });
    }
  },

  goBack() {
    wx.navigateBack();
  },

  goRecharge() {
    wx.navigateTo({
      url: '/pages/recharge/index',
    });
  },

  submitExchange() {
    const result = createExchangeRecord(this.data.merchantId);

    if (!result.ok) {
      wx.showToast({
        title: result.message,
        icon: 'none',
      });
      return;
    }

    wx.showToast({
      title: result.message,
      icon: 'success',
    });
    wx.navigateTo({
      url: '/pages/exchange-records/index',
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
