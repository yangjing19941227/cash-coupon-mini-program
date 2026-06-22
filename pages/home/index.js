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

const LOCAL_DEAL_SEEDS = [
  {
    title: '海岛小院 · 双人海鲜套餐券',
    area: '海口 · 龙华区',
    category: '餐饮美食',
    badge: '优惠券可抵 ￥68',
    price: '￥128',
    amount: 128,
    discountAmount: 68,
    merchantName: '海岛小院',
    store: '海岛小院龙华店',
    image: '/assets/images/deal-seafood.png',
  },
  {
    title: '海口湾下午茶双人券',
    area: '海口 · 秀英区',
    category: '甜品饮品',
    badge: '优惠券可抵 ￥20',
    price: '￥49',
    amount: 49,
    discountAmount: 20,
    merchantName: '海口湾甜品',
    store: '海口湾甜品店',
    image: '/assets/images/deal-tea.png',
  },
  {
    title: '亲子乐园周末通用券',
    area: '海口 · 美兰区',
    category: '亲子娱乐',
    badge: '优惠券可抵 ￥60',
    price: '￥99',
    amount: 99,
    discountAmount: 60,
    merchantName: '亲子乐园',
    store: '欢乐童年亲子乐园',
    image: '/assets/images/deal-family-park.png',
  },
  {
    title: '骑楼老街美食套餐券',
    area: '海口 · 龙华区',
    category: '本地小吃',
    badge: '优惠券可抵 ￥30',
    price: '￥58',
    amount: 58,
    discountAmount: 30,
    merchantName: '骑楼老街美食',
    store: '骑楼老街美食店',
    image: '/assets/images/deal-qilou-food.png',
  },
];

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
    locationText: `${profile.city || '海口'} · ${profile.district || '龙华区'}`,
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

function createLocalDeals(startIndex, count) {
  return Array.from({ length: count }, (_, offset) => {
    const absoluteIndex = startIndex + offset;
    const seed = LOCAL_DEAL_SEEDS[absoluteIndex % LOCAL_DEAL_SEEDS.length];

    return {
      ...seed,
      renderId: `${seed.title}-${absoluteIndex}`,
    };
  });
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

function encodeQueryValue(value) {
  return encodeURIComponent(String(value ?? ''));
}

Page({
  _skipNextShowRefresh: false,

  data: {
    ...createHomeViewModel(EMPTY_PROFILE, EMPTY_SUMMARY, [], []),
    localDeals: createLocalDeals(0, 8),
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
    const coupons = getCoupons();

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
      url: `/pages/order-confirm/index?id=${coupon.id}`,
    });
  },

  goLocalDealOrderConfirm(event) {
    const index = Number(event.currentTarget.dataset.index);
    const deal = this.data.localDeals[index];

    if (!deal) {
      return;
    }

    const query = [
      `templateId=${encodeQueryValue(deal.renderId || deal.title)}`,
      `title=${encodeQueryValue(deal.title)}`,
      `merchantName=${encodeQueryValue(deal.merchantName || deal.title)}`,
      `store=${encodeQueryValue(deal.store || deal.merchantName || deal.title)}`,
      `category=${encodeQueryValue(deal.category)}`,
      `amount=${encodeQueryValue(deal.amount)}`,
      `discountAmount=${encodeQueryValue(deal.discountAmount)}`,
      `image=${encodeQueryValue(deal.image)}`,
    ].join('&');

    navigateTo({
      url: `/pages/order-confirm/index?${query}`,
    });
  },
});
