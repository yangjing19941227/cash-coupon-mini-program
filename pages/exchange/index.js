Page({
  goExchangeSubmit(event) {
    const { id } = event.currentTarget.dataset;

    wx.navigateTo({
      url: id ? `/pages/exchange-submit/index?id=${id}` : '/pages/exchange-submit/index',
    });
  },

  goRecharge() {
    wx.navigateTo({
      url: '/pages/recharge/index',
    });
  },
});
