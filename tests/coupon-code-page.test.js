const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const rootDir = path.join(__dirname, '..');

function readProjectFile(filePath) {
  return fs.readFileSync(path.join(rootDir, filePath), 'utf8');
}

test('coupon code page exposes QR blocks and store verification copy', () => {
  const js = readProjectFile('pages/coupon-code/index.js');
  const wxml = readProjectFile('pages/coupon-code/index.wxml');
  const wxss = readProjectFile('pages/coupon-code/index.wxss');

  assert.match(js, /qrBlocks/);
  assert.match(js, /pattern\.split/);
  assert.match(js, /goBack/);

  for (const text of [
    '出示券码',
    '到店出示核销码',
    '请将二维码出示给商家扫码核销',
    '券码',
    '打开亮屏模式',
    '返回订单',
  ]) {
    assert.match(wxml, new RegExp(text));
  }

  assert.match(wxml, /wx:for="{{qrBlocks}}"/);
  assert.match(wxss, /\.qr-code/);
  assert.match(wxss, /\.qr-block/);
});

test('coupon detail page links purchase flow and explains redemption', () => {
  const js = readProjectFile('pages/coupon-detail/index.js');
  const wxml = readProjectFile('pages/coupon-detail/index.wxml');

  assert.match(js, /goOrderConfirm/);
  assert.match(js, /\/pages\/order-confirm\/index/);
  assert.match(wxml, /优惠券详情/);
  assert.match(wxml, /权益说明/);
  assert.match(wxml, /使用方式/);
  assert.match(wxml, /到店出示券码核销/);
});
