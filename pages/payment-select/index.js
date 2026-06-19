Page({
  data: {
    amount: '￥128',
  },

  onLoad(query) {
    if (query && query.type === 'recharge') {
      this.setData({ amount: '￥300' });
    }
  },

  goBack() {
    wx.navigateBack();
  },

  goPaymentSuccess() {
    wx.navigateTo({
      url: '/pages/payment-success/index',
    });
  },
});
