const {
  getLotteryState,
  generateLotteryNumber,
  submitLottery,
} = require('../../utils/mock-service');

const EMPTY_STATE = {
  city: '',
  todayLeft: 0,
  prize: '',
  drawTime: '',
  range: '',
  currentNumber: '',
};

function hasWxApi(apiName) {
  return typeof wx !== 'undefined' && typeof wx[apiName] === 'function';
}

function splitNumber(number) {
  const digits = String(number || '').slice(0, 4).split('');

  return [0, 1, 2, 3].map((index) => {
    const value = digits[index] || '';

    return {
      id: `digit-${index}`,
      value,
      className: value ? 'number-box-filled' : 'number-box-empty',
    };
  });
}

function sanitizeNumberInput(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 4);
}

function isCompleteNumber(number) {
  return /^\d{4}$/.test(String(number || ''));
}

function createInfoTiles(state) {
  return [
    {
      id: 'left',
      icon: '时',
      label: '今日剩余',
      value: `${state.todayLeft}次`,
      className: 'info-value-strong',
    },
    {
      id: 'prize',
      icon: '礼',
      label: '奖品',
      value: state.prize,
      className: '',
    },
    {
      id: 'draw',
      icon: '钟',
      label: '本期开奖',
      value: state.drawTime,
      className: 'info-value-strong',
    },
    {
      id: 'range',
      icon: '券',
      label: '号码区间',
      value: state.range,
      className: '',
    },
  ];
}

function createLotteryViewModel(state) {
  const currentNumber = String(state.currentNumber || '');
  const submitDisabled = !isCompleteNumber(currentNumber) || Number(state.todayLeft || 0) <= 0;

  return {
    lotteryState: state,
    cityText: `${state.city || '同城'} · 本期权益开奖`,
    currentNumber,
    numberBoxes: splitNumber(currentNumber),
    todayLeft: state.todayLeft,
    prize: state.prize,
    drawTime: state.drawTime,
    range: state.range,
    infoTiles: createInfoTiles(state),
    submitDisabled,
    submitDisabledClass: submitDisabled ? 'submit-btn-disabled' : '',
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

Page({
  data: createLotteryViewModel(EMPTY_STATE),

  onLoad() {
    this.loadLotteryState();
  },

  onShow() {
    this.loadLotteryState();
  },

  loadLotteryState() {
    const state = getLotteryState();

    this.setData(createLotteryViewModel(state));
  },

  generateNumber() {
    generateLotteryNumber();
    this.loadLotteryState();
  },

  handleNumberInput(event) {
    const currentNumber = sanitizeNumberInput(event && event.detail ? event.detail.value : '');
    const submitDisabled = !isCompleteNumber(currentNumber) || Number(this.data.todayLeft || 0) <= 0;

    this.setData({
      currentNumber,
      numberBoxes: splitNumber(currentNumber),
      submitDisabled,
      submitDisabledClass: submitDisabled ? 'submit-btn-disabled' : '',
    });
  },

  submitNumber() {
    const { currentNumber, todayLeft } = this.data;

    if (!isCompleteNumber(currentNumber)) {
      showToast('请输入完整四位数');
      return;
    }

    if (Number(todayLeft || 0) <= 0) {
      showToast('今日次数已用完');
      return;
    }

    const result = submitLottery(currentNumber);

    showToast(result.message);
    this.loadLotteryState();
  },

  goRecords() {
    if (!hasWxApi('navigateTo')) {
      return;
    }

    wx.navigateTo({
      url: '/pages/lottery-records/index',
    });
  },

  goRules() {
    if (!hasWxApi('navigateTo')) {
      return;
    }

    wx.navigateTo({
      url: '/pages/rules/index',
    });
  },
});
