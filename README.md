# 同城名惠小程序

这是一个本地生活优惠券小程序项目，包含微信小程序页面代码、HTML 设计总览、本地 Node.js 后端 API 和浏览器管理后台。

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

## 本地后端与管理后台

项目已补充一个无需外部依赖的本地 Node.js 后端，用于开发预览和联调。它提供优惠券、订单、充值、余额流水、置换审核、抽奖记录、商家管理和核销接口，并把运行数据持久化到仓库外的 `.data/store.json`。

启动：

```bash
npm run server
```

默认地址：

```text
http://127.0.0.1:8787
```

管理后台：

```text
http://127.0.0.1:8787/admin/
```

常用 API：

- `GET /api/health`
- `GET /api/admin/overview`
- `GET /api/coupons`
- `POST /api/coupons`
- `POST /api/coupons/:id/verify`
- `GET /api/exchanges`
- `PATCH /api/exchanges/:id/status`
- `POST /api/orders`
- `POST /api/orders/:id/pay`
- `POST /api/recharges`
- `GET /api/balance-records`
- `GET /api/merchants`
- `POST /api/merchants`

当前后端面向开发和演示，不包含真实支付、真实核销、真实短信、真实商户扫码设备或生产数据库。上线前需要替换为正式认证、支付回调、数据库、权限和审计服务。

## 本地校验

如果本地安装了 Node.js，可以运行：

```bash
node --test tests/*.test.js
```

也可以只运行后端与后台校验：

```bash
npm run test:backend
```
