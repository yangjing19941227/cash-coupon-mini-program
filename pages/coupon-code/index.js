const pattern = '1111111001011101000101010001110101110101110101000101010001011111111010101000000000010101110111011101110001010100010111010111010111010000010101011111111010101010001010001010111010111011101000101010001110101110101110101000101010001011111111';

Page({
  data: {
    qrBlocks: pattern.split('').map((item) => (item === '1' ? 'dark' : '')),
  },

  goBack() {
    wx.navigateBack();
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
