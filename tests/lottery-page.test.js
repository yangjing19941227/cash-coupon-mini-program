const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const rootDir = path.join(__dirname, '..');

function readProjectFile(filePath) {
  return fs.readFileSync(path.join(rootDir, filePath), 'utf8');
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
  assert.match(wxml, /disabled="{{submitDisabled}}"/);
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
