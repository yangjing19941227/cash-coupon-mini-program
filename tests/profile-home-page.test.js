const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const rootDir = path.join(__dirname, '..');

function readProjectFile(filePath) {
  return fs.readFileSync(path.join(rootDir, filePath), 'utf8');
}

test('profile page loads profile assets, activities and required menu links', () => {
  const js = readProjectFile('pages/profile/index.js');
  const wxml = readProjectFile('pages/profile/index.wxml');

  for (const symbol of [
    'getUserProfile',
    'getActivityItems',
    'getCouponSummary',
    'loadProfilePage',
    'goCoupons',
    'goLotteryRecords',
    'goExchangeRecords',
  ]) {
    assert.match(js, new RegExp(symbol));
  }

  assert.match(js, /onLoad\s*\(\)\s*{[\s\S]*this\.loadProfilePage\s*\(/);
  assert.match(js, /onShow\s*\(\)\s*{[\s\S]*this\.loadProfilePage\s*\(/);

  for (const text of [
    '我的现金券',
    '抽奖记录',
    '置换记录',
    '核销记录',
    '资产流水',
    '现金券',
    '抽奖次数',
    '即将过期',
    '置换额度',
  ]) {
    assert.match(wxml, new RegExp(text));
  }
});

test('profile page declares guarded navigation targets and toast-only menus', () => {
  const js = readProjectFile('pages/profile/index.js');
  const wxml = readProjectFile('pages/profile/index.wxml');

  assert.match(js, /hasWxApi\s*\(\s*['"]switchTab['"]\s*\)/);
  assert.match(js, /hasWxApi\s*\(\s*['"]navigateTo['"]\s*\)/);
  assert.match(js, /url:\s*['"]\/pages\/coupons\/index['"]/);
  assert.match(js, /url:\s*['"]\/pages\/lottery-records\/index['"]/);
  assert.match(js, /url:\s*['"]\/pages\/exchange-records\/index['"]/);
  assert.match(js, /核销记录功能即将开放/);
  assert.match(js, /资产流水功能即将开放/);

  for (const binding of [
    'bindtap="goCoupons"',
    'bindtap="goLotteryRecords"',
    'bindtap="goExchangeRecords"',
    'bindtap="showVerifyRecords"',
    'bindtap="showAssetFlow"',
  ]) {
    assert.match(wxml, new RegExp(binding.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('home page is an operational first tab with services, actions and previews', () => {
  const js = readProjectFile('pages/home/index.js');
  const wxml = readProjectFile('pages/home/index.wxml');

  for (const symbol of [
    'getUserProfile',
    'getCouponSummary',
    'getMerchantBenefits',
    'getCoupons',
    'loadHomePage',
    'goCoupons',
    'goExchange',
    'goLottery',
    'goProfile',
  ]) {
    assert.match(js, new RegExp(symbol));
  }

  assert.match(js, /onLoad\s*\(\)\s*{[\s\S]*this\.loadHomePage\s*\(/);
  assert.match(js, /onShow\s*\(\)\s*{[\s\S]*this\.loadHomePage\s*\(/);
  assert.match(js, /url:\s*['"]\/pages\/coupons\/index['"]/);
  assert.match(js, /url:\s*['"]\/pages\/exchange\/index['"]/);
  assert.match(js, /url:\s*['"]\/pages\/lottery\/index['"]/);
  assert.match(js, /url:\s*['"]\/pages\/profile\/index['"]/);

  for (const text of [
    '首页',
    '快捷入口',
    '现金券',
    '置换',
    '抽奖',
    '附近权益',
    '最新现金券',
  ]) {
    assert.match(wxml, new RegExp(text));
  }

  for (const binding of [
    'bindtap="goCoupons"',
    'bindtap="goExchange"',
    'bindtap="goLottery"',
    'bindtap="goProfile"',
  ]) {
    assert.match(wxml, new RegExp(binding.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});
