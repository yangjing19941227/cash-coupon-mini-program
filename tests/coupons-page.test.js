const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const rootDir = path.join(__dirname, '..');

function readProjectFile(filePath) {
  return fs.readFileSync(path.join(rootDir, filePath), 'utf8');
}

function createCouponsPageHarness() {
  const jsPath = path.join(rootDir, 'pages/coupons/index.js');
  const js = readProjectFile('pages/coupons/index.js');
  let pageDefinition;

  vm.runInNewContext(js, {
    require(request) {
      if (request === '../../utils/coupon-template-service') {
        return {
          getLocalCouponTemplates() {
            return [
              {
                id: 'template-local',
                templateId: 'template-local',
                category: '餐饮',
                title: '本地商户配置券',
                merchantName: '本地商户',
                store: '本地门店',
                amount: 30,
                salePrice: 20,
                price: '￥20',
                discount: '满100可用',
                badge: '本地配置',
                image: '/assets/images/coupon-deal-tea-clean.png',
              },
            ];
          },
          async getCouponTemplates() {
            return [
              {
                id: 'template-remote',
                templateId: 'template-remote',
                category: '餐饮',
                title: '后台商户配置券',
                merchantName: '后台商户1',
                store: '后台门店',
                amount: 50,
                salePrice: 35,
                price: '￥35',
                discount: '满150可用',
                badge: '后台配置',
                image: '/assets/images/coupon-deal-fish-clean.png',
              },
            ];
          },
        };
      }

      if (request === '../../utils/tabbar-service') {
        return {
          syncTabBar() {},
        };
      }

      throw new Error(`Unexpected require: ${request}`);
    },
    Page(definition) {
      pageDefinition = definition;
    },
    wx: {
      showToast() {},
      navigateTo() {},
    },
  }, { filename: jsPath });

  return pageDefinition;
}

test('coupon discovery tab exposes category, filter and order entry behavior', () => {
  const js = readProjectFile('pages/coupons/index.js');
  const wxml = readProjectFile('pages/coupons/index.wxml');

  for (const symbol of [
    'getCouponTemplates',
    'CATEGORY_DEFS',
    'FILTER_DEFS',
    'buildCategories',
    'buildFilters',
    'filterDeals',
    'loadDeals',
    'switchCategory',
    'switchFilter',
    'goOrderConfirm',
  ]) {
    assert.match(js, new RegExp(symbol));
  }

  for (const text of [
    '立即抢购',
    '{{item.merchantName}}',
    '{{item.price}}',
    '{{item.discount}}',
    '{{item.badge}}',
  ]) {
    assert.match(wxml, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(wxml, /搜索商家优惠券/);
  assert.doesNotMatch(js, /const DEALS\s*=/);

  for (const text of ['附近美食', '快餐', '饮品']) {
    assert.match(js, new RegExp(text));
  }
});

test('coupon discovery tab renders local merchant templates before backend finishes', () => {
  const page = createCouponsPageHarness();

  assert.ok(page.data.visibleDeals.length > 0);
  assert.equal(page.data.visibleDeals[0].id, 'template-local');
});

test('coupon discovery tab replaces fallback data with backend merchant templates', async () => {
  const page = createCouponsPageHarness();
  const updates = [];
  const instance = {
    data: JSON.parse(JSON.stringify(page.data)),
    setData(patch) {
      Object.assign(this.data, patch);
      updates.push(patch);
    },
  };

  await page.loadDeals.call(instance);

  assert.equal(instance.data.visibleDeals[0].id, 'template-remote');
  assert.equal(instance.data.visibleDeals[0].merchantName, '后台商户1');
  assert.equal(updates.length, 1);
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
  const service = readProjectFile('utils/coupon-template-service.js');

  for (const image of [
    '/assets/images/coupon-cat-recommend.png',
    '/assets/images/coupon-cat-food.png',
  ]) {
    assert.match(js, new RegExp(image.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.ok(fs.existsSync(path.join(rootDir, image.replace(/^\/+/, ''))));
  }

  for (const image of [
    '/assets/images/coupon-deal-hair-clean.png',
    '/assets/images/coupon-deal-tea-clean.png',
  ]) {
    assert.match(service, new RegExp(image.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.ok(fs.existsSync(path.join(rootDir, image.replace(/^\/+/, ''))));
  }
});

test('coupon template service turns uploaded backend images into loadable URLs', () => {
  const { normalizeTemplate } = require('../utils/coupon-template-service');
  const deal = normalizeTemplate({
    id: 'template-upload',
    title: '上传图片券',
    merchantName: '上传商户',
    image: '/uploads/coupon-test.png',
  });

  assert.equal(deal.image, 'http://127.0.0.1:8787/uploads/coupon-test.png');
});

test('coupon template service supplements short backend lists with local discovery templates', async () => {
  const seed = require('../data/mock');
  const { getCouponTemplates } = require('../utils/coupon-template-service');
  const remoteTemplates = seed.couponTemplates.slice(0, 3);
  const wxApi = {
    request({ success }) {
      success({
        statusCode: 200,
        data: {
          ok: true,
          templates: remoteTemplates,
        },
      });
    },
  };

  const templates = await getCouponTemplates('附近美食', { wxApi });
  const ids = new Set(templates.map((item) => item.id));

  assert.ok(templates.length >= seed.couponTemplates.length);
  assert.equal(templates[0].id, remoteTemplates[0].id);
  assert.equal(ids.size, templates.length);
});
