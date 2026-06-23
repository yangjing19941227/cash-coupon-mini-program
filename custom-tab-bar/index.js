const TAB_LIST = [
  {
    pagePath: '/pages/home/index',
    text: '首页',
    iconPath: '/assets/icons/home.png',
    selectedIconPath: '/assets/icons/home-active.png',
  },
  {
    pagePath: '/pages/coupons/index',
    text: '优惠券',
    iconPath: '/assets/icons/ticket.png',
    selectedIconPath: '/assets/icons/ticket-active.png',
  },
  {
    pagePath: '/pages/exchange/index',
    text: '置换',
    iconPath: '/assets/icons/exchange.png',
    selectedIconPath: '/assets/icons/exchange-active.png',
  },
  {
    pagePath: '/pages/lottery/index',
    text: '抽奖',
    iconPath: '/assets/icons/gift.png',
    selectedIconPath: '/assets/icons/gift-active.png',
  },
  {
    pagePath: '/pages/profile/index',
    text: '我的',
    iconPath: '/assets/icons/user.png',
    selectedIconPath: '/assets/icons/user-active.png',
  },
];

Component({
  data: {
    selected: 0,
    color: '#6f7d8c',
    selectedColor: '#006b68',
    list: TAB_LIST,
  },

  pageLifetimes: {
    show() {
      this.updateSelected();
    },
  },

  lifetimes: {
    attached() {
      this.updateSelected();
    },
  },

  methods: {
    updateSelected() {
      const pages = getCurrentPages();
      const current = pages[pages.length - 1];
      const route = current ? `/${current.route}` : '';
      const selected = this.data.list.findIndex((item) => item.pagePath === route);

      if (selected >= 0 && selected !== this.data.selected) {
        this.setData({ selected });
      }
    },

    switchTab(event) {
      const { path } = event.currentTarget.dataset;
      const index = Number(event.currentTarget.dataset.index);

      if (path) {
        if (!Number.isNaN(index) && index !== this.data.selected) {
          this.setData({ selected: index });
        }
        wx.switchTab({ url: path });
      }
    },
  },
});
