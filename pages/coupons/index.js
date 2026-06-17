const { getCouponSummary, getCoupons } = require('../../utils/mock-service');
const { formatCouponValue, formatDateTime, getStatusLabel } = require('../../utils/format');

const DEFAULT_TAB = '全部';
const TABS = ['全部', '餐饮', '娱乐', '即将过期'];

const EMPTY_SUMMARY = {
  availableCount: 0,
  totalValue: 0,
  usedCount: 0,
  expiringCount: 0,
  lotteryCount: 0,
  selfCount: 0,
};

function buildTabs(activeTab) {
  return TABS.map((label) => ({
    label,
    activeClass: label === activeTab ? 'tab-active' : '',
  }));
}

function formatPlainNumber(value) {
  const number = Number(value);

  if (Number.isInteger(number)) {
    return String(number);
  }

  return number.toFixed(2);
}

function getCouponIcon(category) {
  const icons = {
    餐饮: { text: '食', className: 'coupon-icon-food' },
    娱乐: { text: '乐', className: 'coupon-icon-entertainment' },
    购物: { text: '购', className: 'coupon-icon-shopping' },
    生活: { text: '生', className: 'coupon-icon-life' },
    文旅: { text: '旅', className: 'coupon-icon-travel' },
  };

  return icons[category] || { text: '券', className: 'coupon-icon-default' };
}

function createCouponViewModel(coupon) {
  const status = getStatusLabel(coupon.status);
  const icon = getCouponIcon(coupon.category);
  const isUnused = coupon.status === 'unused';

  return {
    ...coupon,
    iconText: icon.text,
    iconClass: icon.className,
    valueText: formatCouponValue(coupon),
    amountText: formatPlainNumber(coupon.amount),
    thresholdText: Number(coupon.threshold || 0) > 0
      ? `满${formatPlainNumber(coupon.threshold)}可用`
      : '无门槛使用',
    expiryText: formatDateTime(coupon.expiresAt),
    statusText: status.text,
    statusClass: `status-${status.tone}`,
    useDisabled: !isUnused,
    useDisabledClass: isUnused ? '' : 'use-btn-disabled',
  };
}

Page({
  data: {
    activeTab: DEFAULT_TAB,
    tabs: buildTabs(DEFAULT_TAB),
    summary: EMPTY_SUMMARY,
    coupons: [],
  },

  onLoad() {
    this.loadCoupons();
  },

  loadCoupons(tab) {
    const activeTab = tab || this.data.activeTab || DEFAULT_TAB;
    const summary = getCouponSummary();
    const coupons = getCoupons(activeTab).map(createCouponViewModel);

    this.setData({
      activeTab,
      tabs: buildTabs(activeTab),
      summary,
      coupons,
    });
  },

  switchTab(event) {
    const { tab } = event.currentTarget.dataset;

    if (!tab) {
      return;
    }

    this.loadCoupons(tab);
  },

  goUse(event) {
    const { id } = event.currentTarget.dataset;

    if (!id) {
      return;
    }

    wx.navigateTo({
      url: `/pages/coupon-code/index?id=${id}`,
    });
  },

  goExchange() {
    wx.switchTab({
      url: '/pages/exchange/index',
    });
  },
});
