const DRAW_HOUR = 21;
const DRAW_MINUTE = 38;

function createEmptyDigits() {
  return ['', '', '', ''];
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function getNextDrawTime(now = new Date()) {
  const drawTime = new Date(now);
  drawTime.setHours(DRAW_HOUR, DRAW_MINUTE, 0, 0);

  if (drawTime <= now) {
    drawTime.setDate(drawTime.getDate() + 1);
  }

  return drawTime;
}

function formatCountdown(targetTime) {
  const diff = Math.max(0, targetTime.getTime() - Date.now());
  const totalSeconds = Math.ceil(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `距离开奖还有 ${hours} 小时 ${pad(minutes)} 分钟`;
  }

  return `距离开奖还有 ${pad(minutes)}:${pad(seconds)}`;
}

function generateNumber() {
  return Array.from({ length: 4 }, () => String(Math.floor(Math.random() * 10)));
}

Page({
  _drawTimer: null,
  _drawTime: null,

  data: {
    digits: ['3', '8', '0', '6'],
    isSubmitted: false,
    submitButtonText: '提交号码',
    countdownText: '',
    showResultModal: false,
    resultTitle: '',
    resultButtonText: '',
    winningNumber: '',
    userNumber: '',
    isWinner: false,
  },

  onUnload() {
    this.clearDrawTimer();
  },

  onDigitInput(event) {
    if (this.data.isSubmitted) {
      return;
    }

    const index = Number(event.currentTarget.dataset.index);
    const value = String(event.detail.value || '').replace(/\D/g, '').slice(-1);
    const digits = [...this.data.digits];
    digits[index] = value;

    this.setData({ digits });
  },

  generateRandomDigits() {
    if (this.data.isSubmitted) {
      return;
    }

    this.setData({
      digits: generateNumber(),
    });
  },

  submitNumber() {
    const digits = this.data.digits;

    if (digits.some((digit) => digit === '')) {
      if (typeof wx !== 'undefined' && wx.showToast) {
        wx.showToast({
          title: '请输入完整4位数字',
          icon: 'none',
        });
      }
      return;
    }

    this._drawTime = getNextDrawTime();

    this.setData({
      isSubmitted: true,
      submitButtonText: '已提交，等待开奖',
      userNumber: digits.join(''),
      countdownText: formatCountdown(this._drawTime),
    });

    this.startDrawTimer();
  },

  startDrawTimer() {
    this.clearDrawTimer();

    this._drawTimer = setInterval(() => {
      if (!this._drawTime) {
        return;
      }

      if (Date.now() >= this._drawTime.getTime()) {
        this.clearDrawTimer();
        this.openResultModal();
        return;
      }

      this.setData({
        countdownText: formatCountdown(this._drawTime),
      });
    }, 1000);
  },

  clearDrawTimer() {
    if (this._drawTimer) {
      clearInterval(this._drawTimer);
      this._drawTimer = null;
    }
  },

  openResultModal() {
    const winningDigits = generateNumber();
    const winningNumber = winningDigits.join('');
    const userNumber = this.data.userNumber;
    const isWinner = winningNumber === userNumber;

    this.setData({
      showResultModal: true,
      resultTitle: isWinner ? '🎉 恭喜中奖' : '很遗憾，未中奖',
      resultButtonText: isWinner ? '查看我的奖励' : '继续参与',
      winningNumber,
      isWinner,
    });
  },

  handleResultAction() {
    if (this.data.isWinner) {
      wx.navigateTo({
        url: '/pages/coupon-assets/index',
      });
      return;
    }

    this.clearDrawTimer();
    this._drawTime = null;

    this.setData({
      digits: createEmptyDigits(),
      isSubmitted: false,
      submitButtonText: '提交号码',
      countdownText: '',
      showResultModal: false,
      resultTitle: '',
      resultButtonText: '',
      winningNumber: '',
      userNumber: '',
      isWinner: false,
    });
  },

  goLotteryRecords() {
    wx.navigateTo({
      url: '/pages/lottery-records/index',
    });
  },
});
