const {
  getUserProfile,
  getCouponSummary,
  getMerchantBenefits,
  getCoupons,
} = require('../../utils/mock-service');
const { formatDateTime } = require('../../utils/format');

const EMPTY_PROFILE = {
  city: '',
  district: '',
  savedAmount: 0,
  exchangeAmount: 0,
  lotteryLeft: 0,
};

const EMPTY_SUMMARY = {
  availableCount: 0,
  totalValue: 0,
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

function formatDate(value) {
  return formatDateTime(value).slice(0, 10);
}

function createBenefitViewModel(benefit) {
  return {
    ...benefit,
    exchangeAmountText: formatAmount(benefit.exchangeAmount),
    tags: [benefit.category, benefit.district].filter(Boolean),
  };
}

function createCouponViewModel(coupon) {
  if (!coupon) {
    return null;
  }

  return {
    ...coupon,
    amountText: formatAmount(coupon.amount),
    thresholdText: Number(coupon.threshold || 0) > 0
      ? `满${formatAmount(coupon.threshold)}可用`
      : '无门槛',
    expiresText: formatDate(coupon.expiresAt),
  };
}

function createHomeViewModel(profile, summary, benefits, coupons) {
  const latestCoupon = coupons.find((coupon) => coupon.status === 'unused') || coupons[0];

  return {
    profile,
    locationText: `${profile.city || '同城'} · ${profile.district || '附近'}`,
    savedAmountText: formatAmount(profile.savedAmount),
    totalValueText: formatAmount(summary.totalValue),
    exchangeAmountText: formatAmount(profile.exchangeAmount),
    lotteryLeftText: String(profile.lotteryLeft || 0),
    couponCountText: String(summary.availableCount || 0),
    expiringCountText: String(summary.expiringCount || 0),
    benefits: benefits.slice(0, 2).map(createBenefitViewModel),
    latestCoupon: createCouponViewModel(latestCoupon),
  };
}

function switchTo(payload) {
  if (!hasWxApi('switchTab')) {
    return;
  }

  wx.switchTab(payload);
}

function navigateTo(payload) {
  if (!hasWxApi('navigateTo')) {
    return;
  }

  wx.navigateTo(payload);
}

Page({
  _skipNextShowRefresh: false,

  data: {
    ...createHomeViewModel(EMPTY_PROFILE, EMPTY_SUMMARY, [], []),
  },

  onLoad() {
    this.loadHomePage();
    this._skipNextShowRefresh = true;
  },

  onShow() {
    if (this._skipNextShowRefresh) {
      this._skipNextShowRefresh = false;
      return;
    }

    this.loadHomePage();
  },

  loadHomePage() {
    const profile = getUserProfile();
    const summary = getCouponSummary();
    const benefits = getMerchantBenefits();
    const coupons = getCoupons('全部');

    this.setData(createHomeViewModel(profile, summary, benefits, coupons));
  },

  goCoupons() {
    switchTo({
      url: '/pages/coupons/index',
    });
  },

  goExchange() {
    switchTo({
      url: '/pages/exchange/index',
    });
  },

  goLottery() {
    switchTo({
      url: '/pages/lottery/index',
    });
  },

  goProfile() {
    switchTo({
      url: '/pages/profile/index',
    });
  },

  goLatestCoupon() {
    const coupon = this.data.latestCoupon;

    if (!coupon || !coupon.id) {
      return;
    }

    navigateTo({
      url: `/pages/coupon-code/index?id=${coupon.id}`,
    });
  },
});
