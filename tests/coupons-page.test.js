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
    'aria-disabled="{{item.useDisabled}}"',
    'bindtap="goUse"',
    'bindtap="goExchange"',
  ]) {
    assert.match(wxml, new RegExp(binding.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('source statistic row can avoid narrow screen collisions', () => {
  const wxss = readProjectFile('pages/coupons/index.wxss');
  const sourceTitleRule = readCssRule(wxss, '.source-title');
  const sourcePillRule = readCssRule(wxss, '.source-pill');

  assert.match(wxss, /\.source-row\s*{[^}]*display:\s*(?:grid|flex)/s);
  assert.match(wxss, /\.source-row\s*{[^}]*(?:flex-wrap:\s*wrap|grid-template-columns:)/s);
  assert.match(sourceTitleRule, /(?:flex:\s*0\s+0\s+100%|flex-basis:\s*100%)/);
  assert.doesNotMatch(sourcePillRule, /min-width:\s*210rpx/);
  assert.match(sourcePillRule, /(?:flex:\s*1\s+1\s+100%|min-width:\s*260rpx)/);
});
