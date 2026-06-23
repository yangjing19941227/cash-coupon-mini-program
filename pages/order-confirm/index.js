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

function toAmount(value, fallback = 128) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : fallback;
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return Number.isInteger(amount) ? `￥${amount}` : `￥${amount.toFixed(2)}`;
}

function buildOrderDraft(query = {}) {
  const amount = toAmount(query.amount, 128);
  const discountAmount = toAmount(query.discountAmount, 68);
  const merchantName = decodeQueryText(query.merchantName, '海岛小院');

  return {
    templateId: decodeQueryText(query.templateId || query.id, ''),
    title: decodeQueryText(query.title, '海岛小院双人海鲜套餐券'),
    merchantName,
    store: decodeQueryText(query.store, merchantName),
    amount,
    discountAmount,
    quantity: 1,
    category: decodeQueryText(query.category, '餐饮'),
    image: decodeQueryText(query.image, '/assets/images/deal-seafood.png'),
  };
}

Page({
  data: {
    submitting: false,
    orderDraft: buildOrderDraft(),
    payableAmount: '￥128',
    discountText: '-￥68',
  },

  onLoad(query) {
    const orderDraft = buildOrderDraft(query);
    this.setData({
      orderDraft,
      payableAmount: formatCurrency(orderDraft.amount),
      discountText: `-${formatCurrency(orderDraft.discountAmount)}`,
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
