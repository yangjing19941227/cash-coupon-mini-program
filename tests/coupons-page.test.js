const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const rootDir = path.join(__dirname, '..');

function readProjectFile(filePath) {
  return fs.readFileSync(path.join(rootDir, filePath), 'utf8');
}

test('coupon assets page exposes required handlers and template bindings', () => {
  const js = readProjectFile('pages/coupons/index.js');
  const wxml = readProjectFile('pages/coupons/index.wxml');

  for (const handler of ['onShow', 'loadCoupons', 'switchTab', 'goUse', 'goExchange']) {
    assert.match(js, new RegExp(`${handler}\\s*\\(`));
  }

  assert.match(js, /onShow\s*\(\)\s*{[\s\S]*this\.loadCoupons\s*\(/);

  for (const text of ['现金券资产', 'wx:for', '去使用', '去置换']) {
    assert.match(wxml, new RegExp(text));
  }
});

test('coupon assets page keeps behavior bindings explicit in WXML', () => {
  const wxml = readProjectFile('pages/coupons/index.wxml');

  for (const binding of [
    'bindtap="switchTab"',
    'data-tab="{{item.label}}"',
    'wx:key="id"',
    'data-id="{{item.id}}"',
    'disabled="{{item.useDisabled}}"',
    'bindtap="goUse"',
    'bindtap="goExchange"',
  ]) {
    assert.match(wxml, new RegExp(binding.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('source statistic row can avoid narrow screen collisions', () => {
  const wxss = readProjectFile('pages/coupons/index.wxss');

  assert.match(wxss, /\.source-row\s*{[^}]*display:\s*(?:grid|flex)/s);
  assert.match(wxss, /\.source-row\s*{[^}]*(?:flex-wrap:\s*wrap|grid-template-columns:)/s);
});
