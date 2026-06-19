# HTML UI 预览

这个目录用于查看同城名惠小程序的 UI 图和上下游页面关系。

## 打开方式

直接用浏览器打开：

```text
html-preview/index.html
```

上下游页面的 HTML 代码还原：

```text
html-preview/downstream-screens.html
```

## 包含页面

- 首页
- 优惠券
- 置换
- 抽奖
- 我的
- 优惠券资产
- 出示券码
- 优惠券详情
- 发起置换
- 置换记录
- 抽奖记录

## 设计说明

页面尺寸统一为 `375 × 812px`，沿用浅青渐变底层、白色轻卡片、深青主按钮和统一底部 Tab 风格。

首页和优惠券页不重复生成，沿用项目中已经确认的现有 HTML；`downstream-screens.html` 只补充置换、抽奖、我的和二级页面。
