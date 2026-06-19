const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const rootDir = path.join(__dirname, '..');

function readProjectFile(filePath) {
  return fs.readFileSync(path.join(rootDir, filePath), 'utf8');
}

function createLotteryPageHarness() {
  const jsPath = path.join(rootDir, 'pages/lottery/index.js');
  const js = readProjectFile('pages/lottery/index.js');
  const calls = {
    setData: [],
    toasts: [],
    navigations: [],
    intervals: [],
    cleared: [],
  };
  let pageDefinition;

  const context = {
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
    Date,
    Math,
    setInterval(callback, delay) {
      const timer = { callback, delay };
      calls.intervals.push(timer);
      return timer;
    },
    clearInterval(timer) {
      calls.cleared.push(timer);
    },
  };

  vm.runInNewContext(js, context, { filename: jsPath });

  const page = {
    ...pageDefinition,
    data: JSON.parse(JSON.stringify(pageDefinition.data)),
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

test('lottery page exposes digit input, random generation and record entry', () => {
  const js = readProjectFile('pages/lottery/index.js');
  const wxml = readProjectFile('pages/lottery/index.wxml');

  for (const symbol of [
    'onDigitInput',
    'generateRandomDigits',
    'submitNumber',
    'startDrawTimer',
    'openResultModal',
    'handleResultAction',
    'goLotteryRecords',
  ]) {
    assert.match(js, new RegExp(symbol));
  }

  for (const text of [
    '输入四位数参与',
    '开奖时间为每晚21:38分',
    '随机生成一组数字',
    '查看抽奖记录',
  ]) {
    assert.match(wxml, new RegExp(text));
  }

  assert.match(wxml, /bindinput="onDigitInput"/);
  assert.match(wxml, /bindtap="submitNumber"/);
  assert.match(wxml, /bindtap="handleResultAction"/);
});

test('lottery digit input sanitizes one numeric digit per box', () => {
  const { page } = createLotteryPageHarness();

  page.onDigitInput({
    currentTarget: { dataset: { index: 2 } },
    detail: { value: 'a78' },
  });

  assert.deepEqual(Array.from(page.data.digits), ['3', '8', '8', '6']);
});

test('lottery submit validates incomplete digits and starts countdown when complete', () => {
  const { calls, page } = createLotteryPageHarness();

  page.setData({ digits: ['1', '', '3', '4'] });
  page.submitNumber();

  assert.equal(calls.toasts[0].title, '请输入完整4位数字');
  assert.equal(calls.intervals.length, 0);

  page.setData({ digits: ['1', '2', '3', '4'] });
  page.submitNumber();

  assert.equal(page.data.isSubmitted, true);
  assert.equal(page.data.userNumber, '1234');
  assert.equal(calls.intervals.length, 1);
  assert.equal(calls.intervals[0].delay, 1000);
});

test('lottery records page can return to the lottery tab', () => {
  const js = readProjectFile('pages/lottery-records/index.js');
  const wxml = readProjectFile('pages/lottery-records/index.wxml');

  assert.match(js, /goBack/);
  assert.match(js, /goLottery/);
  assert.match(js, /\/pages\/lottery\/index/);
  assert.match(wxml, /抽奖记录/);
  assert.match(wxml, /继续参与抽奖/);
  assert.match(wxml, /bindtap="goLottery"/);
});
