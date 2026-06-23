const LOTTERY_TAB_URL = '/pages/lottery/index';
const HOME_TAB_URL = '/pages/home/index';

function canUseWxApi(apiName) {
  return typeof wx !== 'undefined' && wx && typeof wx[apiName] === 'function';
}

Page({
  goBack() {
    if (canUseWxApi('navigateBack')) {
      wx.navigateBack({
        delta: 1,
        fail: () => {
          this.goLotteryTab();
        },
      });
      return;
    }

    this.goLotteryTab();
  },

  goLotteryTab() {
    if (canUseWxApi('switchTab')) {
      wx.switchTab({
        url: LOTTERY_TAB_URL,
        fail: () => {
          this.goHomeTab();
        },
      });
      return;
    }

    this.goHomeTab();
  },

  goHomeTab() {
    if (canUseWxApi('switchTab')) {
      wx.switchTab({ url: HOME_TAB_URL });
      return;
    }

    if (canUseWxApi('reLaunch')) {
      wx.reLaunch({ url: HOME_TAB_URL });
    }
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
