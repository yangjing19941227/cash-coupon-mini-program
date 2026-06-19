const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const rootDir = path.join(__dirname, '..');

function readProjectFile(filePath) {
  return fs.readFileSync(path.join(rootDir, filePath), 'utf8');
}

function assertIncludesAll(source, expectedTexts) {
  for (const text of expectedTexts) {
    assert.match(source, new RegExp(text), `includes "${text}"`);
  }
}

function createRulesPageHarness(wxOverrides = {}) {
  const jsPath = path.join(rootDir, 'pages/rules/index.js');
  const js = fs.readFileSync(jsPath, 'utf8');
  const calls = {
    navigateBack: [],
    switchTab: [],
    reLaunch: [],
  };
  let pageDefinition;

  const wx = {
    navigateBack(payload) {
      calls.navigateBack.push(payload);
      if (payload && typeof payload.fail === 'function') {
        payload.fail();
      }
    },
    switchTab(payload) {
      calls.switchTab.push(payload);
    },
    reLaunch(payload) {
      calls.reLaunch.push(payload);
    },
    ...wxOverrides,
  };

  const context = {
    Page(definition) {
      pageDefinition = definition;
    },
    wx,
  };

  vm.runInNewContext(js, context, { filename: jsPath });

  return { calls, page: pageDefinition };
}

test('rules page documents lottery, cash coupon, exchange and mock-data rules', () => {
  const wxml = readProjectFile('pages/rules/index.wxml');

  assertIncludesAll(wxml, [
    '抽奖参与',
    '四位数字',
    '优惠券使用',
    '到店核销',
    '置换确认',
    '商家确认',
    '开发预览',
    '模拟数据',
  ]);
});

test('rules page back handler guards wx navigation and falls back to tabs', () => {
  const { calls, page } = createRulesPageHarness();

  assert.equal(typeof page.goBack, 'function');

  page.goBack();

  assert.equal(calls.navigateBack.length, 1);
  assert.deepEqual(calls.navigateBack[0].delta, 1);
  assert.equal(calls.switchTab[0].url, '/pages/lottery/index');
  assert.equal(typeof calls.switchTab[0].fail, 'function');
  calls.switchTab[0].fail();
  assert.equal(calls.switchTab[1].url, '/pages/home/index');

  const noNavigateBack = createRulesPageHarness({ navigateBack: undefined });
  noNavigateBack.page.goBack();

  assert.equal(noNavigateBack.calls.switchTab[0].url, '/pages/lottery/index');
  assert.equal(typeof noNavigateBack.calls.switchTab[0].fail, 'function');

  const noTabApis = createRulesPageHarness({
    navigateBack: undefined,
    switchTab: undefined,
  });
  noTabApis.page.goBack();

  assert.equal(noTabApis.calls.reLaunch[0].url, '/pages/home/index');
});

test('README explains preview opening, verification and excluded production services', () => {
  const readmePath = path.join(rootDir, 'README.md');

  assert.equal(fs.existsSync(readmePath), true, 'README.md exists');

  const readme = fs.readFileSync(readmePath, 'utf8');

  assertIncludesAll(readme, [
    '微信小程序',
    '本地后端',
    '管理后台',
    '微信开发者工具',
    'node --test tests/\\*.test.js',
    'npm run server',
    '/api/admin/overview',
    '不包含真实支付',
    '真实核销',
    '生产数据库',
  ]);
});
