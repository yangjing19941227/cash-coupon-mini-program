const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const rootDir = path.join(__dirname, '..');
const rasterAssetPattern = /\.(png|jpe?g)$/i;

function readProjectFile(filePath) {
  return fs.readFileSync(path.join(rootDir, filePath), 'utf8');
}

function assertProjectAsset(assetPath, message) {
  assert.match(assetPath, rasterAssetPattern, message);

  const normalizedPath = assetPath.replace(/^\/+/, '');
  const absolutePath = path.join(rootDir, normalizedPath);

  assert.equal(fs.existsSync(absolutePath), true, `${assetPath} should exist`);
  assert.ok(fs.statSync(absolutePath).size > 5000, `${assetPath} should be a real visual asset`);
}

test('primary visual assets use crisp raster sources instead of placeholder svg art', () => {
  const mock = require('../data/mock');

  assertProjectAsset(mock.userProfile.avatar, 'profile avatar should be a raster image');
  assertProjectAsset(
    mock.userProfile.profileIllustration,
    'profile asset-card illustration should be a raster image',
  );

  for (const merchant of mock.merchantBenefits) {
    assertProjectAsset(merchant.image, `${merchant.name} should use a raster merchant image`);
  }
});

test('profile page keeps asset card and menu descriptions visible', () => {
  const wxml = readProjectFile('pages/profile/index.wxml');
  const wxss = readProjectFile('pages/profile/index.wxss');

  for (const text of [
    '累计已省',
    '我的优惠券',
    '12张可用',
    '查看我的中奖记录',
    '查看置换进度与记录',
    '查看使用与核销明细',
  ]) {
    assert.match(wxml, new RegExp(text));
  }

  assert.match(wxml, /profile-illustration\.png/);
  assert.match(wxss, /\.save-card/);
  assert.match(wxss, /\.menu-line/);
});

test('coupon discovery page keeps category grid, deal cards and buy action stable', () => {
  const wxml = readProjectFile('pages/coupons/index.wxml');
  const wxss = readProjectFile('pages/coupons/index.wxss');

  for (const binding of [
    'wx:for="{{categories}}"',
    'bindtap="switchCategory"',
    'wx:for="{{filters}}"',
    'bindtap="switchFilter"',
    'wx:for="{{visibleDeals}}"',
    'catchtap="goOrderConfirm"',
  ]) {
    assert.match(wxml, new RegExp(binding.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(wxss, /\.category-grid\s*{[\s\S]*grid-template-columns:\s*repeat\(5,\s*1fr\);/);
  assert.match(wxss, /\.deal-card\s*{[\s\S]*display:\s*flex;/);
  assert.match(wxss, /\.buy-btn\s*{[\s\S]*min-width:\s*128rpx;[\s\S]*height:\s*48rpx;/);
});

test('lottery page preserves large touch targets for number entry and submit', () => {
  const wxss = readProjectFile('pages/lottery/index.wxss');

  assert.match(wxss, /\.digit-input\s*{[\s\S]*height:\s*164rpx;/);
  assert.match(wxss, /\.submit-button\s*{[\s\S]*width:\s*100%;[\s\S]*height:\s*96rpx;/);
  assert.match(wxss, /\.result-button\s*{[\s\S]*height:\s*88rpx;/);
});
