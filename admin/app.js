const state = {
  activeView: 'overview',
  couponTemplates: [],
  titles: {
    overview: ['总览', '查看项目运行指标与待处理事项'],
    coupons: ['优惠券', '配置商户可上架、可发放和可购买的优惠券'],
    exchanges: ['置换审核', '处理用户发起的商家权益置换申请'],
    orders: ['订单', '查看订单并模拟支付履约流程'],
    merchants: ['商家', '维护可置换和可购买的本地商家权益'],
    ledger: ['余额流水', '查看充值、退回与账户额度变化'],
  },
};

async function api(pathname, options = {}) {
  const response = await fetch(pathname, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || '请求失败');
  }

  return payload;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function row({ title, meta, badge, actions = '' }) {
  return `
    <div class="row">
      <div>
        <span class="row-title">${escapeHtml(title)}</span>
        <span class="row-meta">${escapeHtml(meta)}</span>
      </div>
      <div class="row-actions">
        ${badge ? `<span class="badge">${escapeHtml(badge)}</span>` : ''}
        ${actions}
      </div>
    </div>
  `;
}

function empty(text) {
  return `<div class="empty">${escapeHtml(text)}</div>`;
}

function splitScope(value) {
  return String(value || '')
    .split(/[\s,，、]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getFormNumber(formData, name, fallback = 0) {
  const value = Number(formData.get(name));
  return Number.isFinite(value) ? value : fallback;
}

function formatScope(scope, fallback = '不限制') {
  const items = Array.isArray(scope) ? scope.filter(Boolean) : [];
  return items.length ? items.join('、') : fallback;
}

function getTemplateUser(template) {
  const users = Array.isArray(template?.userScope) ? template.userScope.filter(Boolean) : [];
  return users[0] || 'user-haikou-life';
}

function getDisplayImageUrl(image) {
  const value = String(image || '').trim();

  if (!value) {
    return '/assets/images/coupon-deal-tea-clean.png';
  }

  if (value.startsWith('/uploads/')) {
    return value;
  }

  return value;
}

function readCouponForm(event) {
  const form = event?.currentTarget || document.querySelector('#coupon-config-form');
  const formData = new FormData(form);
  const stock = getFormNumber(formData, 'stock');
  const amount = getFormNumber(formData, 'amount');
  const threshold = getFormNumber(formData, 'threshold');
  const salePrice = getFormNumber(formData, 'salePrice', amount);
  const image = String(formData.get('image') || '').trim();

  const payload = {
    merchantName: String(formData.get('merchantName') || '').trim(),
    store: String(formData.get('store') || '').trim(),
    title: String(formData.get('title') || '').trim(),
    category: String(formData.get('category') || '餐饮').trim(),
    salePrice,
    amount,
    threshold,
    stock,
    totalStock: stock,
    status: 'online',
    userScope: splitScope(formData.get('userScope')),
    verifierScope: splitScope(formData.get('verifierScope')),
  };

  if (image) {
    payload.image = image;
  }

  return payload;
}

function setActiveView(view) {
  state.activeView = view;
  const [title, subtitle] = state.titles[view];
  document.querySelector('#view-title').textContent = title;
  document.querySelector('#view-subtitle').textContent = subtitle;

  document.querySelectorAll('.nav-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.view === view);
  });
  document.querySelectorAll('.view-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.id === `view-${view}`);
  });

  refresh();
}

function renderMetrics(metrics) {
  const items = [
    ['账户余额', `￥${metrics.balanceAmount}`],
    ['可用优惠券', metrics.availableCoupons],
    ['待审核置换', metrics.pendingExchanges],
    ['订单收入', `￥${metrics.revenueAmount}`],
    ['商家数', metrics.merchantCount],
    ['已核销', metrics.usedCoupons],
    ['抽奖待开奖', metrics.pendingLotteryCount],
    ['核销记录', metrics.verificationCount],
  ];

  document.querySelector('#metric-grid').innerHTML = items
    .map(([label, value]) => `<article class="metric-card"><span>${label}</span><b>${value}</b></article>`)
    .join('');
}

