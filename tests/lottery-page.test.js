const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const rootDir = path.join(__dirname, '..');

function readProjectFile(filePath) {
  return fs.readFileSync(path.join(rootDir, filePath), 'utf8');
}

function createLotteryPageHarness(options = {}) {
  const jsPath = path.join(rootDir, 'pages/lottery/index.js');
  const js = fs.readFileSync(jsPath, 'utf8');
  const calls = {
    getLotteryState: 0,
    generateLotteryNumber: 0,
    submitLottery: [],
    setData: [],
    toasts: [],
    navigations: [],
  };
  const state = {
    city: '同城',
    todayLeft: 2,
    prize: '现金券',
    drawTime: '今晚 20:00',
    range: '0000-9999',
    currentNumber: '1234',
    ...options.state,
  };
  const service = {
    getLotteryState() {
      calls.getLotteryState += 1;
      return { ...state };
    },
    generateLotteryNumber() {
      calls.generateLotteryNumber += 1;
    },
    submitLottery(number) {
      calls.submitLottery.push(number);
      if (options.submitLottery) {
        return options.submitLottery(number);
      }
      return { message: '提交成功' };
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

test('lottery page exposes required flow imports, handlers and bindings', () => {
  const js = readProjectFile('pages/lottery/index.js');
  const wxml = readProjectFile('pages/lottery/index.wxml');

  for (const symbol of [
    'getLotteryState',
    'generateLotteryNumber',
    'submitLottery',
    'submitDisabled',
    'goRecords',
    'goRules',
  ]) {
    assert.match(js, new RegExp(symbol));
  }

  assert.match(wxml, /四位数抽奖/);
  assert.match(wxml, /随机生成一组数字/);
  assert.match(wxml, /提交参与/);
  assert.match(wxml, /查看抽奖记录/);
  assert.match(wxml, /bindtap="generateNumber"/);
  assert.match(wxml, /bindtap="submitNumber"/);
  assert.match(wxml, /bindtap="goRecords"/);
  assert.match(wxml, /bindtap="goRules"/);
  assert.doesNotMatch(wxml, /disabled="{{submitDisabled}}"/);
  assert.match(wxml, /submitDisabledClass/);
});

test('lottery submit handler declares validation toast messages', () => {
  const js = readProjectFile('pages/lottery/index.js');

  assert.match(js, /请输入完整四位数/);
  assert.match(js, /今日次数已用完/);
});

test('lottery submit handler shows incomplete-number toast without submitting', () => {
  const { calls, page } = createLotteryPageHarness();

  page.data = {
    ...page.data,
    currentNumber: '123',
    todayLeft: 1,
  };

  page.submitNumber();

  assert.deepEqual(calls.submitLottery, []);
  assert.equal(calls.getLotteryState, 0);
  assert.equal(calls.toasts.length, 1);
  assert.equal(calls.toasts[0].title, '请输入完整四位数');
  assert.equal(calls.toasts[0].icon, 'none');
});

test('lottery submit handler shows exhausted toast without submitting', () => {
  const { calls, page } = createLotteryPageHarness();

  page.data = {
    ...page.data,
    currentNumber: '1234',
    todayLeft: 0,
  };

  page.submitNumber();

  assert.deepEqual(calls.submitLottery, []);
  assert.equal(calls.getLotteryState, 0);
  assert.equal(calls.toasts.length, 1);
  assert.equal(calls.toasts[0].title, '今日次数已用完');
  assert.equal(calls.toasts[0].icon, 'none');
});

test('lottery submit handler submits valid number and reloads state', () => {
  const { calls, page } = createLotteryPageHarness({
    submitLottery: () => ({ message: '服务返回消息' }),
  });

  page.data = {
    ...page.data,
    currentNumber: '5678',
    todayLeft: 1,
  };

  page.submitNumber();

  assert.deepEqual(calls.submitLottery, ['5678']);
  assert.equal(calls.getLotteryState, 1);
  assert.equal(calls.toasts.length, 1);
  assert.equal(calls.toasts[0].title, '服务返回消息');
  assert.equal(calls.toasts[0].icon, 'none');
});

test('lottery records page loads records and renders a repeated list', () => {
  const js = readProjectFile('pages/lottery-records/index.js');
  const wxml = readProjectFile('pages/lottery-records/index.wxml');

  assert.match(js, /getLotteryRecords/);
  assert.match(wxml, /wx:for/);
  assert.match(wxml, /{{item\.prize}}/);
  assert.match(wxml, /{{item\.number}}/);
  assert.match(wxml, /{{item\.amount/);
  assert.match(wxml, /{{item\.createdText}}/);
});
