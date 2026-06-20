const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const { createApp } = require('../server/app');
const { JsonStore } = require('../server/store');

const rootDir = path.join(__dirname, '..');

function readProjectFile(filePath) {
  return fs.readFileSync(path.join(rootDir, filePath), 'utf8');
}

function createTestServer() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cash-coupon-auth-'));
  const store = new JsonStore({ filePath: path.join(tempDir, 'store.json') });
  const server = createApp({
    store,
    now: () => '2026-06-19T12:00:00.000Z',
    idFactory: (prefix) => `${prefix}-test-id`,
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise((done) => {
          server.close(done);
          server.closeIdleConnections?.();
          server.closeAllConnections?.();
        }),
      });
    });
  });
}

async function requestJson(baseUrl, pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const payload = await response.json();
  return { response, payload };
}

function createProfilePageHarness(options = {}) {
  const jsPath = path.join(rootDir, 'pages/profile/index.js');
  const js = readProjectFile('pages/profile/index.js');
  const initialProfile = {
    nickname: '海口生活用户',
    avatar: '/assets/images/avatar-user.png',
    city: '海口',
    district: '龙华区',
    savedAmount: 236,
  };
  const calls = {
    syncPayloads: [],
    setData: [],
    toasts: [],
    modals: [],
    wxGetUserProfile: 0,
    wxChooseMedia: 0,
  };
  const storage = {
    ...(options.storedProfile ? { cash_coupon_profile: options.storedProfile } : {}),
  };
  const globalData = {
    userProfile: options.globalProfile || null,
  };
  let pageDefinition;

  const context = {
    require(request) {
      if (request === '../../utils/mock-service') {
        return {
          getUserProfile() {
            return { ...initialProfile };
          },
        };
      }

      if (request === '../../utils/auth-service') {
        return {
          async syncWechatProfile(profile) {
            calls.syncPayloads.push(profile);
            return {
              ok: true,
              profile: {
                ...initialProfile,
                nickname: profile.nickname,
                avatar: profile.avatarUrl,
              },
            };
          },
          getCachedProfile() {
            return storage.cash_coupon_profile || null;
          },
          mergeProfiles(primary = {}, cached = {}) {
            primary = primary || {};
            cached = cached || {};
            const defaultNicknames = new Set(['', '海口生活用户', '同步微信昵称']);
            const defaultAvatars = new Set(['', '/assets/images/profile-avatar.png', '/assets/images/avatar-user.png']);
            const merged = {
              ...cached,
              ...primary,
            };

            if (cached.nickname && defaultNicknames.has(primary.nickname || '')) {
              merged.nickname = cached.nickname;
            }

            if (cached.avatar && defaultAvatars.has(primary.avatar || '')) {
              merged.avatar = cached.avatar;
            }

            return merged;
          },
          isDefaultProfile(profile = {}) {
            return ['海口生活用户', '同步微信昵称', ''].includes(profile.nickname || '')
              || ['/assets/images/profile-avatar.png', '/assets/images/avatar-user.png', ''].includes(profile.avatar || '');
          },
        };
      }

      throw new Error(`Unexpected require: ${request}`);
    },
    Page(definition) {
      pageDefinition = definition;
    },
    wx: {
      getUserProfile(payload) {
        calls.wxGetUserProfile += 1;
        if (options.failGetUserProfile) {
          payload.fail({
            errMsg: 'reviewNickname:fail',
          });
          return;
        }

        payload.success({
          userInfo: options.wxUserInfo || {
            nickName: '微信同步昵称',
            avatarUrl: 'wxfile://avatar.png',
          },
        });
      },
      chooseMedia(payload) {
        calls.wxChooseMedia += 1;
        if (options.failChooseMedia) {
          payload.fail({
            errMsg: options.chooseMediaError || 'chooseMedia:fail cancel',
          });
          return;
        }

        payload.success({
          tempFiles: [
            {
              tempFilePath: options.chosenAvatar || 'wxfile://media-avatar.png',
            },
          ],
        });
      },
      showToast(payload) {
        calls.toasts.push(payload);
      },
      showModal(payload) {
        calls.modals.push(payload);
        if (options.confirmModal && typeof payload.success === 'function') {
          payload.success({ confirm: true, cancel: false });
        }
      },
      getStorageSync(key) {
        return storage[key] || null;
      },
      setStorageSync(key, value) {
        storage[key] = value;
      },
    },
    getApp() {
      return { globalData };
    },
  };

  vm.runInNewContext(js, context, { filename: jsPath });

  const page = {
    ...pageDefinition,
    data: JSON.parse(JSON.stringify(pageDefinition.data || {})),
    setData(update) {
      calls.setData.push(update);
      this.data = {
        ...this.data,
        ...update,
      };
    },
  };

  return { calls, page, storage, globalData };
}