async function renderOverview() {
  const payload = await api('/api/admin/overview');
  renderMetrics(payload.metrics);

  document.querySelector('#overview-exchanges').innerHTML = payload.pendingExchanges.length
    ? payload.pendingExchanges.map((item) => row({
      title: item.title,
      meta: `${item.store || item.merchantName} · ${item.amount} 额度`,
      badge: '待确认',
      actions: `<button class="small-btn" data-action="approve-exchange" data-id="${item.id}" type="button">通过</button>
        <button class="danger-btn" data-action="return-exchange" data-id="${item.id}" type="button">退回</button>`,
    })).join('')
    : empty('暂无待处理置换申请');

  document.querySelector('#overview-activity').innerHTML = payload.latestActivity.length
    ? payload.latestActivity.map((item) => row({
      title: item.title,
      meta: `${item.subtitle || ''} · ${item.time || ''}`,
      badge: item.amount,
    })).join('')
    : empty('暂无动态');
}

async function renderCoupons() {
  const payload = await api('/api/coupon-templates');
  state.couponTemplates = payload.templates || [];
  document.querySelector('#coupon-list').innerHTML = state.couponTemplates.length
    ? state.couponTemplates.map((item) => row({
      title: item.title,
      meta: `${item.merchantName || item.store} · ${item.category} · 售价￥${item.salePrice || item.amount} · 面值￥${item.amount} · 门槛￥${item.threshold || 0} · 库存 ${item.stock} · 领券用户 ${formatScope(item.userScope)} · 核销用户 ${formatScope(item.verifierScope)}`,
      badge: item.status,
      actions: [
        item.status === 'online'
          ? `<button class="small-btn" data-action="assign-coupon-template" data-id="${item.id}" type="button">发给 ${escapeHtml(getTemplateUser(item))}</button>`
          : '',
        `<button class="danger-btn" data-action="delete-coupon-template" data-id="${item.id}" type="button">删除</button>`,
      ].filter(Boolean).join(''),
    })).join('')
    : empty('暂无商户优惠券配置');
}

async function renderExchanges() {
  const payload = await api('/api/exchanges');
  document.querySelector('#exchange-list').innerHTML = payload.exchanges.length
    ? payload.exchanges.map((item) => row({
      title: item.title,
      meta: `${item.store || item.merchantName} · ${item.amount} 额度`,
      badge: item.status,
      actions: item.status === 'pending'
        ? `<button class="small-btn" data-action="approve-exchange" data-id="${item.id}" type="button">通过</button>
          <button class="danger-btn" data-action="return-exchange" data-id="${item.id}" type="button">退回</button>`
        : '',
    })).join('')
    : empty('暂无置换记录');
}

async function renderOrders() {
  const payload = await api('/api/orders');
  document.querySelector('#order-list').innerHTML = payload.orders.length
    ? payload.orders.map((item) => row({
      title: item.title,
      meta: `${item.merchantName} · ￥${item.amount} · ${item.createdAt || ''}`,
      badge: item.status,
      actions: item.status === 'pending_payment'
        ? `<button class="small-btn" data-action="pay-order" data-id="${item.id}" type="button">确认支付</button>`
        : '',
    })).join('')
    : empty('暂无订单');
}

async function renderMerchants() {
  const payload = await api('/api/merchants');
  document.querySelector('#merchant-list').innerHTML = payload.merchants.length
    ? payload.merchants.map((item) => row({
      title: item.name,
      meta: `${item.store} · ${item.category} · ${item.district}`,
      badge: `${item.exchangeAmount} 额度`,
    })).join('')
    : empty('暂无商家');
}

async function renderLedger() {
  const payload = await api('/api/balance-records');
  document.querySelector('#ledger-list').innerHTML = payload.records.length
    ? payload.records.map((item) => row({
      title: item.title,
      meta: `${item.type} · ${item.createdAt}`,
      badge: `${item.amount >= 0 ? '+' : ''}${item.amount}`,
    })).join('')
    : empty('暂无流水');
}

async function verifyCoupon(id) {
  await api(`/api/coupons/${id}/verify`, {
    method: 'POST',
    body: { merchantName: '后台核销', operator: 'admin' },
  });
  await refresh();
}

