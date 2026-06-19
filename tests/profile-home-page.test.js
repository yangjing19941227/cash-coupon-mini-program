const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const rootDir = path.join(__dirname, '..');

function readProjectFile(filePath) {
  return fs.readFileSync(path.join(rootDir, filePath), 'utf8');
}

function createHomePageHarness(options = {}) {
  const jsPath = path.join(rootDir, 'pages/home/index.js');
  const js = readProjectFile('pages/home/index.js');
  const calls = {
    getCouponSummary: 0,
    getCoupons: [],
    getMerchantBenefits: 0,
    getUserProfile: 0,
    navigations: [],
    switches: [],
    setData: [],
  };
  const coupons = options.coupons || [
    {
      id: 'coupon-latest',
      status: 'unused',
      amount: 30,
      threshold: 100,
      expiresAt: '2026-06-30T23:59:00+08:00',
    },
  ];
  let pageDefinition;
  const context = {
    require(request) {
      if (request === '../../utils/mock-service') {
        return {
          getUserProfile() {
            calls.getUserProfile += 1;
            return {
              city: '海口',
              district: '龙华区',
              savedAmount: 236,
              exchangeAmount: 860,
              lotteryLeft: 1,
            };
          },
          getCouponSummary() {
            calls.getCouponSummary += 1;
            return {
              availableCount: coupons.length,
              totalValue: 196,
              expiringCount: 2,
            };
          },
          getMerchantBenefits() {
            calls.getMerchantBenefits += 1;
            return [];
          },
          getCoupons(filter) {
            calls.getCoupons.push(filter);
            return coupons;
          },
        };
      }

      if (request === '../../utils/format') {
        return {
          formatDateTime(value) {
            return String(value).replace('T', ' ').slice(0, 16);
          },
        };
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

  const page = {
    ...pageDefinition,
    data: JSON.parse(JSON.stringify(pageDefinition.data || {})),
    setData(update) {
      calls.setData.push(update);
      this.data = {
        ...this.data,
        ...update,
      };
    },
  };

  return { calls, page };
}

test('home page loads current summary data and skips duplicate first onShow refresh', () => {
  const { calls, page } = createHomePageHarness();

  page.onLoad();
  page.onShow();
  page.onShow();

  assert.equal(calls.getUserProfile, 2);
  assert.equal(calls.getCouponSummary, 2);
  assert.equal(calls.getMerchantBenefits, 2);
  assert.equal(calls.getCoupons.length, 2);
  assert.equal(page.data.locationText, '海口 · 龙华区');
});

test('home page navigates latest coupon into order confirmation flow', () => {
  const { calls, page } = createHomePageHarness();

  page.loadHomePage();
  page.goLatestCoupon();

  assert.deepEqual(JSON.parse(JSON.stringify(calls.navigations)), [
    { url: '/pages/order-confirm/index?id=coupon-latest' },
  ]);
});

test('home tab keeps service entry points and local deal feed', () => {
  const js = readProjectFile('pages/home/index.js');
  const wxml = readProjectFile('pages/home/index.wxml');

  for (const symbol of ['loadHomePage', 'goCoupons', 'goExchange', 'goLottery', 'goProfile', 'LOCAL_DEAL_SEEDS']) {
    assert.match(js, new RegExp(symbol));
  }

  for (const text of ['同城名惠', '优惠券资产', '置换额度', '今日抽奖', '买优惠券', '置换', '去抽奖', '本地惠选']) {
    assert.match(wxml, new RegExp(text));
  }

  assert.doesNotMatch(wxml, /我的/);
});

test('profile page exposes asset, lottery, exchange and code navigation', () => {
  const js = readProjectFile('pages/profile/index.js');
  const wxml = readProjectFile('pages/profile/index.wxml');

  for (const symbol of ['goCouponAssets', 'goLotteryRecords', 'goExchangeRecords', 'goCouponCode']) {
    assert.match(js, new RegExp(symbol));
  }

  for (const text of [
    '我的优惠券',
    '抽奖记录',
    '置换记录',
    '核销记录',
    '最近权益动态',
    '累计已省',
  ]) {
    assert.match(wxml, new RegExp(text));
  }

  for (const binding of [
    'bindtap="goCouponAssets"',
    'bindtap="goLotteryRecords"',
    'bindtap="goExchangeRecords"',
  ]) {
    assert.match(wxml, new RegExp(binding.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});
