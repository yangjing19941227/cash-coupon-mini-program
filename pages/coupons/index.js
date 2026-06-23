const {
  getCouponTemplates,
  getLocalCouponTemplates,
} = require('../../utils/coupon-template-service');
const { syncTabBar } = require('../../utils/tabbar-service');

const CATEGORY_DEFS = [
  { label: '附近美食', icon: '/assets/images/coupon-cat-recommend.png' },
  { label: '小吃快餐', icon: '/assets/images/coupon-cat-food.png' },
  { label: '饮品甜点', icon: '/assets/images/coupon-cat-coffee.png' },
  { label: '上榜好店', icon: '/assets/images/coupon-cat-play.png' },
  { label: '订座', icon: '/assets/images/coupon-cat-beauty.png' },
  { label: '午餐', icon: '/assets/images/coupon-cat-food.png' },
  { label: '火锅', icon: '/assets/images/coupon-cat-recommend.png' },
  { label: '自助餐', icon: '/assets/images/coupon-cat-play.png' },
  { label: '烧烤烤肉', icon: '/assets/images/coupon-cat-food.png' },
  { label: '清淡口味', icon: '/assets/images/coupon-cat-coffee.png' },
];

const FILTER_DEFS = ['附近', '距离', '1km内', '神券膨胀'];
const CATEGORY_FILTER_MAP = {
  小吃快餐: '餐饮',
  午餐: '餐饮',
  火锅: '餐饮',
  自助餐: '餐饮',
  烧烤烤肉: '餐饮',
  清淡口味: '餐饮',
  饮品甜点: '饮品',
  上榜好店: '餐饮',
  订座: '生活服务',
};
const INITIAL_DEALS = getLocalCouponTemplates('附近美食');

function buildCategories(activeCategory) {
  return CATEGORY_DEFS.map((item) => ({
    ...item,
    activeClass: item.label === activeCategory ? 'category-active' : '',
  }));
}

function buildFilters(activeFilter) {
  return FILTER_DEFS.map((label) => ({
    label,
    activeClass: label === activeFilter ? 'filter-active' : '',
  }));
}

function filterDeals(category, deals = []) {
  if (!category || category === '附近美食') {
    return deals;
  }

  const targetCategory = CATEGORY_FILTER_MAP[category] || category;
  return deals.filter((deal) => deal.category === targetCategory);
}

function parseDistance(distance) {
  const value = String(distance || '').trim();
  const number = Number((value.match(/[\d.]+/) || [Infinity])[0]);

  if (!Number.isFinite(number)) {
    return Infinity;
  }

  return value.includes('m') && !value.includes('km') ? number / 1000 : number;
}

function getDealText(deal) {
  return [
    deal.title,
    deal.merchantName,
    deal.category,
    deal.badge,
    deal.rank,
    deal.discount,
    ...(Array.isArray(deal.tags) ? deal.tags : []),
  ].filter(Boolean).join(' ');
}

function isStrongCoupon(deal) {
  return Number(deal.amount || 0) >= 50 || getDealText(deal).includes('神券');
}

function sortByDistance(deals) {
  return [...deals].sort((a, b) => parseDistance(a.distance) - parseDistance(b.distance));
}

function applyFilters(category, activeFilter, deals = []) {
  const categoryDeals = filterDeals(category, deals);
  let result = [...categoryDeals];

  if (activeFilter === '1km内') {
    result = result.filter((deal) => parseDistance(deal.distance) <= 1);
  }

  if (activeFilter === '神券膨胀') {
    result = result.filter(isStrongCoupon);
  }

  if (activeFilter === '附近' || activeFilter === '距离' || activeFilter === '1km内') {
    result = sortByDistance(result);
  }

  return result.length ? result : categoryDeals;
}

function encodeQueryValue(value) {
  return encodeURIComponent(String(value ?? ''));
}

Page({
  data: {
    activeCategory: '附近美食',
    activeFilter: '附近',
    categories: buildCategories('附近美食'),
    filters: buildFilters('附近'),
    deals: INITIAL_DEALS,
    visibleDeals: INITIAL_DEALS,
  },

  onLoad() {
    this.loadDeals();
  },

  onShow() {
    syncTabBar(this, 1);
    this.loadDeals();
  },

  async loadDeals() {
    const deals = await getCouponTemplates(CATEGORY_FILTER_MAP[this.data.activeCategory] || this.data.activeCategory);

    this.setData({
      deals,
      visibleDeals: applyFilters(this.data.activeCategory, this.data.activeFilter, deals),
    });
  },

  switchCategory(event) {
    const { label } = event.currentTarget.dataset;

    if (!label) {
      return;
    }

    this.setData({
      activeCategory: label,
      categories: buildCategories(label),
      visibleDeals: applyFilters(label, this.data.activeFilter, this.data.deals),
    });
    this.loadDeals();
  },

  switchFilter(event) {
    const { label } = event.currentTarget.dataset;

    if (!label) {
      return;
    }

    this.setData({
      activeFilter: label,
      filters: buildFilters(label),
      visibleDeals: applyFilters(this.data.activeCategory, label, this.data.deals),
    });
  },

  goOrderConfirm(event) {
    const { id } = event.currentTarget.dataset;
    const deal = this.data.deals.find((item) => item.id === id);

    if (!deal) {
      wx.showToast({
        title: '优惠券不存在',
        icon: 'none',
      });
      return;
    }

    const query = [
      `templateId=${encodeQueryValue(deal.templateId || deal.id)}`,
      `title=${encodeQueryValue(deal.title)}`,
      `merchantName=${encodeQueryValue(deal.merchantName)}`,
      `store=${encodeQueryValue(deal.store)}`,
      `category=${encodeQueryValue(deal.category)}`,
      `amount=${encodeQueryValue(deal.salePrice || deal.amount)}`,
      `discountAmount=${encodeQueryValue(deal.amount)}`,
      `image=${encodeQueryValue(deal.image)}`,
    ].join('&');

    wx.navigateTo({
      url: `/pages/order-confirm/index?${query}`,
    });
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
