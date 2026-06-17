const { getLotteryRecords } = require('../../utils/mock-service');
const { formatDateTime, formatMoney } = require('../../utils/format');

const LOTTERY_TAB_URL = '/pages/lottery/index';
const HOME_TAB_URL = '/pages/home/index';

function hasWxApi(apiName) {
  return typeof wx !== 'undefined' && wx && typeof wx[apiName] === 'function';
}

function createRecordViewModel(record) {
  return {
    ...record,
    amountText: formatMoney(record.amount),
    createdText: formatDateTime(record.createdAt),
  };
}

Page({
  data: {
    records: [],
  },

  onLoad() {
    this.loadRecords();
  },

  onShow() {
    this.loadRecords();
  },

  loadRecords() {
    const records = getLotteryRecords().map(createRecordViewModel);

    this.setData({
      records,
    });
  },

  goBack() {
    if (hasWxApi('navigateBack')) {
      wx.navigateBack({
        delta: 1,
        fail: () => {
          this.goLotteryTab();
        },
      });
      return;
    }

    this.goLotteryTab();
  },

  goLotteryTab() {
    if (hasWxApi('switchTab')) {
      wx.switchTab({
        url: LOTTERY_TAB_URL,
        fail: () => {
          this.goHomeTab();
        },
      });
      return;
    }

    this.goHomeTab();
  },

  goHomeTab() {
    if (hasWxApi('switchTab')) {
      wx.switchTab({
        url: HOME_TAB_URL,
      });
      return;
    }

    if (hasWxApi('reLaunch')) {
      wx.reLaunch({
        url: HOME_TAB_URL,
      });
    }
  },
});
