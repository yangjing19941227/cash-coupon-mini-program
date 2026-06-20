const {
  payCouponOrder,
  createRechargePayment,
  requestWechatPayment,
} = require('../../utils/payment-service');

Page({
  data: {
    amount: '￥128',
    amountValue: 128,
    orderId: '',
    title: '优惠券订单',
    paymentType: 'order',
    paying: false,
  },

  onLoad(query) {
    if (query && query.type === 'recharge') {
      const amountValue = Number(query.amount || 300);
      this.setData({
        amount: `￥${amountValue}`,
        amountValue,
        paymentType: 'recharge',
        title: '充值额度',
      });
      return;
    }

    if (query) {
      const amountValue = Number(query.amount || 128);
      this.setData({
        amount: `￥${amountValue}`,
        amountValue,
        orderId: query.orderId || '',
        title: query.title ? decodeURIComponent(query.title) : '优惠券订单',
      });
    }
  },

  goBack() {
    wx.navigateBack();
  },

  async submitPayment() {
    if (this.data.paying) {
      return;
    }

    this.setData({ paying: true });
    wx.showLoading({ title: '支付中...' });

    try {
      if (this.data.paymentType === 'recharge') {
        const payload = await createRechargePayment(this.data.amountValue);
        wx.hideLoading();
        wx.showToast({ title: '充值成功', icon: 'success' });
        wx.navigateTo({
          url: `/pages/payment-success/index?type=recharge&amount=${payload.record.amount}`,
        });
        return;
      }

      const payload = await payCouponOrder(this.data.orderId);
      await requestWechatPayment(payload.payParams);
      wx.hideLoading();
      wx.showToast({ title: '支付成功', icon: 'success' });
      wx.navigateTo({
        url: `/pages/payment-success/index?orderId=${payload.order.id}&couponId=${payload.coupon.id}&amount=${payload.order.amount}&title=${encodeURIComponent(payload.order.title)}`,
      });
    } catch (error) {
      wx.hideLoading();
      this.setData({ paying: false });
      wx.showToast({
        title: error.message || '支付失败',
        icon: 'none',
      });
    }
  },

  goPaymentSuccess() {
    this.submitPayment();
  },
});
