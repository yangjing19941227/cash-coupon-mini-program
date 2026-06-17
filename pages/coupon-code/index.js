const couponService = require('../../utils/mock-service');
const { formatMoney, formatDateTime, getStatusLabel } = require('../../utils/format');

const CODE_REFRESH_INTERVAL = 60000;
const DEFAULT_FALLBACK_MESSAGE = '未找到券，已为你显示默认券';
const DEFAULT_CODE = '000000000000';

const getCouponLookup = couponService.getCouponLookup;
const getCouponById = couponService.getCouponById;

const CATEGORY_IMAGES = {
  餐饮: '/assets/images/merchant-restaurant.svg',
  娱乐: '/assets/images/merchant-playground.svg',
  购物: '/assets/images/merchant-dessert.svg',
  生活: '/assets/images/profile.svg',
  文旅: '/assets/images/merchant-playground.svg',
};

function lookupCoupon(id) {
  if (typeof getCouponLookup === 'function') {
    return getCouponLookup(id);
  }

  return {
    coupon: getCouponById(id),
    fallback: !id,
    message: !id ? DEFAULT_FALLBACK_MESSAGE : '',
  };
}

function normalizeCode(code) {
  const digits = String(code || DEFAULT_CODE).replace(/\D/g, '');

  return `${digits}${DEFAULT_CODE}`.slice(0, DEFAULT_CODE.length);
}

function formatCode(code) {
  return normalizeCode(code).replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function createRefreshedCode(code, refreshCount) {
  const normalizedCode = normalizeCode(code);

  if (!refreshCount) {
    return formatCode(normalizedCode);
  }

  const prefix = normalizedCode.slice(0, -4);
  const lastFour = Number(normalizedCode.slice(-4));
  const refreshedLastFour = String((lastFour + refreshCount) % 10000).padStart(4, '0');

  return formatCode(`${prefix}${refreshedLastFour}`);
}

function buildCouponViewModel(coupon) {
  return {
    ...coupon,
    image: coupon.image || CATEGORY_IMAGES[coupon.category] || '/assets/images/merchant-restaurant.svg',
    amountText: formatMoney(coupon.amount),
    expiryText: formatDateTime(coupon.expiresAt),
    thresholdText: Number(coupon.threshold || 0) > 0
      ? `${formatMoney(coupon.threshold)}起可用`
      : '无门槛可用',
    rawCode: normalizeCode(coupon.code),
  };
}

function hasWxApi(name) {
  return typeof wx !== 'undefined' && typeof wx[name] === 'function';
}

function showToast(title) {
  if (!hasWxApi('showToast')) {
    return;
  }

  wx.showToast({
    title,
    icon: 'none',
  });
}

function switchToCoupons() {
  if (!hasWxApi('switchTab')) {
    return;
  }

  wx.switchTab({
    url: '/pages/coupons/index',
  });
}

function navigateBackOrCoupons() {
  if (!hasWxApi('navigateBack')) {
    switchToCoupons();
    return;
  }

  wx.navigateBack({
    delta: 1,
    fail: switchToCoupons,
  });
}

Page({
  _refreshTimer: null,
  _refreshCount: 0,
  _baseCode: DEFAULT_CODE,

  data: {
    coupon: null,
    statusLabel: {
      text: '',
      tone: 'muted',
    },
    fallbackMessage: '',
    refreshedCode: formatCode(DEFAULT_CODE),
  },

  onLoad(options = {}) {
    this.loadCoupon(options.id);
    this.startRefreshTimer();
  },

  onShow() {
    if (this.data.coupon && !this._refreshTimer) {
      this.startRefreshTimer();
    }
  },

  onHide() {
    this.clearRefreshTimer();
  },

  onUnload() {
    this.clearRefreshTimer();
  },

  loadCoupon(id) {
    const lookup = lookupCoupon(id);
    const coupon = buildCouponViewModel(lookup.coupon);
    const statusLabel = getStatusLabel(coupon.status);
    const fallbackMessage = lookup.fallback ? (lookup.message || DEFAULT_FALLBACK_MESSAGE) : '';

    this._baseCode = coupon.rawCode;
    this._refreshCount = 0;

    this.setData({
      coupon,
      statusLabel,
      fallbackMessage,
      refreshedCode: createRefreshedCode(this._baseCode, this._refreshCount),
    });

    if (fallbackMessage) {
      showToast(fallbackMessage);
    }
  },

  startRefreshTimer() {
    this.clearRefreshTimer();
    this._refreshTimer = setInterval(() => {
      this.refreshCode();
    }, CODE_REFRESH_INTERVAL);
  },

  clearRefreshTimer() {
    if (!this._refreshTimer) {
      return;
    }

    clearInterval(this._refreshTimer);
    this._refreshTimer = null;
  },

  refreshCode() {
    this._refreshCount += 1;

    this.setData({
      refreshedCode: createRefreshedCode(this._baseCode, this._refreshCount),
    });
  },

  showRules() {
    showToast('请在有效期内到店出示券码');
  },

  openBrightMode() {
    showToast('已打开亮屏模式预览');
  },

  goBack() {
    navigateBackOrCoupons();
  },

  returnOrder() {
    navigateBackOrCoupons();
  },
});
