const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const { JsonStore } = require('./store');

const rechargeBonus = new Map([
  [100, 10],
  [300, 45],
  [500, 90],
  [800, 160],
  [1000, 220],
]);

const statusText = {
  unused: '未使用',
  used: '已核销',
  expired: '已过期',
  pending_payment: '待支付',
  paid: '已支付',
  completed: '已完成',
  pending: '待确认',
  returned: '已退回',
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PATCH,PUT,OPTIONS',
    'access-control-allow-headers': 'content-type,x-admin-token',
  });
  response.end(JSON.stringify(payload));
}

function sendError(response, statusCode, message, details) {
  sendJson(response, statusCode, {
    ok: false,
    message,
    ...(details ? { details } : {}),
  });
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let raw = '';

    request.on('data', (chunk) => {
      raw += chunk;

      if (raw.length > 1024 * 1024) {
        reject(new Error('REQUEST_BODY_TOO_LARGE'));
        request.destroy();
      }
    });

    request.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error('INVALID_JSON'));
      }
    });

    request.on('error', reject);
  });
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function addDays(isoString, days) {
  const date = new Date(isoString);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function createIdFactory() {
  return (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeUniqueId(state, collectionName, prefix, idFactory) {
  const collection = state[collectionName] || [];
  let id = idFactory(prefix);
  let count = 1;

  while (collection.some((item) => item.id === id)) {
    id = `${idFactory(prefix)}-${count}`;
    count += 1;
  }

  return id;
}

function getMetrics(state) {
  const availableCoupons = state.coupons.filter((coupon) => coupon.status === 'unused');
  const usedCoupons = state.coupons.filter((coupon) => coupon.status === 'used');
  const pendingExchanges = state.exchangeRecords.filter((record) => record.status === 'pending');
  const paidOrders = state.orders.filter((order) => order.status === 'paid');

  return {
    balanceAmount: toNumber(state.userProfile.exchangeAmount),
    availableCoupons: availableCoupons.length,
    usedCoupons: usedCoupons.length,
    totalCouponValue: availableCoupons.reduce((sum, coupon) => sum + toNumber(coupon.amount), 0),
    pendingExchanges: pendingExchanges.length,
    orderCount: state.orders.length,
    paidOrderCount: paidOrders.length,
    revenueAmount: paidOrders.reduce((sum, order) => sum + toNumber(order.amount) * toNumber(order.quantity || 1), 0),
    merchantCount: state.merchants.length,
    pendingLotteryCount: state.lotteryRecords.filter((record) => record.status === 'pending').length,
    verificationCount: state.verificationRecords.length,
  };
}

function filterBySearchParams(items, searchParams, keys) {
  return items.filter((item) => keys.every((key) => {
    const expected = searchParams.get(key);

    if (!expected || expected === '全部') {
      return true;
    }

    return String(item[key]) === expected;
  }));
}

function addBalanceRecord(state, record) {
  const amount = toNumber(record.amount);
  const current = toNumber(state.userProfile.exchangeAmount);
  const balanceAfter = current + amount;

  state.userProfile.exchangeAmount = balanceAfter;
  state.balanceRecords.unshift({
    ...record,
    amount,
    balanceAfter,
  });

  return state.balanceRecords[0];
}

function addActivity(state, item) {
  state.activityItems.unshift(item);
  state.activityItems = state.activityItems.slice(0, 30);
}

function buildCouponFromOrder(order, state, now, idFactory) {
  return {
    id: makeUniqueId(state, 'coupons', 'coupon', idFactory),
    title: order.title,
    category: order.category || '餐饮',
    amount: toNumber(order.amount),
    threshold: 0,
    tags: ['购买获得', order.merchantName].filter(Boolean),
    expiresAt: addDays(now(), 30),
    status: 'unused',
    source: 'self',
    store: order.store || order.merchantName,
    merchantName: order.merchantName,
    code: String(Math.floor(100000000000 + Math.random() * 899999999999)),
    isExpiring: false,
    orderId: order.id,
  };
}

function serveStatic(requestUrl, response) {
  const adminRoot = path.resolve(__dirname, '..', 'admin');
  const pathname = decodeURIComponent(requestUrl.pathname);
  const relative = pathname === '/' || pathname === '/admin' || pathname === '/admin/'
    ? 'index.html'
    : pathname.replace(/^\/admin\/?/, '');
  const filePath = path.resolve(adminRoot, relative);
  const pathFromRoot = path.relative(adminRoot, filePath);

  if (pathFromRoot.startsWith('..') || path.isAbsolute(pathFromRoot)) {
    sendError(response, 403, '拒绝访问');
    return true;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return false;
  }

  const ext = path.extname(filePath);
  const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
  };

  response.writeHead(200, {
    'content-type': contentTypes[ext] || 'application/octet-stream',
  });
  response.end(fs.readFileSync(filePath));
  return true;
}

async function handleApi(request, response, context) {
  const { store, now, idFactory } = context;
  const requestUrl = new URL(request.url, 'http://localhost');
  const { pathname, searchParams } = requestUrl;
  const method = request.method;
  const pathParts = pathname.split('/').filter(Boolean);

  if (method === 'OPTIONS') {
    sendJson(response, 200, { ok: true });
    return;
  }

  let body = {};

  if (['POST', 'PATCH', 'PUT'].includes(method)) {
    try {
      body = await readBody(request);
    } catch (error) {
      sendError(response, 400, error.message === 'INVALID_JSON' ? '请求 JSON 格式错误' : '请求体过大');
      return;
    }
  }

  if (method === 'GET' && pathname === '/api/health') {
    sendJson(response, 200, {
      ok: true,
      service: 'cash-coupon-backend',
      time: now(),
    });
    return;
  }

  if (method === 'GET' && pathname === '/api/admin/overview') {
    const state = store.read();
    sendJson(response, 200, {
      ok: true,
      metrics: getMetrics(state),
      latestActivity: state.activityItems.slice(0, 8),
      pendingExchanges: state.exchangeRecords.filter((record) => record.status === 'pending').slice(0, 5),
      recentOrders: state.orders.slice(0, 5),
    });
    return;
  }

  if (method === 'GET' && pathname === '/api/coupons') {
    const state = store.read();
    const coupons = filterBySearchParams(state.coupons, searchParams, ['status', 'category', 'source']);
    sendJson(response, 200, { ok: true, coupons });
    return;
  }

  if (method === 'POST' && pathname === '/api/coupons') {
    if (!body.title || !toNumber(body.amount)) {
      sendError(response, 400, '优惠券标题和面值不能为空');
      return;
    }

    const coupon = store.update((state) => {
      const item = {
        id: makeUniqueId(state, 'coupons', 'coupon', idFactory),
        title: body.title,
        category: body.category || '餐饮',
        amount: toNumber(body.amount),
        threshold: toNumber(body.threshold),
        tags: Array.isArray(body.tags) ? body.tags : ['后台创建'],
        expiresAt: body.expiresAt || addDays(now(), 30),
        status: body.status || 'unused',
        source: body.source || 'admin',
        store: body.store || body.merchantName || '同城商户',
        merchantName: body.merchantName || body.store || '同城商户',
        code: body.code || String(Math.floor(100000000000 + Math.random() * 899999999999)),
        isExpiring: Boolean(body.isExpiring),
      };

      state.coupons.unshift(item);
      addActivity(state, {
        id: makeUniqueId(state, 'activityItems', 'activity', idFactory),
        icon: 'ticket',
        title: '后台创建优惠券',
        subtitle: item.title,
        amount: `+￥${item.amount}`,
        time: now(),
        tone: 'income',
      });

      return item;
    });

    sendJson(response, 201, { ok: true, coupon });
    return;
  }

  if (method === 'PATCH' && pathParts[1] === 'coupons' && pathParts[2]) {
    const couponId = pathParts[2];
    const result = store.update((state) => {
      const coupon = state.coupons.find((item) => item.id === couponId);

      if (!coupon) {
        return null;
      }

      Object.assign(coupon, body);
      return coupon;
    });

    if (!result) {
      sendError(response, 404, '未找到优惠券');
      return;
    }

    sendJson(response, 200, { ok: true, coupon: result });
    return;
  }

  if (method === 'POST' && pathParts[1] === 'coupons' && pathParts[3] === 'verify') {
    const couponId = pathParts[2];
    const result = store.update((state) => {
      const coupon = state.coupons.find((item) => item.id === couponId);

      if (!coupon) {
        return { type: 'not-found' };
      }

      if (coupon.status !== 'unused') {
        return { type: 'conflict' };
      }

      coupon.status = 'used';
      coupon.verifiedAt = now();

      const record = {
        id: makeUniqueId(state, 'verificationRecords', 'verify', idFactory),
        couponId: coupon.id,
        couponTitle: coupon.title,
        merchantName: body.merchantName || coupon.merchantName || coupon.store,
        operator: body.operator || 'admin',
        verifiedAt: coupon.verifiedAt,
      };

      state.verificationRecords.unshift(record);
      addActivity(state, {
        id: makeUniqueId(state, 'activityItems', 'activity', idFactory),
        icon: 'check',
        title: '优惠券核销',
        subtitle: coupon.title,
        amount: `-￥${coupon.amount}`,
        time: coupon.verifiedAt,
        tone: 'outcome',
      });

      return { type: 'ok', coupon, record };
    });

    if (result.type === 'not-found') {
      sendError(response, 404, '未找到优惠券');
      return;
    }

    if (result.type === 'conflict') {
      sendError(response, 409, '优惠券不可重复核销');
      return;
    }

    sendJson(response, 200, { ok: true, coupon: result.coupon, verification: result.record });
    return;
  }

  if (method === 'GET' && pathname === '/api/verification-records') {
    const state = store.read();
    sendJson(response, 200, { ok: true, records: state.verificationRecords });
    return;
  }

  if (method === 'GET' && pathname === '/api/merchants') {
    sendJson(response, 200, { ok: true, merchants: store.read().merchants });
    return;
  }

  if (method === 'POST' && pathname === '/api/merchants') {
    if (!body.name || !body.store) {
      sendError(response, 400, '商家名称和门店不能为空');
      return;
    }

    const merchant = store.update((state) => {
      const item = {
        id: makeUniqueId(state, 'merchants', 'merchant', idFactory),
        name: body.name,
        store: body.store,
        category: body.category || '本地生活',
        district: body.district || '同城',
        exchangeAmount: toNumber(body.exchangeAmount),
        description: body.description || '后台新增商家权益',
        image: body.image || '/assets/images/merchant-restaurant.png',
      };
      state.merchants.unshift(item);
      return item;
    });

    sendJson(response, 201, { ok: true, merchant });
    return;
  }

  if (method === 'PATCH' && pathParts[1] === 'merchants' && pathParts[2]) {
    const merchant = store.update((state) => {
      const item = state.merchants.find((entry) => entry.id === pathParts[2]);
      if (!item) {
        return null;
      }
      Object.assign(item, body);
      return item;
    });

    if (!merchant) {
      sendError(response, 404, '未找到商家');
      return;
    }

    sendJson(response, 200, { ok: true, merchant });
    return;
  }

  if (method === 'GET' && pathname === '/api/exchanges') {
    const state = store.read();
    const status = searchParams.get('status');
    const exchanges = status && status !== '全部'
      ? state.exchangeRecords.filter((record) => record.status === status)
      : state.exchangeRecords;
    sendJson(response, 200, { ok: true, exchanges });
    return;
  }

  if (method === 'PATCH' && pathParts[1] === 'exchanges' && pathParts[3] === 'status') {
    const allowed = new Set(['pending', 'completed', 'returned', 'expired']);

    if (!allowed.has(body.status)) {
      sendError(response, 400, '置换状态不合法');
      return;
    }

    const result = store.update((state) => {
      const exchange = state.exchangeRecords.find((record) => record.id === pathParts[2]);

      if (!exchange) {
        return null;
      }

      const previousStatus = exchange.status;
      exchange.status = body.status;
      exchange.reviewedAt = now();
      exchange.reason = body.reason || '';

      let balanceRecord = null;

      if (['returned', 'expired'].includes(body.status) && previousStatus === 'pending') {
        balanceRecord = addBalanceRecord(state, {
          id: makeUniqueId(state, 'balanceRecords', 'balance', idFactory),
          type: 'exchange_refund',
          title: `${exchange.title}退回额度`,
          refId: exchange.id,
          amount: toNumber(exchange.amount),
          createdAt: now(),
        });
      }

      addActivity(state, {
        id: makeUniqueId(state, 'activityItems', 'activity', idFactory),
        icon: 'exchange',
        title: `置换${statusText[body.status] || body.status}`,
        subtitle: exchange.title,
        amount: body.status === 'returned' ? `+￥${exchange.amount}` : statusText[body.status],
        time: now(),
        tone: body.status === 'returned' ? 'income' : 'warning',
      });

      return { exchange, balanceRecord };
    });

    if (!result) {
      sendError(response, 404, '未找到置换记录');
      return;
    }

    sendJson(response, 200, { ok: true, exchange: result.exchange, balanceRecord: result.balanceRecord });
    return;
  }

  if (method === 'GET' && pathname === '/api/lottery/state') {
    const state = store.read();
    sendJson(response, 200, { ok: true, lotteryState: state.lotteryState });
    return;
  }

  if (method === 'GET' && pathname === '/api/lottery/records') {
    const state = store.read();
    sendJson(response, 200, { ok: true, records: state.lotteryRecords });
    return;
  }

  if (method === 'POST' && pathname === '/api/lottery/submit') {
    const number = String(body.number || '');

    if (!/^\d{4}$/.test(number)) {
      sendError(response, 400, '请输入完整四位数');
      return;
    }

    const result = store.update((state) => {
      if (toNumber(state.lotteryState.todayLeft) <= 0) {
        return { type: 'empty' };
      }

      state.lotteryState.todayLeft -= 1;
      state.lotteryState.currentNumber = number;
      state.userProfile.lotteryLeft = state.lotteryState.todayLeft;

      const record = {
        id: makeUniqueId(state, 'lotteryRecords', 'lottery', idFactory),
        number,
        prize: state.lotteryState.prize,
        amount: 30,
        createdAt: now(),
        status: 'pending',
      };

      state.lotteryRecords.unshift(record);
      return { type: 'ok', record };
    });

    if (result.type === 'empty') {
      sendError(response, 409, '今日次数已用完');
      return;
    }

    sendJson(response, 201, { ok: true, record: result.record });
    return;
  }

  if (method === 'POST' && pathname === '/api/admin/lottery/settle') {
    const result = store.update((state) => {
      const record = state.lotteryRecords.find((item) => item.id === body.recordId);

      if (!record) {
        return null;
      }

      record.status = body.won ? 'won' : 'lost';
      record.settledAt = now();
      return record;
    });

    if (!result) {
      sendError(response, 404, '未找到抽奖记录');
      return;
    }

    sendJson(response, 200, { ok: true, record: result });
    return;
  }

  if (method === 'GET' && pathname === '/api/orders') {
    const state = store.read();
    const status = searchParams.get('status');
    const orders = status && status !== '全部'
      ? state.orders.filter((order) => order.status === status)
      : state.orders;
    sendJson(response, 200, { ok: true, orders });
    return;
  }

  if (method === 'POST' && pathname === '/api/orders') {
    if (!body.title || !toNumber(body.amount)) {
      sendError(response, 400, '订单商品和金额不能为空');
      return;
    }

    const order = store.update((state) => {
      const item = {
        id: makeUniqueId(state, 'orders', 'order', idFactory),
        title: body.title,
        merchantName: body.merchantName || '同城商户',
        store: body.store || body.merchantName || '同城商户',
        category: body.category || '餐饮',
        amount: toNumber(body.amount),
        quantity: toNumber(body.quantity) || 1,
        status: 'pending_payment',
        createdAt: now(),
      };
      state.orders.unshift(item);
      return item;
    });

    sendJson(response, 201, { ok: true, order });
    return;
  }

  if (method === 'POST' && pathParts[1] === 'orders' && pathParts[3] === 'pay') {
    const orderId = pathParts[2];
    const result = store.update((state) => {
      const order = state.orders.find((item) => item.id === orderId);

      if (!order) {
        return { type: 'not-found' };
      }

      if (order.status !== 'pending_payment') {
        return { type: 'conflict' };
      }

      order.status = 'paid';
      order.paymentMethod = body.method || 'wechat';
      order.paidAt = now();

      const coupon = buildCouponFromOrder(order, state, now, idFactory);
      order.couponId = coupon.id;
      state.coupons.unshift(coupon);

      addActivity(state, {
        id: makeUniqueId(state, 'activityItems', 'activity', idFactory),
        icon: 'ticket',
        title: '购买优惠券',
        subtitle: order.title,
        amount: `+￥${coupon.amount}`,
        time: now(),
        tone: 'income',
      });

      return { type: 'ok', order, coupon };
    });

    if (result.type === 'not-found') {
      sendError(response, 404, '未找到订单');
      return;
    }

    if (result.type === 'conflict') {
      sendError(response, 409, '订单当前状态不可支付');
      return;
    }

    sendJson(response, 200, { ok: true, order: result.order, coupon: result.coupon });
    return;
  }

  if (method === 'GET' && pathname === '/api/balance-records') {
    const state = store.read();
    const type = searchParams.get('type');
    const records = type
      ? state.balanceRecords.filter((record) => record.type === type)
      : state.balanceRecords;
    sendJson(response, 200, { ok: true, records });
    return;
  }

  if (method === 'POST' && pathname === '/api/recharges') {
    const paymentAmount = toNumber(body.amount);

    if (paymentAmount < 50) {
      sendError(response, 400, '充值金额不能低于 50 元');
      return;
    }

    const record = store.update((state) => {
      const bonus = rechargeBonus.get(paymentAmount) || 0;
      const totalAmount = paymentAmount + bonus;

      const item = addBalanceRecord(state, {
        id: makeUniqueId(state, 'balanceRecords', 'balance', idFactory),
        type: 'recharge',
        title: bonus ? `充值${paymentAmount}送${bonus}` : `充值${paymentAmount}`,
        refId: makeUniqueId(state, 'orders', 'recharge', idFactory),
        amount: totalAmount,
        paymentAmount,
        bonusAmount: bonus,
        channel: body.channel || 'wechat',
        createdAt: now(),
      });

      addActivity(state, {
        id: makeUniqueId(state, 'activityItems', 'activity', idFactory),
        icon: 'wallet',
        title: '充值到账',
        subtitle: item.title,
        amount: `+￥${item.amount}`,
        time: now(),
        tone: 'income',
      });

      return item;
    });

    sendJson(response, 201, { ok: true, record });
    return;
  }

  if (method === 'POST' && pathname === '/api/dev/reset') {
    sendJson(response, 200, { ok: true, state: store.reset() });
    return;
  }

  sendError(response, 404, '接口不存在');
}

function createApp(options = {}) {
  const store = options.store || new JsonStore();
  const now = options.now || (() => new Date().toISOString());
  const idFactory = options.idFactory || createIdFactory();

  return http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url, 'http://localhost');

    try {
      if (requestUrl.pathname.startsWith('/api/')) {
        await handleApi(request, response, { store, now, idFactory });
        return;
      }

      if (serveStatic(requestUrl, response)) {
        return;
      }

      sendError(response, 404, '页面不存在');
    } catch (error) {
      sendError(response, 500, '服务器内部错误', { error: error.message });
    }
  });
}

module.exports = {
  createApp,
  getMetrics,
};
