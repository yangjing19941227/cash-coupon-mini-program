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

test('profile page keeps reference content visible with asset card and menu descriptions', () => {
  const js = readProjectFile('pages/profile/index.js');
  const wxml = readProjectFile('pages/profile/index.wxml');
  const wxss = readProjectFile('pages/profile/index.wxss');

  assert.match(js, /profileIllustration/);
  assert.match(wxml, /profile-asset-card/);
  assert.match(wxml, /profile\.profileIllustration/);

  for (const text of [
    '{{couponCountText}}张可用',
    '查看我的中奖记录',
    '查看置换进度与记录',
    '查看使用与核销明细',
    '查看资金与额度明细',
  ]) {
    assert.match(wxml, new RegExp(text));
  }

  assert.match(wxss, /\.profile-asset-card/);
  assert.match(wxss, /\.profile-visual\s*{[\s\S]*width:\s*300rpx;[\s\S]*height:\s*180rpx;/);
  assert.match(wxss, /\.menu-row\s*{[\s\S]*min-height:\s*112rpx;/);
});

test('key action buttons preserve reference-sized touch targets', () => {
  const lotteryWxss = readProjectFile('pages/lottery/index.wxss');
  const couponsWxss = readProjectFile('pages/coupons/index.wxss');

  assert.match(lotteryWxss, /\.submit-btn\s*{[\s\S]*width:\s*596rpx;[\s\S]*height:\s*96rpx;/);
  assert.match(couponsWxss, /\.coupon-side\s*{[\s\S]*width:\s*176rpx;/);
  assert.match(couponsWxss, /\.use-btn\s*{[\s\S]*width:\s*164rpx;[\s\S]*height:\s*58rpx;/);
});
