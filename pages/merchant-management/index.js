Page({
  data: {
    view: 'scan',
    activeRecordFilter: 'all',
    verifyCode: '8342 7196 0528',
    records: [
      {
        type: 'verified',
        image: '/assets/images/merchant-restaurant.png',
        merchant: '唱吧麦颂KTV（滨江店）',
        service: '3小时欢唱套餐（小包）',
        time: '2024-05-20 20:18',
        store: '滨江店',
        amount: '-￥128',
        status: '已核销',
      },
      {
        type: 'verified',
        image: '/assets/images/merchant-restaurant.png',
        merchant: '外婆家 · 西溪印象城店',
        service: '50元优惠券',
        time: '2024-05-18 12:36',
        store: '西溪印象城店',
        amount: '-￥50',
        status: '已核销',
      },
      {
        type: 'expired',
        image: '/assets/images/merchant-playground.png',
        merchant: '奇乐岛儿童乐园（城西银泰店）',
        service: '儿童乐园2大1小亲子票',
        time: '2024-05-16 18:30',
        store: '城西银泰店',
        amount: '-￥89',
        status: '已失效',
        expired: true,
      },
    ],
  },

  goBack() {
    if (this.data.view !== 'scan') {
      this.setData({ view: 'scan' });
      return;
    }
    wx.navigateBack();
  },

  goScan() {
    this.setData({ view: 'scan' });
  },

  goConfirm() {
    this.setData({ view: 'confirm' });
  },

  goResult() {
    this.setData({ view: 'result' });
  },

  goRecords() {
    this.setData({ view: 'records' });
  },

  switchRecordFilter(event) {
    this.setData({
      activeRecordFilter: event.currentTarget.dataset.filter,
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
