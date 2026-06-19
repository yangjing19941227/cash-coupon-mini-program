Page({
  goBack() {
    wx.navigateBack();
  },

  goCouponCode() {
    wx.navigateTo({
      url: '/pages/coupon-code/index',
    });
  },
});
