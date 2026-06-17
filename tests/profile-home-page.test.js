const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const rootDir = path.join(__dirname, '..');

function readProjectFile(filePath) {
  return fs.readFileSync(path.join(rootDir, filePath), 'utf8');
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createPageInstance(pageDefinition, calls) {
  return {
    ...pageDefinition,
    data: clone(pageDefinition.data || {}),
    setData(update) {
      calls.setData.push(update);
      this.data = {
        ...this.data,
        ...update,
      };
    },
  };
}

function createHomePageHarness(options = {}) {
  const jsPath = path.join(rootDir, 'pages/home/index.js');
  const js = fs.readFileSync(jsPath, 'utf8');
  const expiresAt = options.expiresAt || '2026-06-17T18:30:00Z';
  const coupons = options.coupons || [
    {
      id: 'coupon-latest',
      status: 'unused',
      amount: 30,
      threshold: 100,
      expiresAt,
    },
  ];
  const calls = {
    formatDateTime: [],
    getCouponSummary: 0,
    getCoupons: [],
    getMerchantBenefits: 0,
    getUserProfile: 0,
    navigations: [],
    setData: [],
    switches: [],
  };
  const service = {
    getUserProfile() {
      calls.getUserProfile += 1;
      return {
        city: 'city',
        district: 'district',
        savedAmount: 128,
        exchangeAmount: 500,
        lotteryLeft: 2,
      };
    },
    getCouponSummary() {
      calls.getCouponSummary += 1;
      return {
        availableCount: coupons.length,
        totalValue: 30,
        expiringCount: 1,
      };
    },
    getMerchantBenefits() {
      calls.getMerchantBenefits += 1;
      return [
        {
          id: 'merchant-1',
          category: 'category',
          district: 'district',
          exchangeAmount: 80,
        },
      ];
    },
    getCoupons(filter) {
      calls.getCoupons.push(filter);
      return coupons;
    },
  };
  const format = {
    formatDateTime(value) {
      calls.formatDateTime.push(value);
      return options.formattedDateTime || '2026-06-18 02:30';
    },
  };
  let pageDefinition;

  const context = {
    require(request) {
      if (request === '../../utils/mock-service') {
        return service;
      }

      if (request === '../../utils/format') {
        return format;
      }

      throw new Error(`Unexpected require: ${request}`);
    },
    Page(definition) {
      pageDefinition = definition;
    },
    wx: {
      navigateTo(payload) {
        calls.navigations.push(payload);
      },
      switchTab(payload) {
        calls.switches.push(payload);
      },
    },
  };

  vm.runInNewContext(js, context, { filename: jsPath });

  assert.ok(pageDefinition, 'Expected home page to register with Page');

  return {
    calls,
    page: createPageInstance(pageDefinition, calls),
  };
}

function createProfilePageHarness() {
  const jsPath = path.join(rootDir, 'pages/profile/index.js');
  const js = fs.readFileSync(jsPath, 'utf8');
  const calls = {
    getActivityItems: 0,
    getCouponSummary: 0,
    getUserProfile: 0,
    navigations: [],
    setData: [],
    switches: [],
    toasts: [],
  };
  const service = {
    getUserProfile() {
      calls.getUserProfile += 1;
      return {
        nickname: 'tester',
        city: 'city',
        district: 'district',
        avatar: '/avatar.svg',
        savedAmount: 128,
        couponCount: 3,
        lotteryLeft: 2,
        expiringCount: 1,
        exchangeAmount: 500,
      };
    },
    getCouponSummary() {
      calls.getCouponSummary += 1;
      return {
        availableCount: 3,
        totalValue: 90,
        expiringCount: 1,
      };
    },
    getActivityItems() {
      calls.getActivityItems += 1;
      return [
        {
          id: 'activity-1',
          type: 'coupon',
          title: 'activity',
          value: '-30',
        },
      ];
    },
  };
  let pageDefinition;

  const context = {
    require(request) {
      if (request === '../../utils/mock-service') {
        return service;
      }

      throw new Error(`Unexpected require: ${request}`);
    },
    Page(definition) {
      pageDefinition = definition;
    },
    wx: {
      navigateTo(payload) {
        calls.navigations.push(payload);
      },
      showToast(payload) {
        calls.toasts.push(payload);
      },
      switchTab(payload) {
        calls.switches.push(payload);
      },
    },
  };

  vm.runInNewContext(js, context, { filename: jsPath });

  assert.ok(pageDefinition, 'Expected profile page to register with Page');

  return {
    calls,
    page: createPageInstance(pageDefinition, calls),
  };
}

test('home page skips duplicate first onShow refresh after onLoad', () => {
  const { calls, page } = createHomePageHarness();

  page.onLoad();

  assert.equal(calls.getUserProfile, 1);
  assert.equal(calls.getCouponSummary, 1);
  assert.equal(calls.getMerchantBenefits, 1);
  assert.equal(calls.getCoupons.length, 1);

  page.onShow();

  assert.equal(calls.getUserProfile, 1);
  assert.equal(calls.getCouponSummary, 1);
  assert.equal(calls.getMerchantBenefits, 1);
  assert.equal(calls.getCoupons.length, 1);

  page.onShow();

  assert.equal(calls.getUserProfile, 2);
  assert.equal(calls.getCouponSummary, 2);
  assert.equal(calls.getMerchantBenefits, 2);
  assert.equal(calls.getCoupons.length, 2);
});

test('profile page skips duplicate first onShow refresh after onLoad', () => {
  const { calls, page } = createProfilePageHarness();

  page.onLoad();

  assert.equal(calls.getUserProfile, 1);
  assert.equal(calls.getCouponSummary, 1);
  assert.equal(calls.getActivityItems, 1);

  page.onShow();

  assert.equal(calls.getUserProfile, 1);
  assert.equal(calls.getCouponSummary, 1);
  assert.equal(calls.getActivityItems, 1);

  page.onShow();

  assert.equal(calls.getUserProfile, 2);
  assert.equal(calls.getCouponSummary, 2);
  assert.equal(calls.getActivityItems, 2);
});

test('home goLatestCoupon navigates to latest coupon code', () => {
  const { calls, page } = createHomePageHarness();

  page.loadHomePage();
  page.goLatestCoupon();

  assert.deepEqual(clone(calls.navigations), [
    { url: '/pages/coupon-code/index?id=coupon-latest' },
  ]);
});

test('home goLatestCoupon does nothing when no latest coupon is available', () => {
  const { calls, page } = createHomePageHarness({ coupons: [] });

  page.loadHomePage();
  page.goLatestCoupon();

  assert.equal(page.data.latestCoupon, null);
  assert.deepEqual(calls.navigations, []);
});

test('home latest coupon expiry text uses shared formatted date part', () => {
  const expiresAt = '2026-06-17T18:30:00Z';
  const { calls, page } = createHomePageHarness({ expiresAt });

  page.loadHomePage();

  assert.deepEqual(calls.formatDateTime, [expiresAt]);
  assert.equal(page.data.latestCoupon.expiresText, '2026-06-18');
});

test('profile navigation handlers send expected wx payloads', () => {
  const { calls, page } = createProfilePageHarness();

  page.goCoupons();
  page.goLotteryRecords();
  page.goExchangeRecords();
  page.showVerifyRecords();
  page.showAssetFlow();
  page.showProfileData();
  page.showSettings();

  assert.deepEqual(clone(calls.switches), [
    { url: '/pages/coupons/index' },
  ]);
  assert.deepEqual(clone(calls.navigations), [
    { url: '/pages/lottery-records/index' },
    { url: '/pages/exchange-records/index' },
  ]);
  assert.equal(calls.toasts.length, 4);
  assert.deepEqual(
    calls.toasts.map((toast) => toast.icon),
    ['none', 'none', 'none', 'none'],
  );
  assert.equal(new Set(calls.toasts.map((toast) => toast.title)).size, 4);
  assert.ok(calls.toasts.every((toast) => typeof toast.title === 'string' && toast.title));
});

test('profile page loads profile assets, activities and required menu links', () => {
  const js = readProjectFile('pages/profile/index.js');
  const wxml = readProjectFile('pages/profile/index.wxml');

  for (const symbol of [
    'getUserProfile',
    'getActivityItems',
    'getCouponSummary',
    'loadProfilePage',
    'goCoupons',
    'goLotteryRecords',
    'goExchangeRecords',
  ]) {
    assert.match(js, new RegExp(symbol));
  }

  assert.match(js, /onLoad\s*\(\)\s*{[\s\S]*this\.loadProfilePage\s*\(/);
  assert.match(js, /onShow\s*\(\)\s*{[\s\S]*this\.loadProfilePage\s*\(/);

  for (const text of [
    '我的现金券',
    '抽奖记录',
    '置换记录',
    '核销记录',
    '资产流水',
    '现金券',
    '抽奖次数',
    '即将过期',
    '置换额度',
  ]) {
    assert.match(wxml, new RegExp(text));
  }
});

test('profile page declares guarded navigation targets and toast-only menus', () => {
  const js = readProjectFile('pages/profile/index.js');
  const wxml = readProjectFile('pages/profile/index.wxml');

  assert.match(js, /hasWxApi\s*\(\s*['"]switchTab['"]\s*\)/);
  assert.match(js, /hasWxApi\s*\(\s*['"]navigateTo['"]\s*\)/);
  assert.match(js, /url:\s*['"]\/pages\/coupons\/index['"]/);
  assert.match(js, /url:\s*['"]\/pages\/lottery-records\/index['"]/);
  assert.match(js, /url:\s*['"]\/pages\/exchange-records\/index['"]/);
  assert.match(js, /核销记录功能即将开放/);
  assert.match(js, /资产流水功能即将开放/);

  for (const binding of [
    'bindtap="goCoupons"',
    'bindtap="goLotteryRecords"',
    'bindtap="goExchangeRecords"',
    'bindtap="showVerifyRecords"',
    'bindtap="showAssetFlow"',
  ]) {
    assert.match(wxml, new RegExp(binding.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('home page is an operational first tab with services, actions and previews', () => {
  const js = readProjectFile('pages/home/index.js');
  const wxml = readProjectFile('pages/home/index.wxml');

  for (const symbol of [
    'getUserProfile',
    'getCouponSummary',
    'getMerchantBenefits',
    'getCoupons',
    'loadHomePage',
    'goCoupons',
    'goExchange',
    'goLottery',
    'goProfile',
  ]) {
    assert.match(js, new RegExp(symbol));
  }

  assert.match(js, /onLoad\s*\(\)\s*{[\s\S]*this\.loadHomePage\s*\(/);
  assert.match(js, /onShow\s*\(\)\s*{[\s\S]*this\.loadHomePage\s*\(/);
  assert.match(js, /url:\s*['"]\/pages\/coupons\/index['"]/);
  assert.match(js, /url:\s*['"]\/pages\/exchange\/index['"]/);
  assert.match(js, /url:\s*['"]\/pages\/lottery\/index['"]/);
  assert.match(js, /url:\s*['"]\/pages\/profile\/index['"]/);

  for (const text of [
    '首页',
    '快捷入口',
    '现金券',
    '置换',
    '抽奖',
    '附近权益',
    '最新现金券',
  ]) {
    assert.match(wxml, new RegExp(text));
  }

  for (const binding of [
    'bindtap="goCoupons"',
    'bindtap="goExchange"',
    'bindtap="goLottery"',
    'bindtap="goProfile"',
  ]) {
    assert.match(wxml, new RegExp(binding.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});
