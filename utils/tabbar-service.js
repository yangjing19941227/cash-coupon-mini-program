function syncTabBar(page, selected) {
  if (!page || typeof page.getTabBar !== 'function') {
    return;
  }

  const tabBar = page.getTabBar();
  if (!tabBar || typeof tabBar.setData !== 'function') {
    return;
  }

  tabBar.setData({ selected });
}

module.exports = {
  syncTabBar,
};