async function assignCouponTemplate(id) {
  const template = state.couponTemplates.find((item) => item.id === id);
  await api(`/api/coupon-templates/${id}/assign`, {
    method: 'POST',
    body: { userId: getTemplateUser(template) },
  });
  await refresh();
}

async function deleteCouponTemplate(id) {
  if (typeof window !== 'undefined' && !window.confirm('确定删除这条商户优惠券配置吗？')) {
    return;
  }

  await api(`/api/coupon-templates/${id}`, {
    method: 'DELETE',
  });
  await refresh();
}

async function reviewExchange(id, status) {
  await api(`/api/exchanges/${id}/status`, {
    method: 'PATCH',
    body: { status, reason: status === 'returned' ? '后台退回' : '后台审核通过' },
  });
  await refresh();
}

async function createMerchant() {
  await api('/api/merchants', {
    method: 'POST',
    body: {
      name: '后台新增商家',
      store: '同城体验店',
      category: '本地生活',
      district: '龙华区',
      exchangeAmount: 188,
    },
  });
  await refresh();
}

async function createCoupon(event) {
  event?.preventDefault();
  const payload = readCouponForm(event);

  await api('/api/coupon-templates', {
    method: 'POST',
    body: payload,
  });
  await refresh();
}

async function createOrder() {
  await api('/api/orders', {
    method: 'POST',
    body: {
      title: '后台创建测试订单',
      merchantName: '海岛小院',
      amount: 128,
      quantity: 1,
    },
  });
  await refresh();
}

async function payOrder(id) {
  await api(`/api/orders/${id}/pay`, {
    method: 'POST',
    body: { method: 'wechat' },
  });
  await refresh();
}

async function recharge() {
  await api('/api/recharges', {
    method: 'POST',
    body: { amount: 300, channel: 'wechat' },
  });
  await refresh();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.readAsDataURL(file);
  });
}

async function uploadCouponImage(event) {
  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  const status = document.querySelector('#coupon-image-status');
  const preview = document.querySelector('#coupon-image-preview');
  const imageInput = document.querySelector('#coupon-image-url-input');

  try {
    status.textContent = '图片上传中...';
    const dataUrl = await readFileAsDataUrl(file);
    const payload = await api('/api/uploads', {
      method: 'POST',
      body: {
        filename: file.name,
        dataUrl,
      },
    });

    imageInput.value = payload.url;
    preview.src = getDisplayImageUrl(payload.url);
    status.textContent = '图片已上传';
  } catch (error) {
    imageInput.value = '';
    status.textContent = error.message;
    alert(error.message);
  }
}

async function refresh() {
  const renderers = {
    overview: renderOverview,
    coupons: renderCoupons,
    exchanges: renderExchanges,
    orders: renderOrders,
    merchants: renderMerchants,
    ledger: renderLedger,
  };

  try {
    await renderers[state.activeView]();
  } catch (error) {
    alert(error.message);
  }
}

document.addEventListener('click', async (event) => {
  const viewButton = event.target.closest('[data-view]');
  const actionButton = event.target.closest('[data-action]');

  if (viewButton) {
    setActiveView(viewButton.dataset.view);
    return;
  }

  if (!actionButton) {
    return;
  }

  const { action, id } = actionButton.dataset;

  if (action === 'verify-coupon') {
    await verifyCoupon(id);
  } else if (action === 'assign-coupon-template') {
    await assignCouponTemplate(id);
  } else if (action === 'delete-coupon-template') {
    await deleteCouponTemplate(id);
  } else if (action === 'approve-exchange') {
    await reviewExchange(id, 'completed');
  } else if (action === 'return-exchange') {
    await reviewExchange(id, 'returned');
  } else if (action === 'pay-order') {
    await payOrder(id);
  }
});

document.querySelector('#refresh-button').addEventListener('click', refresh);
document.querySelector('#create-merchant-button').addEventListener('click', createMerchant);
document.querySelector('#coupon-config-form').addEventListener('submit', createCoupon);
document.querySelector('#coupon-image-input').addEventListener('change', uploadCouponImage);
document.querySelector('#create-order-button').addEventListener('click', createOrder);
document.querySelector('#recharge-button').addEventListener('click', recharge);

refresh();
