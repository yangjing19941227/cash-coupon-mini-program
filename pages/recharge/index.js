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

  onShareAppMessage() {
    return {
      title: '同城名惠 - 本地优惠券、置换、抽奖一站管理',
      path: '/pages/home/index',
      imageUrl: '/assets/images/home-banners/banner-1.jpg',
    };
  },

  onShareTimeline() {
    return {
      title: '同城名惠 - 本地优惠券、置换、抽奖一站管理',
      query: '',
      imageUrl: '/assets/images/home-banners/banner-1.jpg',
    };
  },
});
