const CATEGORY_DEFS = [
  { label: '附近美食', icon: '/assets/images/coupon-cat-recommend.png' },
  { label: '快餐', icon: '/assets/images/coupon-cat-food.png' },
  { label: '饮品', icon: '/assets/images/coupon-cat-coffee.png' },
  { label: '上榜好店', icon: '/assets/images/coupon-cat-play.png' },
  { label: '订座', icon: '/assets/images/coupon-cat-beauty.png' },
];

const FILTER_DEFS = ['附近', '排序', '1km内', '神券膨胀'];

const DEALS = [
  {
    id: 'hair-new-user',
    category: '附近美食',
    title: '米可造型 · 新客洗剪吹',
    sales: '年售 5.9万+',
    rank: '人气榜第2名',
    rating: '4.9分',
    store: '海口龙华店',
    distance: '3.4km',
    price: '￥18.51',
    discount: '2.2折',
    badge: '商圈低价',
    image: '/assets/images/coupon-deal-hair-clean.png',
  },
  {
    id: 'tea-two-choice',
    category: '饮品',
    title: '益禾堂 · 清香乌龙 2 选 1',
    sales: '半年售 40万+',
    rank: '含翠峰茉莉',
    rating: '4.1分',
    store: '义龙路店',
    distance: '298m',
    price: '￥4.9',
    discount: '7折',
    badge: '会员7折',
    image: '/assets/images/coupon-deal-tea-clean.png',
  },
  {
    id: 'fish-hotpot',
    category: '快餐',
    title: '鱼尚鲜草帽石锅鱼 · 双人餐',
    sales: '半年售 8000+',
    rank: '活鱼现捞',
    rating: '4.3分',
    store: '友谊阳光城店',
    distance: '1.6km',
    price: '￥136',
    discount: '6.2折',
    badge: '含白骨鱼2.2斤',
    image: '/assets/images/coupon-deal-fish-clean.png',
  },
  {
    id: 'north-east-meal',
    category: '上榜好店',
    title: '关东小磨东北菜 · 经典下饭套餐',
    sales: '半年售 7000+',
    rank: '东北菜人气第3名',
    rating: '4.4分',
    store: '海口龙华店',
    distance: '3.2km',
    price: '￥93',
    discount: '7折',
    badge: '神券立减 5',
    image: '/assets/images/coupon-deal-meal-clean.png',
  },
];

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

function filterDeals(category) {
  if (!category || category === '附近美食') {
    return DEALS;
  }

  return DEALS.filter((deal) => deal.category === category);
}

Page({
  data: {
    activeCategory: '附近美食',
    activeFilter: '附近',
    categories: buildCategories('附近美食'),
    filters: buildFilters('附近'),
    visibleDeals: DEALS,
  },

  switchCategory(event) {
    const { label } = event.currentTarget.dataset;

    if (!label) {
      return;
    }

    this.setData({
      activeCategory: label,
      categories: buildCategories(label),
      visibleDeals: filterDeals(label),
    });
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

    wx.navigateTo({
      url: id ? `/pages/order-confirm/index?id=${id}` : '/pages/order-confirm/index',
    });
  },
});
