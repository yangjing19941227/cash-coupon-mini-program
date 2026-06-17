const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const rootDir = path.join(__dirname, '..');

function readProjectFile(filePath) {
  return fs.readFileSync(path.join(rootDir, filePath), 'utf8');
}

function createExchangePageHarness(options = {}) {
  const jsPath = path.join(rootDir, 'pages/exchange/index.js');
  const js = fs.readFileSync(jsPath, 'utf8');
  const calls = {
    createExchangeRecord: [],
    getMerchantBenefits: 0,
    getUserProfile: 0,
    navigations: [],
    setData: [],
    toasts: [],
  };
  const service = {
    getUserProfile() {
      calls.getUserProfile += 1;
      return {
        city: '海口',
        district: '龙华区',
        exchangeAmount: 860,
        couponCount: 12,
        expiringCount: 2,
      };
    },
    getMerchantBenefits() {
      calls.getMerchantBenefits += 1;
      return [
        {
          id: 'merchant-1',
          name: '海岛小院',
          store: '海岛小院龙华店',
          category: '餐饮美食',
          district: '龙华区',
          image: '/assets/images/merchant-restaurant.svg',
          exchangeAmount: 300,
          description: '双人套餐券，到店核销可用。',
        },
      ];
    },
    createExchangeRecord(id) {
      calls.createExchangeRecord.push(id);
      if (options.createExchangeRecord) {
        return options.createExchangeRecord(id);
      }
      return {
        ok: true,
        message: '已提交置换申请',
      };
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
      showToast(payload) {
        calls.toasts.push(payload);
      },
      navigateTo(payload) {
        calls.navigations.push(payload);
      },
    },
  };

  vm.runInNewContext(js, context, { filename: jsPath });

  const page = {
    ...pageDefinition,
    data: { ...pageDefinition.data },
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

function createExchangeRecordsPageHarness() {
  const jsPath = path.join(rootDir, 'pages/exchange-records/index.js');
  const js = fs.readFileSync(jsPath, 'utf8');
  const calls = {
    formatDateTime: [],
    getExchangeRecords: [],
    getExchangeStats: 0,
    setData: [],
  };
  const service = {
    getExchangeStats() {
      calls.getExchangeStats += 1;
      return {
        pendingCount: 1,
        completedCount: 1,
        returnedCount: 1,
        expiredCount: 1,
      };
    },
    getExchangeRecords(filter) {
      calls.getExchangeRecords.push(filter);
      return [
        {
          id: 'exchange-returned',
          title: '退回置换申请',
          merchantName: '海岛小院',
          store: '海岛小院龙华店',
          appliedAt: '2026-06-16T10:35:00+08:00',
          completedAt: '2026-06-16T11:42:00+08:00',
          expiredAt: '2026-06-17T11:42:00+08:00',
          amount: 120,
          status: 'returned',
          reason: '商家退回',
        },
      ];
    },
  };
  const format = {
    formatDateTime(value) {
      calls.formatDateTime.push(value);
      return `formatted:${value}`;
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
    wx: {},
  };

  vm.runInNewContext(js, context, { filename: jsPath });

  const page = {
    ...pageDefinition,
    data: { ...pageDefinition.data },
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

function startExchange(page, id = 'merchant-1') {
  page.startExchange({
    currentTarget: {
      dataset: { id },
    },
  });
}

test('exchange page exposes merchant benefit imports, handlers and bindings', () => {
  const js = readProjectFile('pages/exchange/index.js');
  const wxml = readProjectFile('pages/exchange/index.wxml');

  for (const symbol of [
    'getUserProfile',
    'getMerchantBenefits',
    'createExchangeRecord',
    'loadExchangePage',
    'startExchange',
    'goExchangeRecords',
    'showRechargeTip',
    'showMoreMerchants',
  ]) {
    assert.match(js, new RegExp(symbol));
  }

  assert.match(js, /onLoad\s*\(\)\s*{[\s\S]*this\.loadExchangePage\s*\(/);
  assert.match(js, /onShow\s*\(\)\s*{[\s\S]*this\.loadExchangePage\s*\(/);

  for (const text of [
    '可置换额度',
    '闲置现金券',
    '临期可盘活',
    '充值额度',
    '把闲置现金券换成更适合你的同城权益',
    '置换商家权益',
    '发起置换',
  ]) {
    assert.match(wxml, new RegExp(text));
  }

  for (const binding of [
    'wx:for="{{merchants}}"',
    'wx:key="id"',
    'data-id="{{item.id}}"',
    'bindtap="startExchange"',
    'bindtap="goExchangeRecords"',
    'bindtap="showRechargeTip"',
    'bindtap="showMoreMerchants"',
  ]) {
    assert.match(wxml, new RegExp(binding.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('exchange submit guard ignores a second tap while navigation is pending', () => {
  const { calls, page } = createExchangePageHarness();

  startExchange(page);
  startExchange(page);

  assert.deepEqual(calls.createExchangeRecord, ['merchant-1']);
  assert.equal(calls.navigations.length, 1);
});

test('exchange records page exposes stats imports, tabs and record bindings', () => {
  const js = readProjectFile('pages/exchange-records/index.js');
  const wxml = readProjectFile('pages/exchange-records/index.wxml');

  for (const symbol of [
    'getExchangeStats',
    'getExchangeRecords',
    'loadRecords',
    'switchTab',
    'goBack',
    'showFilterTip',
    'showRecordDetail',
    'pendingCount',
    'completedCount',
    'returnedCount',
    'expiredCount',
  ]) {
    assert.match(js, new RegExp(symbol));
  }

  for (const text of [
    '置换记录',
    '全部',
    '待确认',
    '已完成',
    '已失效',
    '已退回',
    '查看详情',
  ]) {
    assert.match(wxml, new RegExp(text));
  }

  for (const binding of [
    'bindtap="goBack"',
    'wx:for="{{tabs}}"',
    'data-tab="{{item.label}}"',
    'bindtap="switchTab"',
    'wx:for="{{records}}"',
    'wx:key="id"',
    'bindtap="showRecordDetail"',
    'bindtap="showFilterTip"',
  ]) {
    assert.match(wxml, new RegExp(binding.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('exchange records page exposes returned tab and filters with the selected tab', () => {
  const { calls, page } = createExchangeRecordsPageHarness();

  page.onLoad();

  assert.deepEqual(
    Array.from(page.data.tabs, (tab) => tab.label),
    ['全部', '待确认', '已完成', '已退回', '已失效'],
  );
  assert.deepEqual(calls.getExchangeRecords, ['全部']);

  page.switchTab({
    currentTarget: {
      dataset: { tab: '已退回' },
    },
  });

  assert.equal(page.data.activeTab, '已退回');
  assert.deepEqual(calls.getExchangeRecords, ['全部', '已退回']);
});

test('exchange records page formats record times through shared format utility', () => {
  const { calls, page } = createExchangeRecordsPageHarness();

  page.loadRecords('已退回');

  assert.deepEqual(calls.formatDateTime, [
    '2026-06-16T10:35:00+08:00',
    '2026-06-16T11:42:00+08:00',
    '2026-06-17T11:42:00+08:00',
  ]);
  assert.equal(page.data.records[0].appliedText, 'formatted:2026-06-16T10:35:00+08:00');
  assert.equal(page.data.records[0].completedText, 'formatted:2026-06-16T11:42:00+08:00');
  assert.equal(page.data.records[0].expiredText, 'formatted:2026-06-17T11:42:00+08:00');
});
