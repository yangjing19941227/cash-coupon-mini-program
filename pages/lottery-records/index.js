Page({
  goBack() {
    wx.navigateBack();
  },

  goLottery() {
    wx.switchTab({
      url: '/pages/lottery/index',
    });
  },
});
