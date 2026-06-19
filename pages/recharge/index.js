Page({
  goBack() {
    wx.navigateBack();
  },

  goBalanceRecords() {
    wx.navigateTo({
      url: '/pages/balance-records/index',
    });
  },

  goPaymentSelect() {
    wx.navigateTo({
      url: '/pages/payment-select/index?type=recharge',
    });
  },
});