test('backend supports WeChat login and profile synchronization', async () => {
  const server = await createTestServer();

  try {
    const missingCode = await requestJson(server.baseUrl, '/api/auth/wechat-login', {
      method: 'POST',
      body: {},
    });
    assert.equal(missingCode.response.status, 400);

    const login = await requestJson(server.baseUrl, '/api/auth/wechat-login', {
      method: 'POST',
      body: { code: 'wx-login-code-123' },
    });
    assert.equal(login.response.status, 200);
    assert.equal(login.payload.ok, true);
    assert.equal(login.payload.profile.wechatOpenId, 'mock-openid-77782d6c6f67');
    assert.equal(login.payload.sessionToken, 'session-test-id');

    const updated = await requestJson(server.baseUrl, '/api/user/profile', {
      method: 'PATCH',
      body: {
        nickname: '微信昵称',
        avatarUrl: 'https://thirdwx.qlogo.cn/mmopen/avatar.png',
      },
    });
    assert.equal(updated.response.status, 200);
    assert.equal(updated.payload.profile.nickname, '微信昵称');
    assert.equal(updated.payload.profile.avatar, 'https://thirdwx.qlogo.cn/mmopen/avatar.png');

    const profile = await requestJson(server.baseUrl, '/api/user/profile');
    assert.equal(profile.response.status, 200);
    assert.equal(profile.payload.profile.nickname, '微信昵称');
    assert.equal(profile.payload.profile.wechatOpenId, 'mock-openid-77782d6c6f67');
  } finally {
    await server.close();
  }
});

test('app starts silent WeChat login on launch', () => {
  const appJs = readProjectFile('app.js');
  const authJs = readProjectFile('utils/auth-service.js');

  assert.match(appJs, /loginWithWechat/);
  assert.match(appJs, /onLaunch/);
  assert.match(appJs, /showToast/);
  assert.match(appJs, /登录成功/);
  assert.match(authJs, /wx\.login/);
  assert.match(authJs, /\/api\/auth\/wechat-login/);
  assert.match(authJs, /setStorageSync/);
});

test('silent login keeps cached synced profile over backend defaults', async () => {
  const { loginWithWechat } = require('../utils/auth-service');
  const storage = {
    cash_coupon_profile: {
      nickname: '微信真实昵称',
      avatar: 'wxfile://real-avatar.png',
      city: '海口',
      district: '龙华区',
    },
  };
  const wxApi = {
    login(payload) {
      payload.success({ code: 'login-code' });
    },
    request(payload) {
      payload.success({
        statusCode: 200,
        data: {
          ok: true,
          sessionToken: 'session-from-server',
          profile: {
            nickname: '海口生活用户',
            avatar: '/assets/images/profile-avatar.png',
            city: '海口',
            district: '龙华区',
          },
        },
      });
    },
    getStorageSync(key) {
      return storage[key] || null;
    },
    setStorageSync(key, value) {
      storage[key] = value;
    },
  };

  const payload = await loginWithWechat({ wxApi });

  assert.equal(payload.profile.nickname, '微信真实昵称');
  assert.equal(payload.profile.avatar, 'wxfile://real-avatar.png');
  assert.equal(storage.cash_coupon_profile.nickname, '微信真实昵称');
  assert.equal(storage.cash_coupon_auth.profile.avatar, 'wxfile://real-avatar.png');
});

