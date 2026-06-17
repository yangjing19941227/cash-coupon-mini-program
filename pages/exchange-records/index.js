const {
  getExchangeStats,
  getExchangeRecords,
} = require('../../utils/mock-service');

const DEFAULT_TAB = '全部';
const TABS = ['全部', '待确认', '已完成', '已失效'];

const EMPTY_STATS = {
  pendingCount: 0,
  completedCount: 0,
  returnedCount: 0,
  expiredCount: 0,
};

const STATUS_META = {
  pending: { text: '待确认', className: 'status-pending' },
  completed: { text: '已完成', className: 'status-completed' },
  returned: { text: '已退回', className: 'status-returned' },
  expired: { text: '已失效', className: 'status-expired' },
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

function formatDateTime(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).replace('T', ' ').slice(0, 16);
  }

  const shanghaiDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const year = shanghaiDate.getUTCFullYear();
  const month = String(shanghaiDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shanghaiDate.getUTCDate()).padStart(2, '0');
  const hour = String(shanghaiDate.getUTCHours()).padStart(2, '0');
  const minute = String(shanghaiDate.getUTCMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function buildTabs(activeTab) {
  return TABS.map((label) => ({
    label,
    activeClass: label === activeTab ? 'tab-active' : '',
  }));
}

function createRecordViewModel(record) {
  const status = STATUS_META[record.status] || { text: '未知状态', className: 'status-returned' };

  return {
    ...record,
    amountText: formatAmount(record.amount),
    statusText: status.text,
    statusClass: status.className,
    appliedText: formatDateTime(record.appliedAt),
    completedText: formatDateTime(record.completedAt),
    expiredText: formatDateTime(record.expiredAt),
  };
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

function switchToExchange() {
  if (!hasWxApi('switchTab')) {
    return;
  }

  wx.switchTab({
    url: '/pages/exchange/index',
  });
}

Page({
  data: {
    activeTab: DEFAULT_TAB,
    tabs: buildTabs(DEFAULT_TAB),
    stats: EMPTY_STATS,
    records: [],
  },

  onLoad() {
    this.loadRecords();
  },

  onShow() {
    this.loadRecords();
  },

  loadRecords(tab) {
    const activeTab = tab || this.data.activeTab || DEFAULT_TAB;
    const stats = getExchangeStats();
    const records = getExchangeRecords(activeTab).map(createRecordViewModel);

    this.setData({
      activeTab,
      tabs: buildTabs(activeTab),
      stats,
      records,
    });
  },

  switchTab(event) {
    const { tab } = event.currentTarget.dataset;

    if (!tab) {
      return;
    }

    this.loadRecords(tab);
  },

  goBack() {
    if (hasWxApi('navigateBack')) {
      wx.navigateBack({
        delta: 1,
        fail: switchToExchange,
      });
      return;
    }

    switchToExchange();
  },

  showFilterTip() {
    showToast('可按状态切换查看置换记录');
  },

  showRecordDetail() {
    showToast('置换详情以商家确认为准');
  },
});
