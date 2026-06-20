const {
  createWechatSession,
  updateUserProfile,
} = require('./mock-service');

const API_BASE_URL = 'http://127.0.0.1:8787';
const AUTH_STORAGE_KEY = 'cash_coupon_auth';
const PROFILE_STORAGE_KEY = 'cash_coupon_profile';
const DEFAULT_NICKNAMES = new Set(['', '海口生活用户', '同步微信昵称', '微信用户']);
const DEFAULT_AVATARS = new Set(['', '/assets/images/profile-avatar.png', '/assets/images/avatar-user.png']);

function getWxApi() {
  return typeof wx === 'undefined' ? null : wx;
}

function setStorage(wxApi, key, value) {
  if (!wxApi || typeof wxApi.setStorageSync !== 'function') {
    return;
  }

  try {
    wxApi.setStorageSync(key, value);
  } catch (error) {
    // Storage is a convenience cache; login/profile should continue without it.
  }
}

function getStorage(wxApi, key) {
  if (!wxApi || typeof wxApi.getStorageSync !== 'function') {
    return null;
  }

  try {
    return wxApi.getStorageSync(key) || null;
  } catch (error) {
    return null;
  }
}

function hasCustomNickname(profile = {}) {
  return Boolean(profile.nickname && !DEFAULT_NICKNAMES.has(profile.nickname));
}

function hasCustomAvatar(profile = {}) {
  return Boolean(profile.avatar && !DEFAULT_AVATARS.has(profile.avatar));
}

function isDefaultProfile(profile = {}) {
  return !hasCustomNickname(profile) || !hasCustomAvatar(profile);
}

function mergeProfiles(primary = {}, cached = {}) {
  const merged = {
    ...(cached || {}),
    ...(primary || {}),
  };

  if (!hasCustomNickname(primary) && hasCustomNickname(cached)) {
    merged.nickname = cached.nickname;
  }

  if (!hasCustomAvatar(primary) && hasCustomAvatar(cached)) {
    merged.avatar = cached.avatar;
  }

  return merged;
}

function getCachedProfile(options = {}) {
  const wxApi = options.wxApi || getWxApi();
  const profile = getStorage(wxApi, PROFILE_STORAGE_KEY);
  return profile && typeof profile === 'object' ? profile : null;
}

function requestJson(pathname, options = {}, wxApi = getWxApi()) {
  if (!wxApi || typeof wxApi.request !== 'function') {
    return Promise.reject(new Error('wx.request unavailable'));
  }

  return new Promise((resolve, reject) => {
    wxApi.request({
      url: `${API_BASE_URL}${pathname}`,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'content-type': 'application/json',
        ...(options.header || {}),
      },
      success(response) {
        const statusCode = Number(response.statusCode || 0);

        if (statusCode >= 200 && statusCode < 300) {
          resolve(response.data);
          return;
        }

        reject(new Error(response.data?.message || '请求失败'));
      },
      fail(error) {
        reject(new Error(error.errMsg || '请求失败'));
      },
    });
  });
}

function loginWithNativeWechat(wxApi = getWxApi()) {
  const loginApi = wxApi?.login || (typeof wx !== 'undefined' ? wx.login : null);

  if (!loginApi) {
    return Promise.reject(new Error('wx.login unavailable'));
  }

  return new Promise((resolve, reject) => {
    loginApi.call(wxApi, {
      success(result) {
        if (result && result.code) {
          resolve(result.code);
          return;
        }

        reject(new Error('微信登录凭证为空'));
      },
      fail(error) {
        reject(new Error(error.errMsg || '微信登录失败'));
      },
    });
  });
}

async function loginWithWechat(options = {}) {
  const wxApi = options.wxApi || getWxApi();

  try {
    const code = await loginWithNativeWechat(wxApi);
    const payload = await requestJson('/api/auth/wechat-login', {
      method: 'POST',
      data: { code },
    }, wxApi);
    const profile = mergeProfiles(payload.profile, getCachedProfile({ wxApi }));
    const finalPayload = {
      ...payload,
      profile,
    };

    updateUserProfile(profile);
    setStorage(wxApi, AUTH_STORAGE_KEY, {
      sessionToken: finalPayload.sessionToken,
      profile: finalPayload.profile,
    });
    setStorage(wxApi, PROFILE_STORAGE_KEY, finalPayload.profile);
    return finalPayload;
  } catch (error) {
    const fallback = createWechatSession(`local-${Date.now()}`);
    fallback.profile = mergeProfiles(fallback.profile, getCachedProfile({ wxApi }));
    setStorage(wxApi, AUTH_STORAGE_KEY, {
      sessionToken: fallback.sessionToken,
      profile: fallback.profile,
      fallback: true,
    });
    setStorage(wxApi, PROFILE_STORAGE_KEY, fallback.profile);
    return fallback;
  }
}

async function syncWechatProfile(profile, options = {}) {
  const wxApi = options.wxApi || getWxApi();

  try {
    const payload = await requestJson('/api/user/profile', {
      method: 'PATCH',
      data: profile,
    }, wxApi);

    updateUserProfile(payload.profile);
    setStorage(wxApi, PROFILE_STORAGE_KEY, payload.profile);
    return payload;
  } catch (error) {
    const fallback = updateUserProfile(profile);
    setStorage(wxApi, PROFILE_STORAGE_KEY, fallback.profile);
    return fallback;
  }
}

module.exports = {
  API_BASE_URL,
  getCachedProfile,
  isDefaultProfile,
  loginWithWechat,
  mergeProfiles,
  syncWechatProfile,
};
