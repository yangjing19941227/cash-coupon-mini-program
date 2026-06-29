const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const rootDir = path.join(__dirname, '..');

function readProjectFile(filePath) {
  return fs.readFileSync(path.join(rootDir, filePath), 'utf8');
}

function createOrdersPageHarness() {
  const jsPath = path.join(rootDir, 'pages/orders/index.js');
  const js = readProjectFile('pages/orders/index.js');
  let pageDefinition;

  vm.runInNewContext(js, {
    Page(definition) {
      pageDefinition = definition;
    },
    wx: {
      navigateBack() {},
      navigateTo() {},
    },
  }, { filename: jsPath });

  const page = {
    ...pageDefinition,
    data: JSON.parse(JSON.stringify(pageDefinition.data || {})),
    setData(update) {
      this.data = {
        ...this.data,
        ...update,
      };
    },
  };

  return page;
}

test('orders page exposes four purchase states and filters by segmented tab', () => {
  const page = createOrdersPageHarness();

  assert.deepEqual(page.data.tabs.map((item) => item.label), ['待付款', '待核销', '已完成', '退款中']);
  assert.equal(page.data.activeStatus, 'pending');
  assert.ok(page.data.visibleOrders.every((item) => item.status === 'pending'));

  page.setStatus({ currentTarget: { dataset: { status: 'verify' } } });
  assert.equal(page.data.activeStatus, 'verify');
  assert.ok(page.data.visibleOrders.length > 0);
  assert.ok(page.data.visibleOrders.every((item) => item.status === 'verify'));
});

test('orders page card layout keeps title and status in one row with 78pt image below title', () => {
  const wxml = readProjectFile('pages/orders/index.wxml');
  const wxss = readProjectFile('pages/orders/index.wxss');

  for (const snippet of [
    'bindtap="setStatus"',
    'wx:for="{{visibleOrders}}"',
    'class="order-title-row"',
    'class="order-title"',
    'class="order-status',
    'class="order-content-row"',
  ]) {
    assert.match(wxml, new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(wxss, /\.order-image\s*{[^}]*width:\s*78pt;[^}]*height:\s*78pt;/s);
  assert.match(wxss, /\.order-title\s*{[^}]*white-space:\s*nowrap;[^}]*text-overflow:\s*ellipsis;/s);
  assert.doesNotMatch(wxss, /border:\s*1rpx[^;]*rgba/);
});

test('profile order block routes into orders page from my orders entry', () => {
  const js = readProjectFile('pages/profile/index.js');
  const wxml = readProjectFile('pages/profile/index.wxml');

  assert.match(js, /goOrders\(/);
  assert.match(js, /\/pages\/orders\/index/);
  assert.match(wxml, /bindtap="goOrders"/);
  assert.match(wxml, /我的订单/);
});
