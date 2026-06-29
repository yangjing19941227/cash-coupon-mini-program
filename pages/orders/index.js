const tabs = [
  { status: 'pending', label: '待付款' },
  { status: 'verify', label: '待核销' },
  { status: 'completed', label: '已完成' },
  { status: 'refund', label: '退款中' },
];

const orders = [
  {
    id: 'order-seafood-pending',
    status: 'pending',
    statusText: '待付款',
    statusTone: 'pending',
    title: '海岛小院·双人海鲜套餐券超值到店可用',
    image: '/assets/images/deal-seafood.png',
    tags: ['餐饮美食', '龙华区'],
    meta: '请在 14:20 前完成支付',
    subMeta: '订单号 202606250941',
    price: '￥128',
    action: '去付款',
  },
  {
    id: 'order-hotpot-pending',
    status: 'pending',
    statusText: '待付款',
    statusTone: 'pending',
    title: '椰子鸡火锅套餐券',
    image: '/assets/images/coupon-deal-meal-clean.png',
    tags: ['火锅套餐', '美兰区'],
    meta: '库存已锁定 15 分钟',
    subMeta: '订单号 202606251006',
    price: '￥158',
    action: '去付款',
  },
  {
    id: 'order-ktv-verify',
    status: 'verify',
    statusText: '待核销',
    statusTone: 'verify',
    title: '西湖悦享KTV·双人欢唱套餐',
    image: '/assets/images/coupon-deal-fish-clean.png',
    tags: ['娱乐休闲', '预约套餐'],
    meta: '预约时间 今天 19:30',
    subMeta: '到店出示券码核销',
    price: '￥108',
    action: '出示券码',
  },
  {
    id: 'order-dessert-verify',
    status: 'verify',
    statusText: '待核销',
    statusTone: 'verify',
    title: '海口湾下午茶双人券',
    image: '/assets/images/merchant-dessert.png',
    tags: ['甜品饮品', '秀英区'],
    meta: '有效期至 2026-06-30 23:59',
    subMeta: '门店通用，扫码核销',
    price: '￥68',
    action: '出示券码',
  },
  {
    id: 'order-tea-completed',
    status: 'completed',
    statusText: '已完成',
    statusTone: 'completed',
    title: '海口湾下午茶券',
    image: '/assets/images/coupon-deal-tea-clean.png',
    tags: ['甜品饮品', '已到店核销'],
    meta: '完成时间 昨天 18:42',
    subMeta: '积分 +68 已到账',
    price: '￥68',
    action: '查看详情',
  },
  {
    id: 'order-restaurant-completed',
    status: 'completed',
    statusText: '已完成',
    statusTone: 'completed',
    title: '骑楼老街美食券',
    image: '/assets/images/deal-qilou-food.png',
    tags: ['餐饮美食', '已完成'],
    meta: '完成时间 06-24 12:18',
    subMeta: '优惠券抵扣已计入资产流水',
    price: '￥30',
    action: '查看详情',
  },
  {
    id: 'order-playground-refund',
    status: 'refund',
    statusText: '退款中',
    statusTone: 'refund',
    title: '亲子乐园通用票',
    image: '/assets/images/merchant-playground.png',
    tags: ['亲子娱乐', '售后处理中'],
    meta: '商家确认中',
    subMeta: '预计 1-3 天原路退回',
    price: '￥60',
    action: '售后进度',
  },
  {
    id: 'order-hair-refund',
    status: 'refund',
    statusText: '退款中',
    statusTone: 'refund',
    title: '米可造型洗剪吹体验券',
    image: '/assets/images/coupon-deal-hair-clean.png',
    tags: ['丽人美发', '退款处理中'],
    meta: '客服审核中',
    subMeta: '售后单 202606250018',
    price: '￥18.51',
    action: '售后进度',
  },
];

function getVisibleOrders(status) {
  return orders.filter((item) => item.status === status);
}

Page({
  data: {
    tabs,
    activeStatus: 'pending',
    visibleOrders: getVisibleOrders('pending'),
  },

  onLoad(options = {}) {
    const status = tabs.some((item) => item.status === options.status) ? options.status : 'pending';
    this.updateStatus(status);
  },

  updateStatus(status) {
    this.setData({
      activeStatus: status,
      visibleOrders: getVisibleOrders(status),
    });
  },

  setStatus(event) {
    const status = event.currentTarget.dataset.status;
    this.updateStatus(status);
  },

  goBack() {
    wx.navigateBack();
  },

  handleOrderAction(event) {
    const id = event.currentTarget.dataset.id;
    const order = orders.find((item) => item.id === id);

    if (order && order.status === 'verify') {
      wx.navigateTo({
        url: '/pages/coupon-code/index',
      });
    }
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
