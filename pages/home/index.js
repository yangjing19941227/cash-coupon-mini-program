const PACKAGES = [
  {
    id: 'seafood-feast',
    title: '海鲜盛宴',
    price: 158,
    oldPrice: 298,
    discount: '6.8折',
    amount: 158,
    discountAmount: 68,
    merchantName: '海岛小院',
    store: '海岛小院龙华店',
    category: '餐饮美食',
    image: '/assets/images/deal-seafood.png',
  },
  {
    id: 'hotpot-combo',
    title: '火锅套餐',
    price: 158,
    oldPrice: 298,
    discount: '6.8折',
    amount: 158,
    discountAmount: 68,
    merchantName: '椰语椰子鸡',
    store: '海口国贸店',
    category: '餐饮美食',
    image: '/assets/images/coupon-deal-fish-clean.png',
  },
  {
    id: 'double-meal-a',
    title: '美味双人套餐',
    price: 158,
    oldPrice: 298,
    discount: '6.8折',
    amount: 158,
    discountAmount: 68,
    merchantName: '骑楼老街小吃',
    store: '骑楼老街店',
    category: '餐饮美食',
    image: '/assets/images/deal-qilou-food.png',
  },
  {
    id: 'three-person-meal-a',
    title: '经典三人餐',
    price: 158,
    oldPrice: 298,
    discount: '6.8折',
    amount: 158,
    discountAmount: 68,
    merchantName: '海边烧烤',
    store: '世纪大桥店',
    category: '餐饮美食',
    image: '/assets/images/coupon-deal-meal-clean.png',
  },
  {
    id: 'double-meal-b',
    title: '美味双人套餐',
    price: 158,
    oldPrice: 298,
    discount: '6.8折',
    amount: 158,
    discountAmount: 68,
    merchantName: '万绿园咖啡',
    store: '万绿园店',
    category: '餐饮美食',
    image: '/assets/images/deal-tea.png',
  },
  {
    id: 'three-person-meal-b',
    title: '经典三人餐',
    price: 158,
    oldPrice: 298,
    discount: '6.8折',
    amount: 158,
    discountAmount: 68,
    merchantName: '海岛小院',
    store: '海岛小院龙华店',
    category: '餐饮美食',
    image: '/assets/images/deal-family-park.png',
  },
  {
    id: 'double-meal-c',
    title: '美味双人套餐',
    price: 158,
    oldPrice: 298,
    discount: '6.8折',
    amount: 158,
    discountAmount: 68,
    merchantName: '青柠轻食',
    store: '万绿园店',
    category: '餐饮美食',
    image: '/assets/images/coupon-deal-tea-clean.png',
  },
  {
    id: 'seafood-feast-b',
    title: '海鲜盛宴',
    price: 158,
    oldPrice: 298,
    discount: '6.8折',
    amount: 158,
    discountAmount: 68,
    merchantName: '海岛小院',
    store: '海岛小院龙华店',
    category: '餐饮美食',
    image: '/assets/images/merchant-restaurant.png',
  },
  {
    id: 'coconut-chicken-family',
    title: '椰子鸡家庭餐',
    price: 168,
    oldPrice: 328,
    discount: '6.2折',
    amount: 168,
    discountAmount: 80,
    merchantName: '椰语椰子鸡',
    store: '海口国贸店',
    category: '餐饮美食',
    image: '/assets/images/coupon-deal-fish-clean.png',
  },
  {
    id: 'bbq-night-combo',
    title: '夜宵烧烤双人餐',
    price: 96,
    oldPrice: 188,
    discount: '5.8折',
    amount: 96,
    discountAmount: 50,
    merchantName: '海边烧烤',
    store: '世纪大桥店',
    category: '餐饮美食',
    image: '/assets/images/coupon-deal-meal-clean.png',
  },
  {
    id: 'tea-dessert-set',
    title: '甜品下午茶套餐',
    price: 68,
    oldPrice: 128,
    discount: '5.3折',
    amount: 68,
    discountAmount: 30,
    merchantName: '海口湾甜品',
    store: '海口湾甜品店',
    category: '饮品甜点',
    image: '/assets/images/merchant-dessert.png',
  },
  {
    id: 'family-park-ticket',
    title: '亲子乐园畅玩票',
    price: 99,
    oldPrice: 168,
    discount: '5.9折',
    amount: 99,
    discountAmount: 60,
    merchantName: '奇乐岛儿童乐园',
    store: '城西银泰店',
    category: '亲子娱乐',
    image: '/assets/images/deal-family-park.png',
  },
  {
    id: 'qilou-snack-lunch',
    title: '骑楼小吃午市餐',
    price: 39,
    oldPrice: 68,
    discount: '5.7折',
    amount: 39,
    discountAmount: 30,
    merchantName: '骑楼老街小吃',
    store: '骑楼老街店',
    category: '餐饮美食',
    image: '/assets/images/deal-qilou-food.png',
  },
  {
    id: 'light-meal-tea',
    title: '轻食果茶双人餐',
    price: 59,
    oldPrice: 108,
    discount: '5.5折',
    amount: 59,
    discountAmount: 35,
    merchantName: '青柠轻食',
    store: '万绿园店',
    category: '餐饮美食',
    image: '/assets/images/coupon-deal-tea-clean.png',
  },
];

const { syncTabBar } = require('../../utils/tabbar-service');

const HOME_BANNERS = [
  { src: '/assets/images/home-banners/banner-1.jpg' },
  { src: '/assets/images/home-banners/banner-2.jpg' },
  { src: '/assets/images/home-banners/banner-3.jpg' },
  { src: '/assets/images/home-banners/banner-4.jpg' },
  { src: '/assets/images/home-banners/banner-5.jpg' },
];

function canUseWxApi(apiName) {
  return typeof wx !== 'undefined' && typeof wx[apiName] === 'function';
}

function encodeQueryValue(value) {
  return encodeURIComponent(String(value ?? ''));
}

function switchTab(url) {
  if (canUseWxApi('switchTab')) {
    wx.switchTab({ url });
  }
}

function navigateTo(url) {
  if (canUseWxApi('navigateTo')) {
    wx.navigateTo({ url });
  }
}

Page({
  data: {
    homeBanners: HOME_BANNERS,
    packages: PACKAGES,
  },

  onShow() {
    syncTabBar(this, 0);
  },

  handleKingTap(event) {
    const { action } = event.currentTarget.dataset;

    if (action === 'lottery') {
      switchTab('/pages/lottery/index');
      return;
    }

    if (action === 'exchange') {
      navigateTo('/pages/exchange-submit/index?id=merchant-island-yard');
      return;
    }

    if (action === 'profile') {
      switchTab('/pages/profile/index');
      return;
    }

    switchTab('/pages/coupons/index');
  },

  goPackageOrder(event) {
    const index = Number(event.currentTarget.dataset.index);
    const item = this.data.packages[index];

    if (!item) {
      return;
    }

    const query = [
      `templateId=${encodeQueryValue(item.id)}`,
      `title=${encodeQueryValue(item.title)}`,
      `merchantName=${encodeQueryValue(item.merchantName)}`,
      `store=${encodeQueryValue(item.store)}`,
      `category=${encodeQueryValue(item.category)}`,
      `amount=${encodeQueryValue(item.amount)}`,
      `discountAmount=${encodeQueryValue(item.discountAmount)}`,
      `image=${encodeQueryValue(item.image)}`,
    ].join('&');

    navigateTo(`/pages/order-confirm/index?${query}`);
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
