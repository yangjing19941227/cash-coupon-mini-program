Page({
  data: {
    amount: '￥128',
    title: '海岛小院套餐券',
    orderId: '已生成',
    assetText: '优惠券已加入资产',
  },

  onLoad(query) {
    if (!query) {
      return;
    }

    const isRecharge = query.type === 'recharge';
    this.setData({
      amount: query.amount ? `￥${query.amount}` : this.data.amount,
      title: isRecharge ? '充值额度到账' : (query.title ? decodeURIComponent(query.title) : this.data.title),
      orderId: query.orderId || (isRecharge ? '充值记录' : this.data.orderId),
      assetText: isRecharge ? '余额已即时到账' : '优惠券已加入资产',
    });
  },

  goBack() {
    wx.navigateBack();
  },

  goOrders() {
    wx.navigateTo({
      url: '/pages/orders/index',
    });
  },

  goCouponCode() {
    wx.navigateTo({
      url: '/pages/coupon-code/index',
    });
  },
});
