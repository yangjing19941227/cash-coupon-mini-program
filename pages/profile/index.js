Page({
  goCouponAssets() {
    wx.navigateTo({
      url: '/pages/coupon-assets/index',
    });
  },

  goLotteryRecords() {
    wx.navigateTo({
      url: '/pages/lottery-records/index',
    });
  },

  goExchangeRecords() {
    wx.navigateTo({
      url: '/pages/exchange-records/index',
    });
  },

  goCouponCode() {
    wx.navigateTo({
      url: '/pages/coupon-code/index',
    });
  },
});
