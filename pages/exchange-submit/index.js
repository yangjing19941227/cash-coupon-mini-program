Page({
  goBack() {
    wx.navigateBack();
  },

  goRecharge() {
    wx.navigateTo({
      url: '/pages/recharge/index',
    });
  },
});
