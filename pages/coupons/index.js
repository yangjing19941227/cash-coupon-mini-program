const {
  getCouponTemplates,
  getLocalCouponTemplates,
} = require('../../utils/coupon-template-service');

const CATEGORY_DEFS = [
  { label: '附近美食', icon: '/assets/images/coupon-cat-recommend.png' },
  { label: '快餐', icon: '/assets/images/coupon-cat-food.png' },
  { label: '饮品', icon: '/assets/images/coupon-cat-coffee.png' },
  { label: '上榜好店', icon: '/assets/images/coupon-cat-play.png' },
  { label: '订座', icon: '/assets/images/coupon-cat-beauty.png' },
];

const FILTER_DEFS = ['附近', '排序', '1km内', '神券膨胀'];
const CATEGORY_FILTER_MAP = {
  快餐: '餐饮',
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
    this.loadDeals();
  },

  async loadDeals() {
    const deals = await getCouponTemplates(CATEGORY_FILTER_MAP[this.data.activeCategory] || this.data.activeCategory);

    this.setData({
      deals,
      visibleDeals: filterDeals(this.data.activeCategory, deals),
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
      visibleDeals: filterDeals(label, this.data.deals),
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
});
