const { getUserProfile } = require('../../utils/mock-service');
const {
  getCachedProfile,
  isDefaultProfile,
  mergeProfiles,
  syncWechatProfile,
} = require('../../utils/auth-service');

function normalizeWechatProfile(userInfo = {}) {
  return {
    nickname: userInfo.nickName || userInfo.nickname || '',
    avatar: userInfo.avatarUrl || userInfo.avatar || '',
  };
}

function isGenericNickname(nickname) {
  return ['', '海口生活用户', '同步微信昵称', '微信用户'].includes(nickname || '');
}

function isGenericAvatar(avatar) {
  return ['', '/assets/images/profile-avatar.png', '/assets/images/avatar-user.png'].includes(avatar || '');
}

function buildFallbackProfile(profile = {}) {
  return {
    nickname: isGenericNickname(profile.nickname) ? '微信测试用户' : profile.nickname,
    avatar: isGenericAvatar(profile.avatar) ? '/assets/images/profile-avatar.png' : profile.avatar,
  };
}

function getFormNickname(event) {
  const value = event && event.detail && event.detail.value;
  const nickname = value && value.nickname;
  return typeof nickname === 'string' ? nickname.trim() : '';
}

function requestWechatProfile() {
  const wxApi = typeof wx === 'undefined' ? null : wx;

  if (!wxApi) {
    return Promise.resolve({ unavailable: true });
  }

  if (typeof wxApi.getUserProfile === 'function') {
    return new Promise((resolve) => {
      wxApi.getUserProfile({
        desc: '同步微信头像和昵称',
        lang: 'zh_CN',
        success(result) {
          resolve(normalizeWechatProfile(result.userInfo));
        },
        fail(error) {
          resolve({ unavailable: true, message: error.errMsg || '微信资料不可用' });
        },
      });
    });
  }

  if (typeof wxApi.getUserInfo === 'function') {
    return new Promise((resolve) => {
      wxApi.getUserInfo({
        lang: 'zh_CN',
        success(result) {
          resolve(normalizeWechatProfile(result.userInfo));
        },
        fail(error) {
          resolve({ unavailable: true, message: error.errMsg || '微信资料不可用' });
        },
      });
    });
  }

  return Promise.resolve({ unavailable: true });
}

function showToast(payload) {
  if (typeof wx !== 'undefined' && typeof wx.showToast === 'function') {
    wx.showToast(payload);
  }
}

function getAppProfile() {
  if (typeof getApp !== 'function') {
    return null;
  }

  const app = getApp();
  return app && app.globalData ? app.globalData.userProfile : null;
}

function setAppProfile(profile) {
  if (typeof getApp !== 'function') {
    return;
  }

  const app = getApp();
  if (app && app.globalData) {
    app.globalData.userProfile = profile;
  }
}

function cacheLocalProfile(profile) {
  setAppProfile(profile);

  if (typeof wx === 'undefined' || typeof wx.setStorageSync !== 'function') {
    return;
  }

  try {
    wx.setStorageSync('cash_coupon_profile', profile);
  } catch (error) {
    // Local cache should not block the current page update.
  }
}

Page({
  data: {
    profile: getUserProfile(),
  },

  onShow() {
    const profile = this.loadProfile();
    this.promptProfileSyncIfNeeded(profile);
  },

  loadProfile() {
    const profile = mergeProfiles(
      mergeProfiles(getUserProfile(), getAppProfile()),
      getCachedProfile(),
    );

    this.setData({
      profile,
    });
    setAppProfile(profile);
    return profile;
  },

  promptProfileSyncIfNeeded(profile) {
    if (this.profileSyncPrompted || !isDefaultProfile(profile)) {
      return;
    }

    this.profileSyncPrompted = true;

    if (typeof wx !== 'undefined' && typeof wx.showModal === 'function') {
      wx.showModal({
        title: '同步微信资料',
        content: '当前仍是默认头像和昵称，建议同步微信资料。',
        confirmText: '同步资料',
        cancelText: '稍后',
        success: (result) => {
          if (result.confirm) {
            this.saveWechatProfile();
          }
        },
      });
      return;
    }

    showToast({
      title: '请同步微信资料',
      icon: 'none',
    });
  },

  onChooseAvatar(event) {
    const avatarUrl = event?.detail?.avatarUrl;

    if (!avatarUrl) {
      return;
    }

    const profile = {
      ...this.data.profile,
      avatar: avatarUrl,
    };

    this.setData({
      profile,
    });
    cacheLocalProfile(profile);
  },

  onNicknameInput(event) {
    const profile = {
      ...this.data.profile,
      nickname: event.detail.value,
    };

    this.setData({
      profile,
    });
    cacheLocalProfile(profile);
  },

  async saveWechatProfile(event = {}) {
    const formNickname = getFormNickname(event);
    const currentProfile = {
      ...this.data.profile,
      ...(formNickname ? { nickname: formNickname } : {}),
    };
    const wechatProfile = await requestWechatProfile();
    const profileFromWechat = {
      ...currentProfile,
      ...(!isGenericNickname(wechatProfile.nickname) ? { nickname: wechatProfile.nickname } : {}),
      ...(!isGenericAvatar(wechatProfile.avatar) ? { avatar: wechatProfile.avatar } : {}),
    };
    const fallbackProfile = buildFallbackProfile(profileFromWechat);
    const useFallback = isGenericNickname(profileFromWechat.nickname) || isGenericAvatar(profileFromWechat.avatar);
    const profile = useFallback
      ? {
        ...profileFromWechat,
        ...fallbackProfile,
      }
      : profileFromWechat;

    this.setData({ profile });

    try {
      const result = await syncWechatProfile({
        nickname: profile.nickname,
        avatarUrl: profile.avatar,
      });

      if (!result.ok) {
        showToast({
          title: result.message || '同步失败',
          icon: 'none',
        });
        return;
      }

      this.setData({
        profile: result.profile,
      });
      cacheLocalProfile(result.profile);
      showToast({
        title: useFallback ? '已使用测试资料' : '微信资料已同步',
        icon: 'success',
      });
    } catch (error) {
      showToast({
        title: error.message || '同步失败',
        icon: 'none',
      });
    }
  },

  goCouponAssets() {
    wx.navigateTo({
      url: '/pages/coupon-assets/index',
    });
  },

  goLotteryRecords() {
    wx.navigateTo({
      url: '/pages/lottery-records/index',
    });
  },

  goExchangeRecords() {
    wx.navigateTo({
      url: '/pages/exchange-records/index',
    });
  },

  goCouponCode() {
    wx.navigateTo({
      url: '/pages/coupon-code/index',
    });
  },
});
