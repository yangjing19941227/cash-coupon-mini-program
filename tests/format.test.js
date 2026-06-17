const assert = require('node:assert/strict');
const test = require('node:test');

const {
  formatMoney,
  formatCouponValue,
  formatDateTime,
  getStatusLabel,
  padFourDigits,
} = require('../utils/format');

test('formatMoney keeps integer values whole', () => {
  assert.equal(formatMoney(328), '¥328');
});

test('formatMoney keeps two decimals for fractional values', () => {
  assert.equal(formatMoney(68.5), '¥68.50');
});

test('formatCouponValue formats threshold coupons', () => {
  assert.equal(formatCouponValue({ threshold: 100, amount: 30 }), '满100减30');
});

test('formatCouponValue formats no-threshold coupons', () => {
  assert.equal(formatCouponValue({ threshold: 0, amount: 20 }), '立减20');
});

test('formatDateTime formats ISO date time to minute precision', () => {
  assert.equal(formatDateTime('2026-06-30T23:59:00+08:00'), '2026-06-30 23:59');
});

test('getStatusLabel returns labels and tones for coupon statuses', () => {
  assert.deepEqual(getStatusLabel('unused'), { text: '未使用', tone: 'success' });
  assert.deepEqual(getStatusLabel('pending'), { text: '待商家确认', tone: 'warning' });
  assert.deepEqual(getStatusLabel('expired'), { text: '已失效', tone: 'muted' });
  assert.deepEqual(getStatusLabel('used'), { text: '已使用', tone: 'muted' });
  assert.deepEqual(getStatusLabel('completed'), { text: '已完成', tone: 'success' });
  assert.deepEqual(getStatusLabel('returned'), { text: '已退回', tone: 'muted' });
});

test('padFourDigits pads values shorter than four digits', () => {
  assert.equal(padFourDigits(8), '0008');
});

test('padFourDigits leaves four digit values unchanged', () => {
  assert.equal(padFourDigits(3806), '3806');
});
