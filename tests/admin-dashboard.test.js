const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const rootDir = path.join(__dirname, '..');

function readProjectFile(filePath) {
  return fs.readFileSync(path.join(rootDir, filePath), 'utf8');
}

test('admin dashboard is a real management surface backed by API calls', () => {
  const html = readProjectFile('admin/index.html');
  const js = readProjectFile('admin/app.js');
  const css = readProjectFile('admin/styles.css');

  for (const view of ['overview', 'coupons', 'exchanges', 'orders', 'merchants', 'ledger']) {
    assert.match(html, new RegExp(`data-view="${view}"`));
  }

  for (const endpoint of [
    '/api/admin/overview',
    '/api/coupon-templates',
    '/api/exchanges',
    '/api/orders',
    '/api/merchants',
    '/api/balance-records',
    '/api/recharges',
  ]) {
    assert.match(js, new RegExp(endpoint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(js, /verifyCoupon/);
  assert.match(js, /assignCouponTemplate/);
  assert.match(js, /deleteCouponTemplate/);
  assert.match(js, /delete-coupon-template/);
  assert.match(js, /method:\s*'DELETE'/);
  assert.match(html, /商户优惠券配置/);
  assert.match(html, /id="coupon-config-form"/);
  assert.match(html, /id="coupon-merchant-input"/);
  assert.match(html, /id="coupon-title-input"/);
  assert.match(html, /id="coupon-sale-price-input"/);
  assert.match(html, /id="coupon-amount-input"/);
  assert.match(html, /id="coupon-stock-input"/);
  assert.match(html, /id="coupon-user-input"/);
  assert.match(html, /id="coupon-verifier-input"/);
  assert.match(html, /id="coupon-image-input"/);
  assert.match(html, /id="coupon-image-url-input"/);
  assert.match(html, /id="coupon-image-preview"/);
  assert.match(html, /保存商户券配置/);
  assert.match(js, /readCouponForm/);
  assert.match(js, /new FormData/);
  assert.match(js, /uploadCouponImage/);
  assert.match(js, /FileReader/);
  assert.match(js, /\/api\/uploads/);
  assert.match(js, /getTemplateUser/);
  assert.match(js, /verifierScope/);
  assert.match(js, /state\.couponTemplates/);
  assert.match(js, /reviewExchange/);
  assert.match(js, /createMerchant/);
  assert.match(css, /\.coupon-config-form/);
  assert.match(css, /\.admin-shell/);
});
