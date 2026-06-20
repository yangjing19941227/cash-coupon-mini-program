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
    'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
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

      if (raw.length > 8 * 1024 * 1024) {
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

function getUploadRoot() {
  return path.resolve(process.cwd(), '.data', 'uploads');
}

function getImageContentType(extname) {
  const types = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  };

  return types[extname.toLowerCase()] || '';
}

function sanitizeUploadName(filename) {
  const parsed = path.parse(String(filename || 'coupon-image'));
  const base = parsed.name
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return base || 'coupon-image';
}

function parseImageDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:(image\/(?:png|jpe?g|webp|gif));base64,([a-z0-9+/=\r\n]+)$/i);

  if (!match) {
    return null;
  }

  const mimeType = match[1].toLowerCase().replace('image/jpg', 'image/jpeg');
  const extByMime = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
  };

  return {
    mimeType,
    extname: extByMime[mimeType],
    buffer: Buffer.from(match[2].replace(/\s/g, ''), 'base64'),
  };
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

function makeCouponCode() {
  return String(Math.floor(100000000000 + Math.random() * 899999999999));
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

function buildMockOpenId(code) {
  const hex = Array.from(String(code))
    .map((character) => character.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');

  return `mock-openid-${hex.slice(0, 12)}`;
}

function normalizeProfilePatch(body) {
  const patch = {};

  if (typeof body.nickname === 'string') {
    const nickname = body.nickname.trim().slice(0, 24);

    if (nickname) {
      patch.nickname = nickname;
    }
  }

  if (typeof body.avatarUrl === 'string' || typeof body.avatar === 'string') {
    const avatar = String(body.avatarUrl || body.avatar).trim();

    if (avatar) {
      patch.avatar = avatar;
    }
  }

  return patch;
}

function normalizeScope(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value.split(/[\s,，、]+/).map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

function findCouponTemplate(state, templateId) {
  return (state.couponTemplates || []).find((template) => template.id === templateId);
}

function buildCouponFromTemplate(template, state, now, idFactory, options = {}) {
  return {
    id: makeUniqueId(state, 'coupons', 'coupon', idFactory),
    templateId: template.id,
    userId: options.userId || state.userProfile.id,
    title: template.title,
    category: template.category || '餐饮',
    amount: toNumber(template.amount),
    threshold: toNumber(template.threshold),
    tags: Array.isArray(template.tags) ? template.tags : ['后台配置'],
    expiresAt: options.expiresAt || addDays(now(), toNumber(template.expiresInDays) || 30),
    status: 'unused',
    source: options.source || 'admin_assign',
    store: template.store || template.merchantName,
    merchantId: template.merchantId,
    merchantName: template.merchantName || template.store,
    verifierScope: normalizeScope(template.verifierScope),
    code: options.code || makeCouponCode(),
    isExpiring: false,
    orderId: options.orderId,
    assignedAt: now(),
  };
}

function buildCouponFromOrder(order, state, now, idFactory) {
  const template = findCouponTemplate(state, order.templateId);

  if (template) {
    return buildCouponFromTemplate(template, state, now, idFactory, {
      source: 'purchase',
      orderId: order.id,
      userId: order.userId || state.userProfile.id,
    });
  }

  return {
    id: makeUniqueId(state, 'coupons', 'coupon', idFactory),
    templateId: order.templateId,
    userId: order.userId || state.userProfile.id,
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
    code: makeCouponCode(),
    isExpiring: false,
    orderId: order.id,
    assignedAt: now(),
  };
}

function verifyCouponAsset(state, coupon, body, now, idFactory) {
  if (!coupon) {
    return { type: 'not-found' };
  }

  if (coupon.status !== 'unused') {
    return { type: 'conflict' };
  }

  const requestedMerchant = String(body.merchantName || body.merchantId || '').trim();
  const allowedMerchants = [
    coupon.merchantId,
    coupon.merchantName,
    coupon.store,
  ].filter(Boolean).map(String);

  if (requestedMerchant && !allowedMerchants.includes(requestedMerchant)) {
    return { type: 'forbidden' };
  }

  const template = coupon.templateId ? findCouponTemplate(state, coupon.templateId) : null;
  const verifierScope = normalizeScope(coupon.verifierScope).length
    ? normalizeScope(coupon.verifierScope)
    : normalizeScope(template?.verifierScope);
  const operator = String(body.operator || body.operatorId || body.userId || '').trim();

  if (verifierScope.length && !verifierScope.includes(operator)) {
    return { type: 'forbidden' };
  }

  coupon.status = 'used';
  coupon.verifiedAt = now();

  const record = {
    id: makeUniqueId(state, 'verificationRecords', 'verify', idFactory),
    couponId: coupon.id,
    couponCode: coupon.code,
    couponTitle: coupon.title,
    merchantName: body.merchantName || coupon.merchantName || coupon.store,
    operator: operator || 'admin',
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

function serveUpload(requestUrl, response) {
  const uploadRoot = getUploadRoot();
  const pathname = decodeURIComponent(requestUrl.pathname);
  const relative = pathname.replace(/^\/uploads\/?/, '');
  const filePath = path.resolve(uploadRoot, relative);
  const pathFromRoot = path.relative(uploadRoot, filePath);

  if (!relative || pathFromRoot.startsWith('..') || path.isAbsolute(pathFromRoot)) {
    sendError(response, 403, '拒绝访问');
    return true;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return false;
  }

  const contentType = getImageContentType(path.extname(filePath));

  if (!contentType) {
    sendError(response, 415, '不支持的图片格式');
    return true;
  }

  response.writeHead(200, {
    'content-type': contentType,
    'cache-control': 'public, max-age=31536000',
    'access-control-allow-origin': '*',
  });
  fs.createReadStream(filePath).pipe(response);
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

  if (method === 'POST' && pathname === '/api/auth/wechat-login') {
    const code = String(body.code || '').trim();

    if (!code) {
      sendError(response, 400, '微信登录凭证不能为空');
      return;
    }

    const result = store.update((state) => {
      const session = {
        id: makeUniqueId(state, 'sessions', 'session', idFactory),
        openId: buildMockOpenId(code),
        loginCode: code,
        createdAt: now(),
      };

      state.sessions.unshift(session);
      state.sessions = state.sessions.slice(0, 20);
      state.userProfile.wechatOpenId = session.openId;
      state.userProfile.lastLoginAt = session.createdAt;

      return {
        sessionToken: session.id,
        profile: state.userProfile,
      };
    });

    sendJson(response, 200, {
      ok: true,
      sessionToken: result.sessionToken,
      profile: result.profile,
    });
    return;
  }

  if (method === 'GET' && pathname === '/api/user/profile') {
    sendJson(response, 200, { ok: true, profile: store.read().userProfile });
    return;
  }

  if (method === 'PATCH' && pathname === '/api/user/profile') {
    const patch = normalizeProfilePatch(body);

    if (!Object.keys(patch).length) {
      sendError(response, 400, '请提供头像或昵称');
      return;
    }

    const profile = store.update((state) => {
      Object.assign(state.userProfile, patch, {
        updatedAt: now(),
      });

      addActivity(state, {
        id: makeUniqueId(state, 'activityItems', 'activity', idFactory),
        icon: 'user',
        title: '同步微信资料',
        subtitle: state.userProfile.nickname,
        amount: '已更新',
        time: now(),
        tone: 'income',
      });

      return state.userProfile;
    });

    sendJson(response, 200, { ok: true, profile });
    return;
  }

  if (method === 'POST' && pathname === '/api/uploads') {
    const image = parseImageDataUrl(body.dataUrl);

    if (!image || !image.buffer.length) {
      sendError(response, 400, '请上传 png、jpg、webp 或 gif 图片');
      return;
    }

    if (image.buffer.length > 5 * 1024 * 1024) {
      sendError(response, 413, '图片不能超过 5MB');
      return;
    }

    const uploadRoot = getUploadRoot();
    const basename = sanitizeUploadName(body.filename);
    const suffix = Math.random().toString(36).slice(2, 8);
    const filename = `${basename}-${suffix}${image.extname}`;
    const filePath = path.join(uploadRoot, filename);

    fs.mkdirSync(uploadRoot, { recursive: true });
    fs.writeFileSync(filePath, image.buffer);

    sendJson(response, 201, {
      ok: true,
      url: `/uploads/${filename}`,
      mimeType: image.mimeType,
      size: image.buffer.length,
    });
    return;
  }

  if (method === 'GET' && pathname === '/api/coupon-templates') {
    const state = store.read();
    const templates = filterBySearchParams(
      state.couponTemplates || [],
      searchParams,
      ['status', 'category', 'merchantId'],
    );
    sendJson(response, 200, { ok: true, templates });
    return;
  }

  if (method === 'POST' && pathname === '/api/coupon-templates') {
    if (!body.title || !body.merchantName || !toNumber(body.amount)) {
      sendError(response, 400, '商户、优惠券标题和面值不能为空');
      return;
    }

    const template = store.update((state) => {
      const item = {
        id: makeUniqueId(state, 'couponTemplates', 'template', idFactory),
        title: body.title,
        merchantId: body.merchantId || '',
        merchantName: body.merchantName,
        store: body.store || body.merchantName,
        category: body.category || '餐饮',
        amount: toNumber(body.amount),
        threshold: toNumber(body.threshold),
        salePrice: toNumber(body.salePrice) || toNumber(body.amount),
        price: body.price || `￥${toNumber(body.amount)}`,
        discount: body.discount || (toNumber(body.threshold) ? `满${toNumber(body.threshold)}可用` : '无门槛'),
        badge: body.badge || '后台配置',
        sales: body.sales || '后台配置券',
        rank: body.rank || '商户权益',
        rating: body.rating || '4.8分',
        distance: body.distance || '同城可用',
        stock: Math.max(0, toNumber(body.stock) || 0),
        totalStock: Math.max(0, toNumber(body.totalStock) || toNumber(body.stock) || 0),
        status: body.status || 'online',
        userScope: normalizeScope(body.userScope),
        verifierScope: normalizeScope(body.verifierScope),
        image: body.image || '/assets/images/coupon-deal-tea-clean.png',
        expiresInDays: toNumber(body.expiresInDays) || 30,
        tags: Array.isArray(body.tags) ? body.tags : ['后台配置'],
        createdAt: now(),
      };

      state.couponTemplates.unshift(item);
      addActivity(state, {
        id: makeUniqueId(state, 'activityItems', 'activity', idFactory),
        icon: 'ticket',
        title: '后台配置商户券',
        subtitle: item.title,
        amount: `+￥${item.amount}`,
        time: now(),
        tone: 'income',
      });

      return item;
    });

    sendJson(response, 201, { ok: true, template });
    return;
  }

  if (method === 'DELETE' && pathParts[1] === 'coupon-templates' && pathParts[2]) {
    const templateId = pathParts[2];
    const result = store.update((state) => {
      const templateIndex = state.couponTemplates.findIndex((item) => item.id === templateId);

      if (templateIndex === -1) {
        return null;
      }

      const [template] = state.couponTemplates.splice(templateIndex, 1);
      addActivity(state, {
        id: makeUniqueId(state, 'activityItems', 'activity', idFactory),
        icon: 'ticket',
        title: '后台删除商户券配置',
        subtitle: template.title,
        amount: `-￥${template.amount}`,
        time: now(),
        tone: 'warning',
      });

      return template;
    });

    if (!result) {
      sendError(response, 404, '未找到优惠券配置');
      return;
    }

    sendJson(response, 200, { ok: true, template: result });
    return;
  }

  if (method === 'PATCH' && pathParts[1] === 'coupon-templates' && pathParts[2]) {
    const templateId = pathParts[2];
    const result = store.update((state) => {
      const template = state.couponTemplates.find((item) => item.id === templateId);

      if (!template) {
        return null;
      }

      Object.assign(template, body, {
        amount: body.amount === undefined ? template.amount : toNumber(body.amount),
        threshold: body.threshold === undefined ? template.threshold : toNumber(body.threshold),
        stock: body.stock === undefined ? template.stock : Math.max(0, toNumber(body.stock)),
        totalStock: body.totalStock === undefined ? template.totalStock : Math.max(0, toNumber(body.totalStock)),
        userScope: body.userScope === undefined ? template.userScope : normalizeScope(body.userScope),
        verifierScope: body.verifierScope === undefined ? template.verifierScope : normalizeScope(body.verifierScope),
      });
      return template;
    });

    if (!result) {
      sendError(response, 404, '未找到优惠券配置');
      return;
    }

    sendJson(response, 200, { ok: true, template: result });
    return;
  }

  if (method === 'POST' && pathParts[1] === 'coupon-templates' && pathParts[3] === 'assign') {
    const templateId = pathParts[2];
    const result = store.update((state) => {
      const template = findCouponTemplate(state, templateId);
      const userId = body.userId || state.userProfile.id;

      if (!template) {
        return { type: 'not-found' };
      }

      if (template.status !== 'online') {
        return { type: 'offline' };
      }

      if (Array.isArray(template.userScope) && template.userScope.length && !template.userScope.includes(userId)) {
        return { type: 'forbidden' };
      }

      if (toNumber(template.stock) <= 0) {
        return { type: 'empty' };
      }

      template.stock = toNumber(template.stock) - 1;
      const coupon = buildCouponFromTemplate(template, state, now, idFactory, {
        userId,
        source: 'admin_assign',
      });

      state.coupons.unshift(coupon);
      addActivity(state, {
        id: makeUniqueId(state, 'activityItems', 'activity', idFactory),
        icon: 'ticket',
        title: '后台发放优惠券',
        subtitle: `${template.merchantName} · ${template.title}`,
        amount: `+￥${template.amount}`,
        time: now(),
        tone: 'income',
      });

      return { type: 'ok', template, coupon };
    });

    if (result.type === 'not-found') {
      sendError(response, 404, '未找到优惠券配置');
      return;
    }

    if (result.type === 'offline') {
      sendError(response, 409, '优惠券配置未上架');
      return;
    }

    if (result.type === 'forbidden') {
      sendError(response, 403, '该用户不在发放范围内');
      return;
    }

    if (result.type === 'empty') {
      sendError(response, 409, '优惠券库存不足');
      return;
    }

    sendJson(response, 201, { ok: true, template: result.template, coupon: result.coupon });
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

  if (method === 'DELETE' && pathParts[1] === 'coupons' && pathParts[2]) {
    const couponId = pathParts[2];
    const result = store.update((state) => {
      const couponIndex = state.coupons.findIndex((item) => item.id === couponId);

      if (couponIndex === -1) {
        return null;
      }

      const [coupon] = state.coupons.splice(couponIndex, 1);
      addActivity(state, {
        id: makeUniqueId(state, 'activityItems', 'activity', idFactory),
        icon: 'ticket',
        title: '后台删除优惠券',
        subtitle: coupon.title,
        amount: `-￥${coupon.amount}`,
        time: now(),
        tone: 'warning',
      });

      return coupon;
    });

    if (!result) {
      sendError(response, 404, '未找到优惠券');
      return;
    }

    sendJson(response, 200, { ok: true, coupon: result });
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
      return verifyCouponAsset(state, coupon, body, now, idFactory);
    });

    if (result.type === 'not-found') {
      sendError(response, 404, '未找到优惠券');
      return;
    }

    if (result.type === 'conflict') {
      sendError(response, 409, '优惠券不可重复核销');
      return;
    }

    if (result.type === 'forbidden') {
      sendError(response, 403, '该商户无权核销此优惠券');
      return;
    }

    sendJson(response, 200, { ok: true, coupon: result.coupon, verification: result.record });
    return;
  }

  if (method === 'POST' && pathname === '/api/merchant/coupons/verify') {
    const code = String(body.code || '').trim();
    const couponId = String(body.couponId || '').trim();

    if (!code && !couponId) {
      sendError(response, 400, '请提供优惠券码');
      return;
    }

    const result = store.update((state) => {
      const coupon = state.coupons.find((item) => (
        (code && item.code === code) || (couponId && item.id === couponId)
      ));
      return verifyCouponAsset(state, coupon, body, now, idFactory);
    });

    if (result.type === 'not-found') {
      sendError(response, 404, '未找到优惠券');
      return;
    }

    if (result.type === 'conflict') {
      sendError(response, 409, '优惠券不可重复核销');
      return;
    }

    if (result.type === 'forbidden') {
      sendError(response, 403, '该商户无权核销此优惠券');
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
        templateId: body.templateId || body.couponTemplateId || '',
        userId: body.userId || state.userProfile.id,
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

      const template = findCouponTemplate(state, order.templateId);

      if (template && toNumber(template.stock) > 0) {
        template.stock = toNumber(template.stock) - 1;
      }

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

      if (requestUrl.pathname.startsWith('/uploads/')) {
        if (serveUpload(requestUrl, response)) {
          return;
        }

        sendError(response, 404, '图片不存在');
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
