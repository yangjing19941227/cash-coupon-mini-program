const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const rootDir = path.join(__dirname, '..');

function readProjectFile(filePath) {
  return fs.readFileSync(path.join(rootDir, filePath), 'utf8');
}

test('coupon discovery tab exposes category, filter and order entry behavior', () => {
  const js = readProjectFile('pages/coupons/index.js');
  const wxml = readProjectFile('pages/coupons/index.wxml');

  for (const symbol of [
    'CATEGORY_DEFS',
    'FILTER_DEFS',
    'DEALS',
    'buildCategories',
    'buildFilters',
    'filterDeals',
    'switchCategory',
    'switchFilter',
    'goOrderConfirm',
  ]) {
    assert.match(js, new RegExp(symbol));
  }

  for (const text of [
    '立即抢购',
    '{{item.price}}',
    '{{item.discount}}',
    '{{item.badge}}',
  ]) {
    assert.match(wxml, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(wxml, /搜索商家优惠券/);

  for (const text of ['附近美食', '快餐', '饮品']) {
    assert.match(js, new RegExp(text));
  }
});

test('coupon discovery tab keeps behavior bindings explicit in WXML', () => {
  const wxml = readProjectFile('pages/coupons/index.wxml');

  for (const binding of [
    'data-label="{{item.label}}"',
    'bindtap="switchCategory"',
    'bindtap="switchFilter"',
    'wx:key="id"',
    'data-id="{{item.id}}"',
    'catchtap="goOrderConfirm"',
  ]) {
    assert.match(wxml, new RegExp(binding.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('coupon discovery page uses real raster category and deal images', () => {
  const js = readProjectFile('pages/coupons/index.js');

  for (const image of [
    '/assets/images/coupon-cat-recommend.png',
    '/assets/images/coupon-cat-food.png',
    '/assets/images/coupon-deal-hair-clean.png',
    '/assets/images/coupon-deal-tea-clean.png',
  ]) {
    assert.match(js, new RegExp(image.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.ok(fs.existsSync(path.join(rootDir, image.replace(/^\/+/, ''))));
  }
});