test('profile page lets users sync WeChat avatar and nickname', () => {
  const js = readProjectFile('pages/profile/index.js');
  const wxml = readProjectFile('pages/profile/index.wxml');
  const wxss = readProjectFile('pages/profile/index.wxss');

  for (const symbol of [
    'getUserProfile',
    'syncWechatProfile',
    'onChooseAvatar',
    'onNicknameInput',
    'saveWechatProfile',
  ]) {
    assert.match(js, new RegExp(symbol));
  }

  for (const snippet of [
    'class="avatar-frame"',
    'src="{{profile.avatar}}"',
    'value="{{profile.nickname}}"',
    'plain="true"',
    '<view class="profile-top">',
    '<form class="profile-form" bindsubmit="saveWechatProfile">',
    'form-type="submit"',
    'open-type="chooseAvatar"',
    'bindchooseavatar="onChooseAvatar"',
    'type="nickname"',
    'name="nickname"',
    'bindinput="onNicknameInput"',
  ]) {
    assert.match(wxml, new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.doesNotMatch(wxml, /bindtap="syncWechatProfileFromAvatar"/);
  assert.doesNotMatch(wxml, /avatar-edit-hint/);
  assert.match(wxml, /<view class="avatar-frame">\s*<image[^>]*><\/image>\s*<button class="avatar-button"[^>]*><\/button>\s*<\/view>/);
  assert.match(wxss, /\.avatar-frame\s*{[\s\S]*width:\s*132rpx;[\s\S]*height:\s*132rpx;[\s\S]*border-radius:\s*50%;[\s\S]*overflow:\s*hidden/);
  assert.match(wxss, /\.avatar-button/);
  assert.match(wxss, /\.avatar-button\s*{[\s\S]*position:\s*absolute;[\s\S]*inset:\s*0;[\s\S]*opacity:\s*0/);
  assert.doesNotMatch(wxss, /avatar-edit-hint/);
  assert.match(wxss, /\.avatar\s*{[\s\S]*width:\s*100%;[\s\S]*height:\s*100%/);
  assert.match(wxss, /\.profile-name-input/);
  assert.match(wxml, /<view class="profile-main">[\s\S]*<input class="profile-name-input"[\s\S]*<\/view>\s*<form class="profile-form" bindsubmit="saveWechatProfile">/);
  assert.match(wxss, /\.profile-top\s*{[\s\S]*grid-template-columns:\s*132rpx minmax\(0,\s*1fr\) 164rpx/);
  assert.match(wxss, /\.profile-form\s*{[\s\S]*justify-self:\s*end;[\s\S]*width:\s*164rpx/);
  assert.match(wxss, /\.profile-btn\s*{[\s\S]*flex:\s*0 0 164rpx;[\s\S]*width:\s*164rpx !important/);
});

test('profile sync pulls WeChat user info before saving', async () => {
  const { calls, page } = createProfilePageHarness();

  await page.saveWechatProfile();

  assert.equal(calls.wxGetUserProfile, 1);
  assert.equal(calls.syncPayloads[0].nickname, '微信同步昵称');
  assert.equal(calls.syncPayloads[0].avatarUrl, 'wxfile://avatar.png');
  assert.equal(page.data.profile.nickname, '微信同步昵称');
  assert.equal(page.data.profile.avatar, 'wxfile://avatar.png');
  assert.ok(calls.toasts.some((toast) => toast.icon === 'success'));
});

test('profile sync gives visible fallback when WeChat user info is unavailable', async () => {
  const { calls, page } = createProfilePageHarness({ failGetUserProfile: true });

  await page.saveWechatProfile();

  assert.equal(calls.wxGetUserProfile, 1);
  assert.equal(calls.syncPayloads[0].nickname, '微信测试用户');
  assert.equal(calls.syncPayloads[0].avatarUrl, '/assets/images/profile-avatar.png');
  assert.equal(page.data.profile.nickname, '微信测试用户');
  assert.equal(page.data.profile.avatar, '/assets/images/profile-avatar.png');
  assert.ok(calls.toasts.some((toast) => /测试资料/.test(toast.title)));
});

test('profile sync submits nickname form value and ignores generic WeChat profile', async () => {
  const { calls, page } = createProfilePageHarness({
    wxUserInfo: {
      nickName: '微信用户',
      avatarUrl: '',
    },
  });

  page.onChooseAvatar({ detail: { avatarUrl: 'wxfile://chosen-avatar.png' } });
  await page.saveWechatProfile({
    detail: {
      value: {
        nickname: '表单昵称',
      },
    },
  });

  assert.equal(calls.syncPayloads[0].nickname, '表单昵称');
  assert.equal(calls.syncPayloads[0].avatarUrl, 'wxfile://chosen-avatar.png');
  assert.equal(page.data.profile.nickname, '表单昵称');
  assert.equal(page.data.profile.avatar, 'wxfile://chosen-avatar.png');
});

test('profile avatar button reads WeChat avatar without calling profile sync', () => {
  const { calls, page, storage, globalData } = createProfilePageHarness();

  page.onChooseAvatar({ detail: { avatarUrl: 'wxfile://avatar-button.png' } });

  assert.equal(calls.wxGetUserProfile, 0);
  assert.equal(calls.wxChooseMedia, 0);
  assert.equal(calls.syncPayloads.length, 0);
  assert.equal(page.data.profile.avatar, 'wxfile://avatar-button.png');
  assert.equal(storage.cash_coupon_profile.avatar, 'wxfile://avatar-button.png');
  assert.equal(globalData.userProfile.avatar, 'wxfile://avatar-button.png');
});

test('profile avatar button ignores empty avatar events without showing an error', () => {
  const { calls, page } = createProfilePageHarness({
    chosenAvatar: 'wxfile://local-avatar.png',
  });
  const beforeAvatar = page.data.profile.avatar;

  page.onChooseAvatar({ detail: {} });

  assert.equal(calls.wxGetUserProfile, 0);
  assert.equal(calls.wxChooseMedia, 0);
  assert.equal(calls.toasts.length, 0);
  assert.equal(page.data.profile.avatar, beforeAvatar);
});

test('profile page restores cached avatar and nickname after switching tabs', () => {
  const { page, storage, globalData } = createProfilePageHarness({
    storedProfile: {
      nickname: '已同步昵称',
      avatar: 'wxfile://persisted-avatar.png',
      city: '海口',
      district: '龙华区',
    },
  });

  page.loadProfile();

  assert.equal(page.data.profile.nickname, '已同步昵称');
  assert.equal(page.data.profile.avatar, 'wxfile://persisted-avatar.png');
  assert.equal(globalData.userProfile.nickname, '已同步昵称');
  assert.equal(storage.cash_coupon_profile.avatar, 'wxfile://persisted-avatar.png');
});

test('profile page keeps chosen avatar after switching tabs before sync', () => {
  const { page, storage, globalData } = createProfilePageHarness();

  page.loadProfile();
  page.onChooseAvatar({ detail: { avatarUrl: 'wxfile://chosen-before-sync.png' } });
  page.loadProfile();

  assert.equal(page.data.profile.avatar, 'wxfile://chosen-before-sync.png');
  assert.equal(storage.cash_coupon_profile.avatar, 'wxfile://chosen-before-sync.png');
  assert.equal(globalData.userProfile.avatar, 'wxfile://chosen-before-sync.png');
});

test('profile page prompts sync when only default profile is shown', () => {
  const { calls, page } = createProfilePageHarness();

  page.onShow();

  assert.ok(calls.modals.some((modal) => /同步微信资料|完善资料/.test(modal.title)));
});
