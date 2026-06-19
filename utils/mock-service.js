const seed = require('../data/mock');
const { padFourDigits } = require('./format');

let state;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function resetMockState() {
  state = clone(seed);
}

function getUserProfile() {
  return clone(state.userProfile);
}

function getCouponSummary() {
  const availableCoupons = state.coupons.filter((coupon) => coupon.status === 'unused');
  const usedCoupons = state.coupons.filter((coupon) => coupon.status === 'used');
  const expiringCoupons = availableCoupons.filter((coupon) => coupon.isExpiring);

  return {
    availableCount: availableCoupons.length,
    totalValue: availableCoupons.reduce((total, coupon) => total + Number(coupon.amount || 0), 0),
    usedCount: usedCoupons.length,
    expiringCount: expiringCoupons.length,
    lotteryCount: availableCoupons.filter((coupon) => coupon.source === 'lottery').length,
    selfCount: availableCoupons.filter((coupon) => coupon.source === 'self').length,
  };
}

function getCoupons(filter = '全部') {
  if (filter === '全部') {
    return clone(state.coupons);
  }

  if (filter === '即将过期') {
    return clone(
      state.coupons.filter((coupon) => coupon.status === 'unused' && coupon.isExpiring),
    );
  }

  return clone(state.coupons.filter((coupon) => coupon.category === filter));
}

function findCouponById(id) {
  return state.coupons.find((coupon) => coupon.id === id);
}

function getCouponById(id) {
  return clone(findCouponById(id) || state.coupons[0]);
}

function getCouponLookup(id) {
  const coupon = findCouponById(id);

  if (coupon) {
    return {
      coupon: clone(coupon),
      fallback: false,
    };
  }

  return {
    coupon: clone(state.coupons[0]),
    fallback: true,
    message: '未找到券，已显示默认券',
  };
}

function getMerchantBenefits() {
  return clone(state.merchantBenefits);
}

function getLotteryState() {
  return clone(state.lotteryState);
}

function getLotteryRecords() {
  return clone(state.lotteryRecords);
}

function submitLottery(number) {
  const normalized = String(number ?? '');

  if (!/^\d{4}$/.test(normalized)) {
    return { ok: false, message: '请输入完整四位数' };
  }

  if (state.lotteryState.todayLeft <= 0) {
    return { ok: false, message: '今日次数已用完' };
  }

  state.lotteryState.todayLeft -= 1;
  state.lotteryState.currentNumber = normalized;
  state.userProfile.lotteryLeft = state.lotteryState.todayLeft;

  const record = {
    id: `lottery-${Date.now()}-${state.lotteryRecords.length + 1}`,
    number: normalized,
    prize: state.lotteryState.prize,
    amount: 30,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };

  state.lotteryRecords.unshift(record);

  return {
    ok: true,
    message: '参与成功，开奖记录可在个人中心查看',
    record: clone(record),
  };
}

function generateLotteryNumber() {
  const number = padFourDigits(Math.floor(Math.random() * 10000));
  state.lotteryState.currentNumber = number;
  return number;
}

function getExchangeRecords(filter = '全部') {
  const statusMap = {
    待确认: 'pending',
    已完成: 'completed',
    已退回: 'returned',
    已失效: 'expired',
  };

  if (filter === '全部') {
    return clone(state.exchangeRecords);
  }

  const status = statusMap[filter] || filter;
  return clone(state.exchangeRecords.filter((record) => record.status === status));
}

function getExchangeStats() {
  return {
    pendingCount: state.exchangeRecords.filter((record) => record.status === 'pending').length,
    completedCount: state.exchangeRecords.filter((record) => record.status === 'completed').length,
    returnedCount: state.exchangeRecords.filter((record) => record.status === 'returned').length,
    expiredCount: state.exchangeRecords.filter((record) => record.status === 'expired').length,
  };
}

function createExchangeRecord(merchantId) {
  const merchant = state.merchantBenefits.find((item) => item.id === merchantId);

  if (!merchant) {
    return { ok: false, message: '未找到可置换商家' };
  }

  if (state.userProfile.exchangeAmount < merchant.exchangeAmount) {
    return { ok: false, message: '可置换额度不足' };
  }

  const record = {
    id: `exchange-${Date.now()}-${state.exchangeRecords.length + 1}`,
    title: `${merchant.name}置换申请`,
    merchantId: merchant.id,
    merchantName: merchant.name,
    store: merchant.store,
    appliedAt: new Date().toISOString(),
    amount: merchant.exchangeAmount,
    status: 'pending',
  };

  state.userProfile.exchangeAmount -= merchant.exchangeAmount;
  state.exchangeRecords.unshift(record);

  return {
    ok: true,
    message: '已提交置换申请，请等待商家确认',
    record: clone(record),
  };
}

function getActivityItems() {
  return clone(state.activityItems);
}

resetMockState();

module.exports = {
  resetMockState,
  getUserProfile,
  getCouponSummary,
  getCoupons,
  getCouponById,
  getCouponLookup,
  getMerchantBenefits,
  getLotteryState,
  getLotteryRecords,
  submitLottery,
  generateLotteryNumber,
  getExchangeRecords,
  getExchangeStats,
  createExchangeRecord,
  getActivityItems,
};
