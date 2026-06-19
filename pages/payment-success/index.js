Page({
  goBack() {
    wx.navigateBack();
  },

  goOrders() {
    wx.navigateTo({
      url: '/pages/orders/index',
    });
  },

  goCouponCode() {
    wx.navigateTo({
      url: '/pages/coupon-code/index',
    });
  },
});
