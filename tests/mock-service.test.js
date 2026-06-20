const assert = require('node:assert/strict');
const test = require('node:test');

const seed = require('../data/mock');
const service = require('../utils/mock-service');

test('getCouponSummary counts available, used, expiring and total value', () => {
  service.resetMockState();

  const summary = service.getCouponSummary();
  const availableCoupons = seed.coupons.filter((coupon) => coupon.status === 'unused');
  const usedCoupons = seed.coupons.filter((coupon) => coupon.status === 'used');

  assert.equal(summary.availableCount, availableCoupons.length);
  assert.equal(
    summary.totalValue,
    availableCoupons.reduce((total, coupon) => total + Number(coupon.amount || 0), 0),
  );
  assert.equal(summary.usedCount, usedCoupons.length);
  assert.equal(summary.expiringCount, availableCoupons.filter((coupon) => coupon.isExpiring).length);
});

test('getCoupons filters by dining category and expiring bucket', () => {
  service.resetMockState();

  const diningCoupons = service.getCoupons('餐饮');
  const expiringCoupons = service.getCoupons('即将过期');

  assert.ok(diningCoupons.length > 0);
  assert.ok(diningCoupons.every((coupon) => coupon.category === '餐饮'));
  assert.ok(expiringCoupons.length > 0);
  assert.ok(expiringCoupons.every((coupon) => coupon.isExpiring));
});

test('getCouponTemplates returns merchant coupon configuration for discovery page', () => {
  service.resetMockState();

  const templates = service.getCouponTemplates();
  const diningTemplates = service.getCouponTemplates('餐饮');

  assert.ok(templates.length > 0);
  assert.ok(templates.every((template) => template.status === 'online'));
  assert.ok(diningTemplates.length > 0);
  assert.ok(diningTemplates.every((template) => template.category === '餐饮'));
  assert.equal(templates[0].userId, undefined);
});

test('submitLottery consumes one chance and prepends a record', () => {
  service.resetMockState();
  const beforeState = service.getLotteryState();
  const beforeRecords = service.getLotteryRecords();

  const result = service.submitLottery('3806');
  const afterState = service.getLotteryState();
  const afterRecords = service.getLotteryRecords();

  assert.equal(result.ok, true);
  assert.equal(afterState.todayLeft, beforeState.todayLeft - 1);
  assert.equal(afterState.currentNumber, '3806');
  assert.equal(afterRecords.length, beforeRecords.length + 1);
  assert.equal(afterRecords[0].number, '3806');
  assert.match(afterRecords[0].createdAt, /^\d{4}-\d{2}-\d{2}T/);
});

test('submitLottery rejects incomplete number and exhausted chances', () => {
  service.resetMockState();

  const incomplete = service.submitLottery('386');
  const accepted = service.submitLottery('1111');
  const exhausted = service.submitLottery('2222');

  assert.deepEqual(incomplete, { ok: false, message: '请输入完整四位数' });
  assert.equal(accepted.ok, true);
  assert.deepEqual(exhausted, { ok: false, message: '今日次数已用完' });
  assert.equal(service.getLotteryState().todayLeft, 0);
});

test('createExchangeRecord appends a pending record', () => {
  service.resetMockState();
  const beforeRecords = service.getExchangeRecords();
  const beforeProfile = service.getUserProfile();

  const result = service.createExchangeRecord('merchant-island-yard');
  const afterRecords = service.getExchangeRecords();
  const afterProfile = service.getUserProfile();

  assert.equal(result.ok, true);
  assert.equal(result.message, '已提交置换申请，请等待商家确认');
  assert.equal(afterRecords.length, beforeRecords.length + 1);
  assert.equal(afterRecords[0].status, 'pending');
  assert.equal(afterRecords[0].merchantName, '海岛小院');
  assert.equal(afterProfile.exchangeAmount, beforeProfile.exchangeAmount - 300);
});

test('createExchangeRecord rejects missing merchants and insufficient balance', () => {
  service.resetMockState();

  assert.deepEqual(service.createExchangeRecord('merchant-missing'), {
    ok: false,
    message: '未找到可置换商家',
  });
  const expensiveMerchant = service.getMerchantBenefits().reduce((max, merchant) => (
    merchant.exchangeAmount > max.exchangeAmount ? merchant : max
  ));
  service.createExchangeRecord(expensiveMerchant.id);
  assert.equal(service.getUserProfile().exchangeAmount < expensiveMerchant.exchangeAmount, true);
  assert.deepEqual(service.createExchangeRecord(expensiveMerchant.id), {
    ok: false,
    message: '可置换额度不足',
  });
});

test('createExchangeRecord fails when repeated exchanges exceed remaining balance', () => {
  service.resetMockState();

  assert.equal(service.createExchangeRecord('merchant-family-park').ok, true);
  assert.equal(service.getUserProfile().exchangeAmount, 360);
  assert.equal(service.createExchangeRecord('merchant-island-yard').ok, true);
  assert.equal(service.getUserProfile().exchangeAmount, 60);

  assert.deepEqual(service.createExchangeRecord('merchant-island-yard'), {
    ok: false,
    message: '可置换额度不足',
  });
  assert.equal(service.getUserProfile().exchangeAmount, 60);
});

test('getters return cloned data and resetMockState restores seed state', () => {
  service.resetMockState();
  const profile = service.getUserProfile();
  const merchants = service.getMerchantBenefits();
  const activities = service.getActivityItems();

  profile.nickname = 'changed';
  merchants[0].name = 'changed';
  activities[0].title = 'changed';
  service.submitLottery('8888');
  service.resetMockState();

  assert.equal(service.getUserProfile().nickname, '海口生活用户');
  assert.equal(service.getMerchantBenefits()[0].name, '海岛小院');
  assert.equal(service.getActivityItems()[0].title, '抽奖获券');
  assert.equal(service.getLotteryState().todayLeft, 1);
});

test('lookup and derived helpers support page data needs', () => {
  service.resetMockState();

  const coupon = service.getCouponById('coupon-qilou-food');
  const missingCoupon = service.getCouponLookup('coupon-missing');
  const number = service.generateLotteryNumber();
  const stats = service.getExchangeStats();

  assert.equal(coupon.title, '骑楼老街美食券');
  assert.equal(missingCoupon.fallback, true);
  assert.equal(missingCoupon.message, '未找到券，已显示默认券');
  assert.equal(missingCoupon.coupon.id, 'coupon-qilou-food');
  assert.match(number, /^\d{4}$/);
  assert.equal(service.getLotteryState().currentNumber, number);
  assert.deepEqual(stats, {
    pendingCount: 1,
    completedCount: 1,
    returnedCount: 0,
    expiredCount: 1,
  });
});
