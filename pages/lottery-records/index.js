const { getLotteryRecords } = require('../../utils/mock-service');
const { formatDateTime, formatMoney } = require('../../utils/format');

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
});
