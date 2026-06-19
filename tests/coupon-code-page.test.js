const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const rootDir = path.join(__dirname, '..');

function readProjectFile(filePath) {
  return fs.readFileSync(path.join(rootDir, filePath), 'utf8');
}

function readCssRule(css, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escapedSelector}\\s*{([^}]*)}`, 's'));

  assert.ok(match, `Expected ${selector} rule to exist`);

  return match[1].replace(/\s+/g, ' ');
}

function readTagWithClass(markup, className) {
  const escapedClassName = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = markup.match(new RegExp(`<[^>]+class="[^"]*\\b${escapedClassName}\\b[^"]*"[^>]*>`, 's'));

  assert.ok(match, `Expected element with ${className} class to exist`);

  return match[0];
}

function loadCouponCodePage() {
  const pagePath = path.join(rootDir, 'pages/coupon-code/index.js');
  const previousPage = global.Page;
  const previousWx = global.wx;
  const previousSetInterval = global.setInterval;
  const previousClearInterval = global.clearInterval;
  const intervals = [];
  const clearedIntervals = [];
  let page;

  delete require.cache[require.resolve(pagePath)];

  global.Page = (definition) => {
    page = {
      ...definition,
      data: JSON.parse(JSON.stringify(definition.data || {})),
      setData(update) {
        this.data = {
          ...this.data,
          ...update,
        };
      },
    };
  };

  global.wx = {
    showToast() {},
    switchTab() {},
    navigateBack() {},
  };

  global.setInterval = (callback, delay) => {
    const timer = {
      callback,
      delay,
    };

    intervals.push(timer);

    return timer;
  };

  global.clearInterval = (timer) => {
    clearedIntervals.push(timer);
  };

  require(pagePath);

  assert.ok(page, 'Expected coupon code page to register with Page');

  return {
    page,
    intervals,
    clearedIntervals,
    restore() {
      global.Page = previousPage;
      global.wx = previousWx;
      global.setInterval = previousSetInterval;
      global.clearInterval = previousClearInterval;
      delete require.cache[require.resolve(pagePath)];
    },
  };
}

test('coupon code page exposes lookup, refresh behavior and display structure', () => {
  const js = readProjectFile('pages/coupon-code/index.js');
  const wxml = readProjectFile('pages/coupon-code/index.wxml');
  const wxss = readProjectFile('pages/coupon-code/index.wxss');

  for (const symbol of [
    'getCouponLookup',
    'formatMoney',
    'formatDateTime',
    'getStatusLabel',
    'refreshCode',
    'setInterval',
    'clearInterval',
    'onHide',
    'onShow',
  ]) {
    assert.match(js, new RegExp(symbol));
  }

  for (const text of [
    '到店出示核销码',
    '券码',
    '打开亮屏模式',
    '返回订单',
  ]) {
    assert.match(wxml, new RegExp(text));
  }

  assert.match(wxml, /每\s*60\s*秒自动刷新/);
  assert.match(wxml, /class="[^"]*\bqr-pattern\b/);

  const qrRule = readCssRule(wxss, '.qr-pattern');
  const width = qrRule.match(/width:\s*([0-9.]+rpx)/);
  const height = qrRule.match(/height:\s*([0-9.]+rpx)/);

  assert.ok(width, 'Expected .qr-pattern to declare a stable width');
  assert.ok(height, 'Expected .qr-pattern to declare a stable height');
  assert.equal(height[1], width[1], 'Expected .qr-pattern to be square');
});

test('coupon code page gives tappable nav controls button semantics', () => {
  const wxml = readProjectFile('pages/coupon-code/index.wxml');

  assert.match(readTagWithClass(wxml, 'nav-back'), /\brole="button"/);
  assert.match(readTagWithClass(wxml, 'nav-rule'), /\brole="button"/);
});

test('coupon code page pauses refresh while hidden and resumes on show', () => {
  const runtime = loadCouponCodePage();

  try {
    const { page, intervals, clearedIntervals } = runtime;

    assert.equal(typeof page.onHide, 'function');
    assert.equal(typeof page.onShow, 'function');

    page.onLoad({ id: 'coupon-qilou-food' });

    assert.equal(intervals.length, 1);
    assert.equal(intervals[0].delay, 60000);

    const firstTimer = page._refreshTimer;

    page.onHide();

    assert.deepEqual(clearedIntervals, [firstTimer]);
    assert.equal(page._refreshTimer, null);

    page.onShow();

    assert.equal(intervals.length, 2);
    assert.equal(page._refreshTimer, intervals[1]);

    page.onShow();

    assert.equal(intervals.length, 2, 'Expected onShow not to stack refresh timers');
  } finally {
    runtime.restore();
  }
});
