Page({
  goBack() {
    wx.navigateBack();
  },

  goCouponCode() {
    wx.navigateTo({
      url: '/pages/coupon-code/index',
    });
  },

  goOrderConfirm() {
    wx.navigateTo({
      url: '/pages/order-confirm/index',
    });
  },
});
