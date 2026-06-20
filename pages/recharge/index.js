Page({
  goBack() {
    wx.navigateBack();
  },

  goBalanceRecords() {
    wx.navigateTo({
      url: '/pages/balance-records/index',
    });
  },

  goPaymentSelect(event) {
    const amount = event && event.currentTarget ? event.currentTarget.dataset.amount : 300;
    wx.navigateTo({
      url: `/pages/payment-select/index?type=recharge&amount=${amount || 300}`,
    });
  },
});
