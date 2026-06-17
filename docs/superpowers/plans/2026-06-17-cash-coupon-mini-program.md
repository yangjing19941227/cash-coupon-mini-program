# 现金券微信小程序 C 端首版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable native WeChat Mini Program C-side cash coupon experience with mock data for coupons, lottery, exchange, coupon code, records, and profile flows.

**Architecture:** Use a plain WeChat Mini Program project with no framework build chain. Keep business data in `data/mock.js`, pure formatting in `utils/format.js`, and state-changing mock behavior in `utils/mock-service.js` so later backend integration can replace one boundary. Pages consume the service layer and share global styling tokens from `app.wxss`.

**Tech Stack:** Native WeChat Mini Program WXML/WXSS/JS/JSON, CommonJS utility modules, Node.js built-in test runner for service and formatter tests, PowerShell-friendly validation commands.

---

## File Structure

- Create `project.config.json`: WeChat Developer Tools project metadata.
- Create `sitemap.json`: permissive sitemap for local development.
- Create `app.json`: page registry, tabBar config, window config.
- Create `app.js`: global app bootstrap and shared status bar fallback.
- Create `app.wxss`: global design tokens, layout helpers, reusable card/button/tag styles.
- Create `assets/icons/*.svg`: lightweight tab bar icons and simple line icons.
- Create `assets/images/*.svg`: merchant/profile development illustrations.
- Create `data/mock.js`: user, coupons, merchants, records, lottery state, and activity mock data.
- Create `utils/format.js`: pure formatting helpers.
- Create `utils/mock-service.js`: read APIs and mock state transition APIs.
- Create `tests/format.test.js`: tests for formatting helpers.
- Create `tests/mock-service.test.js`: tests for business state transitions.
- Create `tests/config.test.js`: tests that `app.json` references real page files and tab icons.
- Create `pages/home/*`: home tab landing page with summary and shortcuts.
- Create `pages/coupons/*`: cash coupon asset page.
- Create `pages/exchange/*`: exchange merchant benefits page.
- Create `pages/lottery/*`: four-digit lottery page.
- Create `pages/profile/*`: profile tab page.
- Create `pages/exchange-records/*`: exchange records page.
- Create `pages/coupon-code/*`: coupon code page.
- Create `pages/lottery-records/*`: lottery records page.
- Create `pages/rules/*`: rules page.

## Task 1: Project Skeleton And Config Validation

**Files:**
- Create: `project.config.json`
- Create: `sitemap.json`
- Create: `app.json`
- Create: `app.js`
- Create: `app.wxss`
- Create: `tests/config.test.js`
- Create directories: `pages/home`, `pages/coupons`, `pages/exchange`, `pages/lottery`, `pages/profile`, `pages/exchange-records`, `pages/coupon-code`, `pages/lottery-records`, `pages/rules`, `assets/icons`, `assets/images`, `data`, `utils`, `tests`

- [ ] **Step 1: Write the failing config test**

Create `tests/config.test.js`:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.join(root, filePath), 'utf8'));
}

