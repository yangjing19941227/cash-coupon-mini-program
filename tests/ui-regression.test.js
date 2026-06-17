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

function readSelectorBlock(css, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escapedSelector}\\s*{([\\s\\S]*?)}`));

  assert.ok(match, `${selector} block should exist`);

  return match[1];
}

function readRpxProperty(css, selector, property) {
  const block = readSelectorBlock(css, selector);
  const match = block.match(new RegExp(`${property}:\\s*(\\d+)rpx;`));

  assert.ok(match, `${selector} should define ${property} in rpx`);

  return Number(match[1]);
}

function readHorizontalPadding(css, selector) {
  const block = readSelectorBlock(css, selector);
  const explicit = block.match(/padding-left:\s*(\d+)rpx;[\s\S]*padding-right:\s*(\d+)rpx;/);

  if (explicit) {
    return Number(explicit[1]) + Number(explicit[2]);
  }

  const shorthand = block.match(/padding:\s*(?:0|\d+rpx)\s+(\d+)rpx;/);

  assert.ok(shorthand, `${selector} should define horizontal padding in rpx`);

  return Number(shorthand[1]) * 2;
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
  assert.match(couponsWxss, /\.use-btn\s*{[\s\S]*height:\s*58rpx;/);
});

test('coupon action column stays inside the cash coupon card', () => {
  const couponsWxss = readProjectFile('pages/coupons/index.wxss');
  const pageWidth = 750;
  const pageHorizontalPadding = 64;
  const cardHorizontalPadding = readHorizontalPadding(couponsWxss, '.coupon-list');
  const iconWidth = readRpxProperty(couponsWxss, '.coupon-icon', 'width');
  const sideWidth = readRpxProperty(couponsWxss, '.coupon-side', 'width');
  const buttonWidth = readRpxProperty(couponsWxss, '.use-btn', 'width');
  const mainMargins = 30;
  const availableMainWidth = pageWidth
    - pageHorizontalPadding
    - cardHorizontalPadding
    - iconWidth
    - mainMargins
    - sideWidth;

  assert.ok(availableMainWidth >= 340, 'coupon title/tags should keep enough width before the action column');
  assert.ok(buttonWidth <= sideWidth - 12, 'use button should fit inside the action column with breathing room');
  assert.match(readSelectorBlock(couponsWxss, '.coupon-row'), /min-width:\s*0;/);
  assert.match(readSelectorBlock(couponsWxss, '.use-btn'), /box-sizing:\s*border-box;/);
});
