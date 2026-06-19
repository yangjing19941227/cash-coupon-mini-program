Page({
  goBack() {
    wx.navigateBack();
  },

  goCouponCode() {
    wx.navigateTo({
      url: '/pages/coupon-code/index',
    });
  },

  goCouponDetail() {
    wx.navigateTo({
      url: '/pages/coupon-detail/index',
    });
  },
});
