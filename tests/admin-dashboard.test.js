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
    '/api/coupons',
    '/api/exchanges',
    '/api/orders',
    '/api/merchants',
    '/api/balance-records',
    '/api/recharges',
  ]) {
    assert.match(js, new RegExp(endpoint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(js, /verifyCoupon/);
  assert.match(js, /reviewExchange/);
  assert.match(js, /createMerchant/);
  assert.match(css, /\.admin-shell/);
});
