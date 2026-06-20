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
});
