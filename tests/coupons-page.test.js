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

  for (const handler of ['loadCoupons', 'switchTab', 'goUse', 'goExchange']) {
    assert.match(js, new RegExp(`${handler}\\s*\\(`));
  }

  for (const text of ['现金券资产', 'wx:for', '去使用', '去置换']) {
    assert.match(wxml, new RegExp(text));
  }
});
