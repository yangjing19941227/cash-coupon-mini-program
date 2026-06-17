const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const rootDir = path.join(__dirname, '..');

function readProjectFile(filePath) {
  return fs.readFileSync(path.join(rootDir, filePath), 'utf8');
}

test('exchange page exposes merchant benefit imports, handlers and bindings', () => {
  const js = readProjectFile('pages/exchange/index.js');
  const wxml = readProjectFile('pages/exchange/index.wxml');

  for (const symbol of [
    'getUserProfile',
    'getMerchantBenefits',
    'createExchangeRecord',
    'loadExchangePage',
    'startExchange',
    'goExchangeRecords',
    'showRechargeTip',
    'showMoreMerchants',
  ]) {
    assert.match(js, new RegExp(symbol));
  }

  assert.match(js, /onLoad\s*\(\)\s*{[\s\S]*this\.loadExchangePage\s*\(/);
  assert.match(js, /onShow\s*\(\)\s*{[\s\S]*this\.loadExchangePage\s*\(/);

  for (const text of [
    '可置换额度',
    '闲置现金券',
    '临期可盘活',
    '充值额度',
    '把闲置现金券换成更适合你的同城权益',
    '置换商家权益',
    '发起置换',
  ]) {
    assert.match(wxml, new RegExp(text));
  }

  for (const binding of [
    'wx:for="{{merchants}}"',
    'wx:key="id"',
    'data-id="{{item.id}}"',
    'bindtap="startExchange"',
    'bindtap="goExchangeRecords"',
    'bindtap="showRechargeTip"',
    'bindtap="showMoreMerchants"',
  ]) {
    assert.match(wxml, new RegExp(binding.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('exchange records page exposes stats imports, tabs and record bindings', () => {
  const js = readProjectFile('pages/exchange-records/index.js');
  const wxml = readProjectFile('pages/exchange-records/index.wxml');

  for (const symbol of [
    'getExchangeStats',
    'getExchangeRecords',
    'loadRecords',
    'switchTab',
    'goBack',
    'showFilterTip',
    'showRecordDetail',
    'pendingCount',
    'completedCount',
    'returnedCount',
    'expiredCount',
  ]) {
    assert.match(js, new RegExp(symbol));
  }

  for (const text of [
    '置换记录',
    '全部',
    '待确认',
    '已完成',
    '已失效',
    '已退回',
    '查看详情',
  ]) {
    assert.match(wxml, new RegExp(text));
  }

  for (const binding of [
    'bindtap="goBack"',
    'wx:for="{{tabs}}"',
    'data-tab="{{item.label}}"',
    'bindtap="switchTab"',
    'wx:for="{{records}}"',
    'wx:key="id"',
    'bindtap="showRecordDetail"',
    'bindtap="showFilterTip"',
  ]) {
    assert.match(wxml, new RegExp(binding.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});
