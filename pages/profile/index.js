const {
  getUserProfile,
  getActivityItems,
  getCouponSummary,
} = require('../../utils/mock-service');

const EMPTY_PROFILE = {
  nickname: '',
  city: '',
  district: '',
  avatar: '/assets/images/profile-avatar.png',
  profileIllustration: '/assets/images/profile-illustration.png',
  savedAmount: 0,
  couponCount: 0,
  lotteryLeft: 0,
  expiringCount: 0,
  exchangeAmount: 0,
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

function formatCount(value, fallback) {
  const count = value === undefined || value === null ? fallback : value;

  return String(count || 0);
}

function createStats(profile, summary) {
  return [
    {
      label: '现金券',
      value: formatCount(summary.availableCount, profile.couponCount),
      unit: '张',
      toneClass: '',
    },
    {
      label: '抽奖次数',
      value: String(profile.lotteryLeft || 0),
      unit: '次',
      toneClass: '',
    },
    {
      label: '即将过期',
      value: formatCount(summary.expiringCount, profile.expiringCount),
      unit: '张',
      toneClass: 'stat-value-warm',
    },
    {
      label: '置换额度',
      value: formatAmount(profile.exchangeAmount),
      unit: '元',
      toneClass: '',
    },
  ];
}

function getActivityMeta(type) {
  const meta = {
    lottery: { status: '已入账', className: 'activity-value-plus' },
    coupon: { status: '已抵扣', className: 'activity-value-minus' },
    exchange: { status: '处理中', className: 'activity-value-pending' },
  };

  return meta[type] || { status: '已记录', className: 'activity-value-pending' };
}

function createActivityViewModel(item) {
  const meta = getActivityMeta(item.type);

  return {
    ...item,
    statusText: meta.status,
    valueClass: meta.className,
  };
}

function createProfileViewModel(profile, summary, activityItems) {
  const completeProfile = {
    ...EMPTY_PROFILE,
    ...profile,
  };

  return {
    profile: completeProfile,
    locationText: `${completeProfile.city || '同城'} · ${completeProfile.district || '附近'}`,
    savedAmountText: formatAmount(completeProfile.savedAmount),
    totalValueText: formatAmount(summary.totalValue),
    couponCountText: formatCount(summary.availableCount, completeProfile.couponCount),
    lotteryLeftText: String(completeProfile.lotteryLeft || 0),
    expiringCountText: formatCount(summary.expiringCount, completeProfile.expiringCount),
    exchangeAmountText: formatAmount(completeProfile.exchangeAmount),
    stats: createStats(completeProfile, summary),
    activityItems: activityItems.map(createActivityViewModel),
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
  _skipNextShowRefresh: false,

  data: {
    ...createProfileViewModel(EMPTY_PROFILE, EMPTY_SUMMARY, []),
  },

  onLoad() {
    this.loadProfilePage();
    this._skipNextShowRefresh = true;
  },

  onShow() {
    if (this._skipNextShowRefresh) {
      this._skipNextShowRefresh = false;
      return;
    }

    this.loadProfilePage();
  },

  loadProfilePage() {
    const profile = getUserProfile();
    const summary = getCouponSummary();
    const activityItems = getActivityItems();

    this.setData(createProfileViewModel(profile, summary, activityItems));
  },

  goCoupons() {
    if (!hasWxApi('switchTab')) {
      return;
    }

    wx.switchTab({
      url: '/pages/coupons/index',
    });
  },

  goLotteryRecords() {
    if (!hasWxApi('navigateTo')) {
      return;
    }

    wx.navigateTo({
      url: '/pages/lottery-records/index',
    });
  },

  goExchangeRecords() {
    if (!hasWxApi('navigateTo')) {
      return;
    }

    wx.navigateTo({
      url: '/pages/exchange-records/index',
    });
  },

  showVerifyRecords() {
    showToast('核销记录功能即将开放');
  },

  showAssetFlow() {
    showToast('资产流水功能即将开放');
  },

  showProfileData() {
    showToast('个人资料功能即将开放');
  },

  showSettings() {
    showToast('设置功能即将开放');
  },
});
