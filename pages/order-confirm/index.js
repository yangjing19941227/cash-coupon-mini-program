Page({
  goBack() {
    wx.navigateBack();
  },

  goPaymentSelect() {
    wx.navigateTo({
      url: '/pages/payment-select/index',
    });
  },
});