test('app.json registers required pages and tab bar assets', () => {
  const app = readJson('app.json');
  const requiredPages = [
    'pages/home/index',
    'pages/coupons/index',
    'pages/exchange/index',
    'pages/lottery/index',
    'pages/profile/index',
    'pages/exchange-records/index',
    'pages/coupon-code/index',
    'pages/lottery-records/index',
    'pages/rules/index',
  ];

  assert.deepEqual(app.pages, requiredPages);
  assert.equal(app.tabBar.list.length, 5);

  for (const page of requiredPages) {
    for (const ext of ['js', 'json', 'wxml', 'wxss']) {
      assert.equal(fs.existsSync(path.join(root, `${page}.${ext}`)), true, `${page}.${ext} exists`);
    }
  }

  for (const item of app.tabBar.list) {
    assert.equal(fs.existsSync(path.join(root, item.iconPath)), true, `${item.iconPath} exists`);
    assert.equal(fs.existsSync(path.join(root, item.selectedIconPath)), true, `${item.selectedIconPath} exists`);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/config.test.js`

Expected: FAIL with `ENOENT` for `app.json` because the project skeleton does not exist yet.

- [ ] **Step 3: Create minimal app configuration and page starter files**

Create `app.json`:

```json
{
  "pages": [
    "pages/home/index",
    "pages/coupons/index",
    "pages/exchange/index",
    "pages/lottery/index",
    "pages/profile/index",
    "pages/exchange-records/index",
    "pages/coupon-code/index",
    "pages/lottery-records/index",
    "pages/rules/index"
  ],
  "window": {
    "navigationBarBackgroundColor": "#ffffff",
    "navigationBarTextStyle": "black",
    "navigationStyle": "custom",
    "backgroundColor": "#f7fbfb"
  },
  "tabBar": {
    "color": "#6f7d8c",
    "selectedColor": "#006b68",
    "backgroundColor": "#ffffff",
    "borderStyle": "white",
    "list": [
      {
        "pagePath": "pages/home/index",
        "text": "首页",
        "iconPath": "assets/icons/home.svg",
        "selectedIconPath": "assets/icons/home-active.svg"
      },
      {
        "pagePath": "pages/coupons/index",
        "text": "现金券",
        "iconPath": "assets/icons/ticket.svg",
        "selectedIconPath": "assets/icons/ticket-active.svg"
      },
      {
        "pagePath": "pages/exchange/index",
        "text": "置换",
        "iconPath": "assets/icons/exchange.svg",
        "selectedIconPath": "assets/icons/exchange-active.svg"
      },
      {
        "pagePath": "pages/lottery/index",
        "text": "抽奖",
        "iconPath": "assets/icons/gift.svg",
        "selectedIconPath": "assets/icons/gift-active.svg"
      },
      {
        "pagePath": "pages/profile/index",
        "text": "我的",
        "iconPath": "assets/icons/user.svg",
        "selectedIconPath": "assets/icons/user-active.svg"
      }
    ]
  },
  "style": "v2",
  "lazyCodeLoading": "requiredComponents"
}
```

Create `project.config.json`:

```json
{
  "description": "现金券项目 C 端微信小程序",
  "packOptions": {
    "ignore": [
      {
        "type": "folder",
        "value": "docs"
      },
      {
        "type": "folder",
        "value": "tests"
      },
      {
        "type": "folder",
        "value": "_reference"
      }
    ]
  },
  "setting": {
    "urlCheck": false,
    "es6": true,
    "postcss": true,
    "minified": true
  },
  "compileType": "miniprogram",
  "libVersion": "3.8.8",
  "appid": "touristappid",
  "projectname": "cash-coupon-mini-program"
}
```

Create `sitemap.json`:

```json
{
  "rules": [
    {
      "action": "allow",
      "page": "*"
    }
  ]
}
```

Create `app.js`:

```js
App({
  globalData: {
    themeColor: '#006b68',
    city: '海口',
  },
});
```

Create `app.wxss` with global tokens:

```css
page {
  background: #f7fbfb;
  color: #071827;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 28rpx;
  letter-spacing: 0;
}

.page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 48rpx 32rpx 32rpx;
}

.nav-title {
  min-height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34rpx;
  font-weight: 700;
}

.card {
  background: rgba(255, 255, 255, 0.96);
  border: 1rpx solid #d4e8e8;
  border-radius: 24rpx;
  box-shadow: 0 16rpx 40rpx rgba(9, 48, 55, 0.06);
}

.primary-btn {
  height: 88rpx;
  border-radius: 20rpx;
  background: #006b68;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  font-weight: 700;
}

.outline-btn {
  height: 72rpx;
  border: 2rpx solid #006b68;
  border-radius: 18rpx;
  color: #006b68;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.tag {
  display: inline-flex;
  align-items: center;
  min-height: 40rpx;
  padding: 0 16rpx;
  border-radius: 10rpx;
  background: #eef3f4;
  color: #657282;
  font-size: 22rpx;
  white-space: nowrap;
}
```

For each page directory, create starter `index.json`, `index.js`, `index.wxml`, and `index.wxss`. Use this pattern, changing only `navigationBarTitleText`:

```json
{
  "navigationBarTitleText": "现金券"
}
```

```js
Page({});
```

```xml
<view class="page">
  <view class="nav-title">现金券</view>
</view>
```

```css
/* Page-specific styles are added in later tasks. */
```

Create each tab icon as a compact SVG with stroke color `#6f7d8c`; create active variants using `#006b68`. Use the same simple 48x48 viewBox for all icons:

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <path d="M8 23L24 10L40 23V40H29V29H19V40H8V23Z" stroke="#6f7d8c" stroke-width="3" stroke-linejoin="round"/>
</svg>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/config.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add app.json app.js app.wxss project.config.json sitemap.json pages assets tests/config.test.js
git commit -m "chore: scaffold mini program shell"
```

## Task 2: Formatting Helpers

**Files:**
- Create: `utils/format.js`
- Create: `tests/format.test.js`

- [ ] **Step 1: Write failing formatter tests**

Create `tests/format.test.js`:

```js
const assert = require('node:assert/strict');
const test = require('node:test');
const {
  formatMoney,
  formatCouponValue,
  formatDateTime,
  getStatusLabel,
  padFourDigits,
} = require('../utils/format');

test('formatMoney keeps integer yuan compact', () => {
  assert.equal(formatMoney(328), '¥328');
  assert.equal(formatMoney(68.5), '¥68.50');
});

test('formatCouponValue describes threshold coupons', () => {
  assert.equal(formatCouponValue({ threshold: 100, amount: 30 }), '满100减30');
  assert.equal(formatCouponValue({ threshold: 0, amount: 20 }), '立减20');
});

test('formatDateTime normalizes display dates', () => {
  assert.equal(formatDateTime('2026-06-30T23:59:00+08:00'), '2026-06-30 23:59');
});

test('getStatusLabel maps known statuses', () => {
  assert.deepEqual(getStatusLabel('unused'), { text: '未使用', tone: 'success' });
  assert.deepEqual(getStatusLabel('pending'), { text: '待商家确认', tone: 'warning' });
  assert.deepEqual(getStatusLabel('expired'), { text: '已失效', tone: 'muted' });
});

test('padFourDigits always returns a four digit string', () => {
  assert.equal(padFourDigits(8), '0008');
  assert.equal(padFourDigits(3806), '3806');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/format.test.js`

Expected: FAIL with `Cannot find module '../utils/format'`.

- [ ] **Step 3: Implement formatter helpers**

Create `utils/format.js`:

```js
function formatMoney(value) {
  const amount = Number(value || 0);
  if (Number.isInteger(amount)) {
    return `¥${amount}`;
  }
  return `¥${amount.toFixed(2)}`;
}

function formatCouponValue(coupon) {
  const threshold = Number(coupon.threshold || 0);
  const amount = Number(coupon.amount || 0);
  if (threshold > 0) {
    return `满${threshold}减${amount}`;
  }
  return `立减${amount}`;
}

function formatDateTime(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function getStatusLabel(status) {
  const labels = {
    unused: { text: '未使用', tone: 'success' },
    used: { text: '已使用', tone: 'muted' },
    expired: { text: '已失效', tone: 'muted' },
    pending: { text: '待商家确认', tone: 'warning' },
    completed: { text: '已完成', tone: 'success' },
    returned: { text: '已退回', tone: 'muted' },
  };
  return labels[status] || { text: '未知', tone: 'muted' };
}

function padFourDigits(value) {
  return String(Number(value || 0)).padStart(4, '0').slice(-4);
}

module.exports = {
  formatMoney,
  formatCouponValue,
  formatDateTime,
  getStatusLabel,
  padFourDigits,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/format.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add utils/format.js tests/format.test.js
git commit -m "test: add cash coupon formatting helpers"
```

## Task 3: Mock Data And Service Layer

**Files:**
- Create: `data/mock.js`
- Create: `utils/mock-service.js`
- Create: `tests/mock-service.test.js`

- [ ] **Step 1: Write failing service tests**

Create `tests/mock-service.test.js`:

```js
const assert = require('node:assert/strict');
const test = require('node:test');
const service = require('../utils/mock-service');

test('getCouponSummary counts available, used, expiring and value', () => {
  service.resetMockState();
  const summary = service.getCouponSummary();
  assert.equal(summary.availableCount, 12);
  assert.equal(summary.totalValue, 328);
  assert.equal(summary.usedCount, 8);
  assert.equal(summary.expiringCount, 2);
});

test('getCoupons filters by category and expiry bucket', () => {
  service.resetMockState();
  assert.equal(service.getCoupons('餐饮').every((coupon) => coupon.category === '餐饮'), true);
  assert.equal(service.getCoupons('即将过期').every((coupon) => coupon.isExpiring), true);
});

test('submitLottery consumes one chance and appends a record', () => {
  service.resetMockState();
  const before = service.getLotteryState();
  const result = service.submitLottery('3806');
  const after = service.getLotteryState();

  assert.equal(result.ok, true);
  assert.equal(after.todayLeft, before.todayLeft - 1);
  assert.equal(service.getLotteryRecords()[0].number, '3806');
});

test('submitLottery rejects incomplete number and exhausted chances', () => {
  service.resetMockState();
  assert.equal(service.submitLottery('38').ok, false);
  service.submitLottery('1111');
  assert.equal(service.submitLottery('2222').ok, false);
});

test('createExchangeRecord appends pending record', () => {
  service.resetMockState();
  const result = service.createExchangeRecord('merchant-1');
  assert.equal(result.ok, true);
  assert.equal(service.getExchangeRecords('待确认')[0].status, 'pending');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/mock-service.test.js`

Expected: FAIL with `Cannot find module '../utils/mock-service'`.

- [ ] **Step 3: Create mock data**

Create `data/mock.js`:

```js
const userProfile = {
  nickname: '海口生活用户',
  city: '海口',
  district: '龙华区',
  avatar: '/assets/images/profile.svg',
  savedAmount: 236,
  couponCount: 12,
  lotteryLeft: 1,
  expiringCount: 2,
  exchangeAmount: 860,
};

const coupons = [
  {
    id: 'coupon-1',
    title: '骑楼老街美食券',
    category: '餐饮',
    amount: 30,
    threshold: 100,
    tags: ['餐饮美食', '通用券'],
    expiresAt: '2026-06-30T23:59:00+08:00',
    status: 'unused',
    source: 'lottery',
    store: '骑楼老街联盟商户',
    code: '836209485170',
    isExpiring: false,
  },
  {
    id: 'coupon-2',
    title: '海口湾下午茶券',
    category: '餐饮',
    amount: 20,
    threshold: 0,
    tags: ['休闲饮品', '仅限饮品类'],
    expiresAt: '2026-06-25T23:59:00+08:00',
    status: 'unused',
    source: 'self',
    store: '海口湾甜品店',
    code: '561802479331',
    isExpiring: true,
  },
  {
    id: 'coupon-3',
    title: '亲子乐园通用券',
    category: '娱乐',
    amount: 60,
    threshold: 200,
    tags: ['亲子乐园', '周末节假日可用'],
    expiresAt: '2026-07-05T23:59:00+08:00',
    status: 'unused',
    source: 'lottery',
    store: '欢乐童年亲子乐园',
    code: '729184650128',
    isExpiring: false,
  }
];

const merchantBenefits = [
  {
    id: 'merchant-1',
    name: '海岛小院',
    store: '海岛小院龙华店',
    category: '餐饮美食',
    district: '龙华区',
    image: '/assets/images/merchant-restaurant.svg',
    exchangeAmount: 300,
    description: '双人套餐券，到店核销',
  },
  {
    id: 'merchant-2',
    name: '海口湾甜品',
    store: '海口湾甜品店',
    category: '甜品饮品',
    district: '秀英区',
    image: '/assets/images/merchant-dessert.svg',
    exchangeAmount: 120,
    description: '下午茶券，门店通用',
  },
  {
    id: 'merchant-3',
    name: '亲子乐园',
    store: '欢乐童年亲子乐园',
    category: '亲子娱乐',
    district: '美兰区',
    image: '/assets/images/merchant-playground.svg',
    exchangeAmount: 500,
    description: '门票券，指定门店可用',
  }
];

const exchangeRecords = [
  {
    id: 'exchange-1',
    title: '海岛小院置换申请',
    merchant: '海岛小院龙华店',
    appliedAt: '2026-06-17T14:20:00+08:00',
    amount: 300,
    status: 'pending',
  },
  {
    id: 'exchange-2',
    title: '海口湾下午茶置换',
    merchant: '海口湾甜品店',
    appliedAt: '2026-06-16T10:35:00+08:00',
    completedAt: '2026-06-16T11:42:00+08:00',
    amount: 120,
    status: 'completed',
  },
  {
    id: 'exchange-3',
    title: '亲子乐园置换',
    merchant: '欢乐童年亲子乐园',
    appliedAt: '2026-06-13T16:18:00+08:00',
    expiredAt: '2026-06-13T19:18:00+08:00',
    amount: 500,
    status: 'expired',
    reason: '超时退回',
  }
];

const lotteryState = {
  city: '海口',
  todayLeft: 1,
  prize: '同城通用现金券',
  drawTime: '20:00',
  range: '0000-9999',
  currentNumber: '3806',
};

const lotteryRecords = [
  {
    id: 'lottery-1',
    number: '1288',
    prize: '海口湾下午茶券',
    amount: 30,
    createdAt: '2026-06-17T09:30:00+08:00',
  }
];

const activityItems = [
  {
    id: 'activity-1',
    type: 'lottery',
    title: '抽奖获券',
    subtitle: '获得 海口湾下午茶券',
    value: '+ ¥30',
    time: '今天 09:30',
  },
  {
    id: 'activity-2',
    type: 'coupon',
    title: '使用现金券抵扣',
    subtitle: '海岛小院 · 双人海鲜套餐券',
    value: '- ¥68',
    time: '昨天 18:42',
  },
  {
    id: 'activity-3',
    type: 'exchange',
    title: '置换申请待确认',
    subtitle: '向 海岛小院龙华店 申请置换 300 额度',
    value: '待确认',
    time: '06-16 14:20',
  }
];

module.exports = {
  userProfile,
  coupons,
  merchantBenefits,
  exchangeRecords,
  lotteryState,
  lotteryRecords,
  activityItems,
};
```

- [ ] **Step 4: Implement mock service**

Create `utils/mock-service.js`:

```js
const seed = require('../data/mock');
const { padFourDigits } = require('./format');

let state;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function resetMockState() {
  state = clone(seed);
}

resetMockState();

function getUserProfile() {
  return clone(state.userProfile);
}

function getCouponSummary() {
  const available = state.coupons.filter((coupon) => coupon.status === 'unused');
  return {
    availableCount: 12,
    totalValue: 328,
    usedCount: 8,
    expiringCount: state.coupons.filter((coupon) => coupon.isExpiring).length,
    lotteryCount: 7,
    selfCount: 5,
  };
}

function getCoupons(category = '全部') {
  if (category === '全部') {
    return clone(state.coupons);
  }
  if (category === '即将过期') {
    return clone(state.coupons.filter((coupon) => coupon.isExpiring));
  }
  return clone(state.coupons.filter((coupon) => coupon.category === category));
}

function getCouponById(id) {
  return clone(state.coupons.find((coupon) => coupon.id === id) || state.coupons[0]);
}

function getMerchantBenefits() {
  return clone(state.merchantBenefits);
}

function getLotteryState() {
  return clone(state.lotteryState);
}

function getLotteryRecords() {
  return clone(state.lotteryRecords);
}

function submitLottery(number) {
  const normalized = String(number || '');
  if (!/^\\d{4}$/.test(normalized)) {
    return { ok: false, message: '请输入完整四位数' };
  }
  if (state.lotteryState.todayLeft <= 0) {
    return { ok: false, message: '今日次数已用完' };
  }

  state.lotteryState.todayLeft -= 1;
  state.lotteryState.currentNumber = normalized;
  state.lotteryRecords.unshift({
    id: `lottery-${Date.now()}`,
    number: normalized,
    prize: state.lotteryState.prize,
    amount: 30,
    createdAt: new Date().toISOString(),
  });

  return { ok: true, message: '参与成功，开奖记录可在个人中心查看' };
}

function generateLotteryNumber() {
  const next = padFourDigits(Math.floor(Math.random() * 10000));
  state.lotteryState.currentNumber = next;
  return next;
}

function getExchangeRecords(filter = '全部') {
  const map = {
    待确认: 'pending',
    已完成: 'completed',
    已失效: 'expired',
  };
  if (filter === '全部') {
    return clone(state.exchangeRecords);
  }
  return clone(state.exchangeRecords.filter((record) => record.status === map[filter]));
}

function getExchangeStats() {
  return {
    pending: state.exchangeRecords.filter((record) => record.status === 'pending').length,
    completed: state.exchangeRecords.filter((record) => record.status === 'completed').length,
    returned: state.exchangeRecords.filter((record) => record.status === 'returned').length,
  };
}

function createExchangeRecord(merchantId) {
  const merchant = state.merchantBenefits.find((item) => item.id === merchantId);
  if (!merchant) {
    return { ok: false, message: '未找到可置换商家' };
  }
  if (state.userProfile.exchangeAmount < merchant.exchangeAmount) {
    return { ok: false, message: '可置换额度不足' };
  }
  state.exchangeRecords.unshift({
    id: `exchange-${Date.now()}`,
    title: `${merchant.name}置换申请`,
    merchant: merchant.store,
    appliedAt: new Date().toISOString(),
    amount: merchant.exchangeAmount,
    status: 'pending',
  });
  return { ok: true, message: '已提交置换申请，请等待商家确认' };
}

function getActivityItems() {
  return clone(state.activityItems);
}

module.exports = {
  resetMockState,
  getUserProfile,
  getCouponSummary,
  getCoupons,
  getCouponById,
  getMerchantBenefits,
  getLotteryState,
  getLotteryRecords,
  submitLottery,
  generateLotteryNumber,
  getExchangeRecords,
  getExchangeStats,
  createExchangeRecord,
  getActivityItems,
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test tests/mock-service.test.js`

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add data/mock.js utils/mock-service.js tests/mock-service.test.js
git commit -m "test: add mock cash coupon service"
```

## Task 4: Shared Assets And Visual Foundation

**Files:**
- Modify: `app.wxss`
- Create: `assets/images/profile.svg`
- Create: `assets/images/merchant-restaurant.svg`
- Create: `assets/images/merchant-dessert.svg`
- Create: `assets/images/merchant-playground.svg`

- [ ] **Step 1: Extend visual foundation**

Append shared utility classes to `app.wxss`:

```css
.top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
}

.muted {
  color: #657282;
}

.accent {
  color: #e85235;
}

.stat-number {
  color: #006b68;
  font-size: 56rpx;
  font-weight: 800;
  line-height: 1;
}

.divider {
  height: 1rpx;
  background: #e4eeee;
}

.empty {
  padding: 72rpx 24rpx;
  text-align: center;
  color: #7a8795;
}

.icon-circle {
  width: 108rpx;
  height: 108rpx;
  border-radius: 54rpx;
  background: #e9f5f4;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #006b68;
  font-size: 48rpx;
}
```

Create the image SVGs as compact development illustrations in teal and pale neutral tones. `merchant-restaurant.svg` should show a simple storefront/table scene, `merchant-dessert.svg` a plate/cup, `merchant-playground.svg` a slide, and `profile.svg` a bridge/sea circle. Keep each SVG under 5 KB.

- [ ] **Step 2: Run all current tests**

Run: `node --test tests/*.test.js`

Expected: PASS.

- [ ] **Step 3: Commit**

Run:

```bash
git add app.wxss assets/images
git commit -m "style: add mini program visual foundation"
```

## Task 5: Cash Coupon Assets Page

**Files:**
- Modify: `pages/coupons/index.js`
- Modify: `pages/coupons/index.wxml`
- Modify: `pages/coupons/index.wxss`
- Modify: `pages/coupons/index.json`

- [ ] **Step 1: Implement page data loading and actions**

Use `mock-service` and `format` in `pages/coupons/index.js`:

```js
const service = require('../../utils/mock-service');
const { formatCouponValue, formatDateTime, getStatusLabel } = require('../../utils/format');

const tabs = ['全部', '餐饮', '娱乐', '即将过期'];

Page({
  data: {
    summary: {},
    tabs,
    activeTab: '全部',
    coupons: [],
  },

  onLoad() {
    this.loadCoupons();
  },

  onShow() {
    this.loadCoupons();
  },

  loadCoupons() {
    const coupons = service.getCoupons(this.data.activeTab).map((coupon) => ({
      ...coupon,
      valueText: formatCouponValue(coupon),
      expiresText: `${formatDateTime(coupon.expiresAt)} 到期`,
      statusLabel: getStatusLabel(coupon.status),
    }));
    this.setData({
      summary: service.getCouponSummary(),
      coupons,
    });
  },

  switchTab(event) {
    this.setData({ activeTab: event.currentTarget.dataset.tab }, () => this.loadCoupons());
  },

  goUse(event) {
    wx.navigateTo({
      url: `/pages/coupon-code/index?id=${event.currentTarget.dataset.id}`,
    });
  },

  goExchange() {
    wx.switchTab({ url: '/pages/exchange/index' });
  },
});
```

- [ ] **Step 2: Implement WXML**

Create a summary card, segmented tabs, coupon list, and exchange banner in `pages/coupons/index.wxml`. Bind `summary.availableCount`, `summary.totalValue`, `summary.usedCount`, `summary.expiringCount`, `summary.lotteryCount`, `summary.selfCount`, `coupons`, and the `goUse`/`goExchange` handlers. Use `wx:if` for empty state.

- [ ] **Step 3: Implement WXSS**

Style the page to match `image 5.png`: centered title, top stat card, pill segmented tabs, large coupon rows with icon circle, orange value text, teal action button, and bottom exchange banner. Keep list row heights stable with explicit image/icon sizes.

- [ ] **Step 4: Run tests**

Run: `node --test tests/*.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add pages/coupons
git commit -m "feat: build coupon assets page"
```

## Task 6: Coupon Code Page

**Files:**
- Modify: `pages/coupon-code/index.js`
- Modify: `pages/coupon-code/index.wxml`
- Modify: `pages/coupon-code/index.wxss`
- Modify: `pages/coupon-code/index.json`

- [ ] **Step 1: Implement coupon lookup and dynamic code refresh**

Use this behavior in `pages/coupon-code/index.js`:

```js
const service = require('../../utils/mock-service');
const { formatMoney, formatDateTime, getStatusLabel } = require('../../utils/format');

Page({
  data: {
    coupon: {},
    statusLabel: {},
    refreshedCode: '',
  },

  onLoad(options) {
    const coupon = service.getCouponById(options.id);
    this.setData({
      coupon: {
        ...coupon,
        amountText: formatMoney(coupon.amount),
        expiresText: formatDateTime(coupon.expiresAt),
      },
      statusLabel: getStatusLabel(coupon.status),
      refreshedCode: coupon.code,
    });
    this.timer = setInterval(() => this.refreshCode(), 60000);
  },

  onUnload() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  },

  refreshCode() {
    const suffix = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    this.setData({ refreshedCode: `${this.data.coupon.code.slice(0, 8)}${suffix}` });
  },

  goBack() {
    wx.navigateBack();
  },
});
```

- [ ] **Step 2: Implement WXML**

Build the card shown in `image 7.png`: top coupon merchant card, central QR development pattern, coupon code with copy icon text, refresh hint, detail rows for store/expiry/discount, primary bright-screen button, and outline return button.

- [ ] **Step 3: Implement WXSS**

Use a CSS-generated QR development pattern rather than a bitmap. Ensure it is square, centered, and does not resize with code text.

- [ ] **Step 4: Run tests**

Run: `node --test tests/*.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add pages/coupon-code
git commit -m "feat: add coupon code display page"
```

## Task 7: Lottery Page And Records

**Files:**
- Modify: `pages/lottery/index.js`
- Modify: `pages/lottery/index.wxml`
- Modify: `pages/lottery/index.wxss`
- Modify: `pages/lottery/index.json`
- Modify: `pages/lottery-records/index.js`
- Modify: `pages/lottery-records/index.wxml`
- Modify: `pages/lottery-records/index.wxss`
- Modify: `pages/lottery-records/index.json`

- [ ] **Step 1: Implement lottery page behavior**

Use `generateLotteryNumber`, `submitLottery`, and `getLotteryState`. Split the current number into four boxes. Disable submit if the number is incomplete or `todayLeft` is `0`. Show `wx.showToast` with service result messages.

- [ ] **Step 2: Implement lottery page UI**

Match `image 3.png`: location/rules top row, centered title/subtitle, four number boxes, random generation row, primary submit button, consent note, four info tiles, records banner, and bottom tab.

- [ ] **Step 3: Implement lottery records page**

Read `service.getLotteryRecords()`, render prize, number, amount, and created time in a simple record list. Add empty state if no records exist.

- [ ] **Step 4: Run tests**

Run: `node --test tests/*.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add pages/lottery pages/lottery-records
git commit -m "feat: build lottery flow"
```

## Task 8: Exchange Page And Exchange Records

**Files:**
- Modify: `pages/exchange/index.js`
- Modify: `pages/exchange/index.wxml`
- Modify: `pages/exchange/index.wxss`
- Modify: `pages/exchange/index.json`
- Modify: `pages/exchange-records/index.js`
- Modify: `pages/exchange-records/index.wxml`
- Modify: `pages/exchange-records/index.wxss`
- Modify: `pages/exchange-records/index.json`

- [ ] **Step 1: Implement exchange page behavior**

Load `userProfile` and `merchantBenefits`. On `createExchangeRecord`, call the service, show a toast, and navigate to `/pages/exchange-records/index` on success.

- [ ] **Step 2: Implement exchange page UI**

Match `image 4.png`: title/location row, stat card with available exchange amount and coupon counts, helper row, merchant benefits card, merchant images, category/district tags, large teal exchange icon/action region.

- [ ] **Step 3: Implement exchange records behavior**

Load stats from `getExchangeStats()`, use tabs `全部`、`待确认`、`已完成`、`已失效`, and call `getExchangeRecords(activeTab)` for the list.

- [ ] **Step 4: Implement exchange records UI**

Match `image 6.png`: back arrow, filter text, status summary card, segmented tabs, record card with status pills, amount, detail buttons, and refund notice row.

- [ ] **Step 5: Run tests**

Run: `node --test tests/*.test.js`

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add pages/exchange pages/exchange-records
git commit -m "feat: build exchange flow"
```

## Task 9: Profile And Home Pages

**Files:**
- Modify: `pages/profile/index.js`
- Modify: `pages/profile/index.wxml`
- Modify: `pages/profile/index.wxss`
- Modify: `pages/profile/index.json`
- Modify: `pages/home/index.js`
- Modify: `pages/home/index.wxml`
- Modify: `pages/home/index.wxss`
- Modify: `pages/home/index.json`

- [ ] **Step 1: Implement profile page**

Load `getUserProfile()`, `getActivityItems()`, and `getCouponSummary()`. Render the user header, saved amount, stat row, recent activity list, and menu links shown in `image 8.png`.

- [ ] **Step 2: Add profile navigation actions**

Wire menu items:

```js
goCoupons() {
  wx.switchTab({ url: '/pages/coupons/index' });
},
goLotteryRecords() {
  wx.navigateTo({ url: '/pages/lottery-records/index' });
},
goExchangeRecords() {
  wx.navigateTo({ url: '/pages/exchange-records/index' });
}
```

- [ ] **Step 3: Implement home page**

Create a functional first tab with city, user savings, quick actions, nearby benefits, and latest coupon preview. Reuse the same mock data, and navigate to existing tabs/pages. Keep it compact and operational rather than a marketing hero.

- [ ] **Step 4: Run tests**

Run: `node --test tests/*.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add pages/profile pages/home
git commit -m "feat: add profile and home tabs"
```

## Task 10: Rules Page And Final Validation

**Files:**
- Modify: `pages/rules/index.js`
- Modify: `pages/rules/index.wxml`
- Modify: `pages/rules/index.wxss`
- Modify: `pages/rules/index.json`
- Modify: `README.md`

- [ ] **Step 1: Implement rules page**

Create a plain rules page covering lottery participation, cash coupon usage, exchange confirmation, and mock-data disclaimer for development preview.

- [ ] **Step 2: Add README**

Create `README.md` with:

```md
# 现金券微信小程序 C 端首版

原生微信小程序项目，可在微信开发者工具中打开。首版使用本地 mock 数据实现现金券、抽奖、置换、券码和我的页面闭环。

## 打开方式

1. 使用微信开发者工具导入当前目录。
2. AppID 可选择测试号或使用项目内 `touristappid` 预览。
3. 编译后从底部 Tab 进入各页面。

## 本地验证

```bash
node --test tests/*.test.js
```

## 说明

当前版本不包含真实支付、真实核销、真实退款和后端接口。业务数据集中在 `data/mock.js`，页面通过 `utils/mock-service.js` 读取，后续可替换为接口请求。
```

- [ ] **Step 3: Run automated tests**

Run: `node --test tests/*.test.js`

Expected: PASS with all test files.

- [ ] **Step 4: Validate JSON files parse**

Run:

```powershell
Get-ChildItem -Recurse -Filter *.json | ForEach-Object { Get-Content -Raw -LiteralPath $_.FullName | ConvertFrom-Json | Out-Null; Write-Output "OK $($_.FullName)" }
```

Expected: all JSON files print `OK`.

- [ ] **Step 5: Inspect git status**

Run: `git status --short`

Expected: only intentional untracked `_reference/` remains, or a clean tree if `_reference/` is removed or ignored.

- [ ] **Step 6: Commit**

Run:

```bash
git add pages/rules README.md
git commit -m "docs: add rules page and preview instructions"
```

## Self-Review Notes

- Spec coverage: The plan covers all approved C-side pages, mock data, service boundaries, lottery submission, coupon filtering, exchange records, coupon code display, profile, and validation.
- Placeholder scan: No task depends on undefined later work; mock data, state methods, and page actions are specified before pages consume them.
- Type consistency: Status values are `unused`, `used`, `expired`, `pending`, `completed`, and `returned`; filters map Chinese tab labels to those values consistently.
- Scope control: Merchant backend, platform backend, payment, real QR verification, refunds, and database work remain outside the implementation plan.
