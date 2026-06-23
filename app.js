const { loginWithWechat } = require('./utils/auth-service');
const { enableShareMenu } = require('./utils/share-service');

App({
  globalData: {
    themeColor: '#006b68',
    city: '海口',
  },

  onLaunch() {
    enableShareMenu();

    loginWithWechat().then((payload) => {
      this.globalData.userProfile = payload.profile;
      this.globalData.sessionToken = payload.sessionToken;

      if (typeof wx !== 'undefined' && typeof wx.showToast === 'function') {
        wx.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 1200,
        });
      }
    });
  },
});
