const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const rootDir = path.join(__dirname, '..');

function readProjectFile(filePath) {
  return fs.readFileSync(path.join(rootDir, filePath), 'utf8');
}

test('exchange tab exposes recharge and exchange submit navigation', () => {
  const js = readProjectFile('pages/exchange/index.js');
  const wxml = readProjectFile('pages/exchange/index.wxml');

  assert.match(js, /goExchangeSubmit/);
  assert.match(js, /goRecharge/);
  assert.match(js, /\/pages\/exchange-submit\/index/);
  assert.match(js, /\/pages\/recharge\/index/);

  for (const text of [
    '置换宝',
    '可置换额度',
    '充值额度',
    '置换商家',
    '发起置换',
  ]) {
    assert.match(wxml, new RegExp(text));
  }

  assert.doesNotMatch(wxml, /<text>闲置优惠券<\/text>/);
  assert.doesNotMatch(wxml, /<text>临期可盘活<\/text>/);

  assert.match(wxml, /bindtap="goExchangeSubmit"/);
  assert.match(wxml, /bindtap="goRecharge"/);
});

test('exchange submit and records pages cover downstream review flow', () => {
  const submitJs = readProjectFile('pages/exchange-submit/index.js');
  const submitWxml = readProjectFile('pages/exchange-submit/index.wxml');
  const recordsJs = readProjectFile('pages/exchange-records/index.js');
  const recordsWxml = readProjectFile('pages/exchange-records/index.wxml');

  assert.match(submitJs, /goRecharge/);
  assert.match(submitJs, /createExchangeRecord/);
  assert.match(submitJs, /submitExchange/);
  assert.match(submitJs, /\/pages\/exchange-records\/index/);
  assert.match(submitJs, /\/pages\/recharge\/index/);
  assert.match(submitWxml, /提交置换申请/);
  assert.match(submitWxml, /bindtap="submitExchange"/);
  assert.match(submitWxml, /申请后等待商家确认/);

  assert.match(recordsJs, /goBack/);
  assert.match(recordsWxml, /置换记录/);
  assert.match(recordsWxml, /待确认/);
  assert.match(recordsWxml, /已完成/);
  assert.match(recordsWxml, /已退回/);
  assert.match(recordsWxml, /查看详情/);
});

test('payment and recharge downstream pages are registered with expected copy', () => {
  for (const [filePath, expected] of [
    ['pages/recharge/index.wxml', '充值额度'],
    ['pages/balance-records/index.wxml', '余额明细'],
    ['pages/order-confirm/index.wxml', '确认订单'],
    ['pages/payment-select/index.wxml', '选择支付'],
    ['pages/payment-success/index.wxml', '支付成功'],
    ['pages/orders/index.wxml', '我的订单'],
  ]) {
    assert.match(readProjectFile(filePath), new RegExp(expected));
  }
});
