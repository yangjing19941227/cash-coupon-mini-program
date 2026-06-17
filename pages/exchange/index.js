const {
  getUserProfile,
  getMerchantBenefits,
  createExchangeRecord,
} = require('../../utils/mock-service');

const EMPTY_PROFILE = {
  city: '',
  district: '',
  exchangeAmount: 0,
  couponCount: 0,
  expiringCount: 0,
};

function hasWxApi(apiName) {
  return typeof wx !== 'undefined' && typeof wx[apiName] === 'function';
}

function formatAmount(value) {
  const amount = Number(value || 0);

  if (Number.isInteger(amount)) {
    return String(amount);
  }

  return amount.toFixed(2);
}

function createMerchantViewModel(merchant) {
  return {
    ...merchant,
    tags: [merchant.category, merchant.district].filter(Boolean),
    exchangeAmountText: formatAmount(merchant.exchangeAmount),
  };
}

function createProfileViewModel(profile) {
  return {
    profile,
    locationText: `${profile.city || '同城'} · ${profile.district || '附近'}`,
    exchangeAmountText: formatAmount(profile.exchangeAmount),
    couponCountText: String(profile.couponCount || 0),
    expiringCountText: String(profile.expiringCount || 0),
  };
}

function showToast(title) {
  if (!title || !hasWxApi('showToast')) {
    return;
  }

  wx.showToast({
    title,
    icon: 'none',
  });
}

Page({
  _exchangeSubmitting: false,

  data: {
    ...createProfileViewModel(EMPTY_PROFILE),
    exchangeSubmitting: false,
    merchants: [],
    submittingMerchantId: '',
  },

  onLoad() {
    this.loadExchangePage();
  },

  onShow() {
    this.loadExchangePage();
  },

  loadExchangePage() {
    const profile = getUserProfile();
    const merchants = getMerchantBenefits().map(createMerchantViewModel);

    this.setData({
      ...createProfileViewModel(profile),
      merchants,
    });
  },

  showRechargeTip() {
    showToast('充值额度功能即将开放');
  },

  showMoreMerchants() {
    showToast('更多同城商家持续接入中');
  },

  clearExchangeSubmitting() {
    this._exchangeSubmitting = false;
    this.setData({
      exchangeSubmitting: false,
      submittingMerchantId: '',
    });
  },

  goExchangeRecords(options = {}) {
    if (!hasWxApi('navigateTo')) {
      if (typeof options.complete === 'function') {
        options.complete();
      }
      return;
    }

    wx.navigateTo({
      url: '/pages/exchange-records/index',
      ...options,
    });
  },

  startExchange(event) {
    const { id } = event.currentTarget.dataset;

    if (!id || this._exchangeSubmitting) {
      return;
    }

    this._exchangeSubmitting = true;
    this.setData({
      exchangeSubmitting: true,
      submittingMerchantId: id,
    });

    const result = createExchangeRecord(id);

    showToast(result.message);

    if (!result.ok) {
      this.clearExchangeSubmitting();
      return;
    }

    this.loadExchangePage();
    this.goExchangeRecords({
      complete: () => {
        this.clearExchangeSubmitting();
      },
    });
  },
});
