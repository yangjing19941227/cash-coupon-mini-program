const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

const requiredPages = [
  'pages/home/index',
  'pages/coupons/index',
  'pages/exchange/index',
  'pages/lottery/index',
  'pages/profile/index',
  'pages/coupon-assets/index',
  'pages/coupon-code/index',
  'pages/coupon-detail/index',
  'pages/exchange-submit/index',
  'pages/exchange-records/index',
  'pages/lottery-records/index',
  'pages/recharge/index',
  'pages/balance-records/index',
  'pages/order-confirm/index',
  'pages/payment-select/index',
  'pages/payment-success/index',
  'pages/orders/index',
  'pages/rules/index',
];

const requiredTabs = [
  ['pages/home/index', '首页'],
  ['pages/coupons/index', '优惠券'],
  ['pages/exchange/index', '置换'],
  ['pages/lottery/index', '抽奖'],
  ['pages/profile/index', '我的'],
];

test('app.json registers required pages and tab bar assets', () => {
  const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));

  assert.deepEqual(app.pages, requiredPages);
  assert.equal(app.window.navigationStyle, 'custom');
  assert.equal(app.tabBar.list.length, 5);

  assert.deepEqual(
    app.tabBar.list.map((item) => [item.pagePath, item.text]),
    requiredTabs,
  );

  for (const page of requiredPages) {
    for (const ext of ['js', 'json', 'wxml', 'wxss']) {
      assert.equal(
        fs.existsSync(path.join(root, `${page}.${ext}`)),
        true,
        `${page}.${ext} exists`,
      );
    }
  }

  for (const item of app.tabBar.list) {
    for (const key of ['iconPath', 'selectedIconPath']) {
      assert.match(
        item[key],
        /\.(png|jpe?g)$/i,
        `${key} must use a WeChat tabBar-compatible raster image`,
      );
    }
    assert.equal(
      fs.existsSync(path.join(root, item.iconPath)),
      true,
      `${item.iconPath} exists`,
    );
    assert.equal(
      fs.existsSync(path.join(root, item.selectedIconPath)),
      true,
      `${item.selectedIconPath} exists`,
    );
  }
});
