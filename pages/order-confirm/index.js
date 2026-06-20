const { createCouponOrder } = require('../../utils/payment-service');

function decodeQueryText(value, fallback = '') {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  try {
    return decodeURIComponent(String(value));
  } catch (error) {
    return String(value);
  }
}

function buildOrderDraft(query = {}) {
  const amount = Number(query.amount || 128);
  const merchantName = decodeQueryText(query.merchantName, '海岛小院');

  return {
    templateId: decodeQueryText(query.templateId || query.id, ''),
    title: decodeQueryText(query.title, '海岛小院双人海鲜套餐券'),
    merchantName,
    store: decodeQueryText(query.store, merchantName),
    amount,
    quantity: 1,
    category: decodeQueryText(query.category, '餐饮'),
  };
}

Page({
  data: {
    submitting: false,
    orderDraft: buildOrderDraft(),
    payableAmount: '￥128',
  },

  onLoad(query) {
    const orderDraft = buildOrderDraft(query);
    this.setData({
      orderDraft,
      payableAmount: `￥${orderDraft.amount}`,
    });
  },

  goBack() {
    wx.navigateBack();
  },

  async submitOrder() {
    if (this.data.submitting) {
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '提交订单中...' });

    try {
      const payload = await createCouponOrder(this.data.orderDraft);
      wx.hideLoading();
      wx.navigateTo({
        url: `/pages/payment-select/index?orderId=${payload.order.id}&amount=${payload.order.amount}&title=${encodeURIComponent(payload.order.title)}`,
      });
    } catch (error) {
      wx.hideLoading();
      this.setData({ submitting: false });
      wx.showToast({
        title: error.message || '提交失败',
        icon: 'none',
      });
    }
  },

  goPaymentSelect() {
    this.submitOrder();
  },
});
