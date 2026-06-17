const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const rootDir = path.join(__dirname, '..');

function readProjectFile(filePath) {
  return fs.readFileSync(path.join(rootDir, filePath), 'utf8');
}

function readCssRule(css, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escapedSelector}\\s*{([^}]*)}`, 's'));

  assert.ok(match, `Expected ${selector} rule to exist`);

  return match[1].replace(/\s+/g, ' ');
}

test('coupon code page exposes lookup, refresh behavior and display structure', () => {
  const js = readProjectFile('pages/coupon-code/index.js');
  const wxml = readProjectFile('pages/coupon-code/index.wxml');
  const wxss = readProjectFile('pages/coupon-code/index.wxss');

  for (const symbol of [
    'getCouponLookup',
    'formatMoney',
    'formatDateTime',
    'getStatusLabel',
    'refreshCode',
    'setInterval',
    'clearInterval',
  ]) {
    assert.match(js, new RegExp(symbol));
  }

  for (const text of [
    '到店出示核销码',
    '券码',
    '打开亮屏模式',
    '返回订单',
  ]) {
    assert.match(wxml, new RegExp(text));
  }

  assert.match(wxml, /每\s*60\s*秒自动刷新/);
  assert.match(wxml, /class="[^"]*\bqr-pattern\b/);

  const qrRule = readCssRule(wxss, '.qr-pattern');
  const width = qrRule.match(/width:\s*([0-9.]+rpx)/);
  const height = qrRule.match(/height:\s*([0-9.]+rpx)/);

  assert.ok(width, 'Expected .qr-pattern to declare a stable width');
  assert.ok(height, 'Expected .qr-pattern to declare a stable height');
  assert.equal(height[1], width[1], 'Expected .qr-pattern to be square');
});
