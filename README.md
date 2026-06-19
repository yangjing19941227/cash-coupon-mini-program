# 同城名惠小程序 UI 预览

这是一个本地生活优惠券小程序的 UI 预览项目，包含微信小程序页面代码和 HTML 设计总览。

## HTML 界面预览

直接打开仓库根目录的入口：

```text
index.html
```

也可以直接打开完整 UI 总览：

```text
html-preview/index.html
```

HTML 预览包含：

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

预览图统一为 `375 × 812px`，并汇总了上下游页面链路。

## 微信小程序页面

使用微信开发者工具导入本目录即可查看小程序页面。

主要页面：

- `pages/home/index`
- `pages/coupons/index`
- `pages/exchange/index`
- `pages/lottery/index`
- `pages/profile/index`
- `pages/coupon-code/index`
- `pages/exchange-records/index`
- `pages/lottery-records/index`

## 本地校验

如果本地安装了 Node.js，可以运行：

```bash
node --test tests/*.test.js
```

当前项目使用本地 mock 数据，不包含真实支付、真实核销、后台 API 或数据库能力。
