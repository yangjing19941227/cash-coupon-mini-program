const state = {
  activeView: 'overview',
  titles: {
    overview: ['总览', '查看项目运行指标与待处理事项'],
    coupons: ['优惠券', '创建、核销与查看用户优惠券资产'],
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
  const payload = await api('/api/coupons');
  document.querySelector('#coupon-list').innerHTML = payload.coupons.length
    ? payload.coupons.map((item) => row({
      title: item.title,
      meta: `${item.merchantName || item.store} · ${item.category} · ￥${item.amount}`,
      badge: item.status,
      actions: item.status === 'unused'
        ? `<button class="small-btn" data-action="verify-coupon" data-id="${item.id}" type="button">核销</button>`
        : '',
    })).join('')
    : empty('暂无优惠券');
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

async function createCoupon() {
  await api('/api/coupons', {
    method: 'POST',
    body: {
      title: '后台测试优惠券',
      merchantName: '后台新增商家',
      category: '餐饮',
      amount: 25,
      threshold: 88,
    },
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
document.querySelector('#create-coupon-button').addEventListener('click', createCoupon);
document.querySelector('#create-order-button').addEventListener('click', createOrder);
document.querySelector('#recharge-button').addEventListener('click', recharge);

refresh();
