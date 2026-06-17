const assert = require('node:assert/strict');
const test = require('node:test');

const service = require('../utils/mock-service');

test('getCouponSummary counts available, used, expiring and total value', () => {
  service.resetMockState();

  const summary = service.getCouponSummary();

  assert.equal(summary.availableCount, 12);
  assert.equal(summary.totalValue, 328);
  assert.equal(summary.usedCount, 8);
  assert.equal(summary.expiringCount, 2);
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

  assert.equal(incomplete.ok, false);
  assert.equal(accepted.ok, true);
  assert.equal(exhausted.ok, false);
  assert.equal(service.getLotteryState().todayLeft, 0);
});

test('createExchangeRecord appends a pending record', () => {
  service.resetMockState();
  const beforeRecords = service.getExchangeRecords();

  const result = service.createExchangeRecord('merchant-1');
  const afterRecords = service.getExchangeRecords();

  assert.equal(result.ok, true);
  assert.equal(afterRecords.length, beforeRecords.length + 1);
  assert.equal(afterRecords[0].status, 'pending');
  assert.equal(afterRecords[0].merchantName, '海岛小院');
});

test('createExchangeRecord rejects missing merchants and insufficient balance', () => {
  service.resetMockState();

  assert.equal(service.createExchangeRecord('merchant-missing').ok, false);
  assert.equal(service.createExchangeRecord('merchant-too-expensive').ok, false);
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
  const number = service.generateLotteryNumber();
  const stats = service.getExchangeStats();

  assert.equal(coupon.title, '骑楼老街美食券');
  assert.match(number, /^\d{4}$/);
  assert.equal(service.getLotteryState().currentNumber, number);
  assert.deepEqual(stats, {
    pendingCount: 1,
    completedCount: 1,
    returnedCount: 0,
    expiredCount: 1,
  });
});
