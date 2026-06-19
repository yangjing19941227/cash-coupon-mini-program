const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { createApp } = require('../server/app');
const { JsonStore } = require('../server/store');

function createTestServer() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cash-coupon-api-'));
  const dataFile = path.join(tempDir, 'store.json');
  const store = new JsonStore({ filePath: dataFile });
  const server = createApp({
    store,
    now: () => '2026-06-19T12:00:00.000Z',
    idFactory: (prefix) => `${prefix}-test-id`,
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        port,
        close: () => new Promise((done) => {
          let settled = false;
          const finish = () => {
            if (settled) {
              return;
            }

            settled = true;
            done();
          };
          const timer = setTimeout(finish, 1000);
          timer.unref?.();

          server.close(() => {
            clearTimeout(timer);
            finish();
          });
          server.closeIdleConnections?.();
          server.closeAllConnections?.();
        }),
      });
    });
  });
}

async function requestJson(baseUrl, pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const payload = await response.json();
  return { response, payload };
}

test('backend exposes health, overview and admin shell', async () => {
  const server = await createTestServer();

  try {
    const health = await requestJson(server.baseUrl, '/api/health');
    assert.equal(health.response.status, 200);
    assert.equal(health.payload.ok, true);

    const overview = await requestJson(server.baseUrl, '/api/admin/overview');
    assert.equal(overview.response.status, 200);
    assert.ok(overview.payload.metrics.availableCoupons >= 1);
    assert.ok(overview.payload.metrics.pendingExchanges >= 1);
    assert.ok(Array.isArray(overview.payload.latestActivity));

    const admin = await fetch(`${server.baseUrl}/admin/`);
    const html = await admin.text();
    assert.equal(admin.status, 200);
    assert.match(html, /同城名惠管理后台/);
    assert.match(html, /data-view="coupons"/);
  } finally {
    await server.close();
  }
});

test('backend handles recharge, order payment and coupon verification', async () => {
  const server = await createTestServer();

  try {
    const before = await requestJson(server.baseUrl, '/api/admin/overview');
    const startingBalance = before.payload.metrics.balanceAmount;

    const recharge = await requestJson(server.baseUrl, '/api/recharges', {
      method: 'POST',
      body: { amount: 300, channel: 'wechat' },
    });
    assert.equal(recharge.response.status, 201);
    assert.equal(recharge.payload.record.amount, 345);

    const afterRecharge = await requestJson(server.baseUrl, '/api/admin/overview');
    assert.equal(afterRecharge.payload.metrics.balanceAmount, startingBalance + 345);

    const order = await requestJson(server.baseUrl, '/api/orders', {
      method: 'POST',
      body: {
        title: '海岛小院·双人海鲜套餐券',
        merchantName: '海岛小院',
        amount: 128,
        quantity: 1,
      },
    });
    assert.equal(order.response.status, 201);
    assert.equal(order.payload.order.status, 'pending_payment');

    const paid = await requestJson(server.baseUrl, `/api/orders/${order.payload.order.id}/pay`, {
      method: 'POST',
      body: { method: 'wechat' },
    });
    assert.equal(paid.response.status, 200);
    assert.equal(paid.payload.order.status, 'paid');
    assert.equal(paid.payload.coupon.status, 'unused');

    const verified = await requestJson(server.baseUrl, `/api/coupons/${paid.payload.coupon.id}/verify`, {
      method: 'POST',
      body: { merchantName: '海岛小院', operator: 'admin' },
    });
    assert.equal(verified.response.status, 200);
    assert.equal(verified.payload.coupon.status, 'used');

    const duplicate = await requestJson(server.baseUrl, `/api/coupons/${paid.payload.coupon.id}/verify`, {
      method: 'POST',
      body: { merchantName: '海岛小院', operator: 'admin' },
    });
    assert.equal(duplicate.response.status, 409);
    assert.match(duplicate.payload.message, /不可重复核销/);
  } finally {
    await server.close();
  }
});

test('backend lets admins review exchange requests and manage merchants', async () => {
  const server = await createTestServer();

  try {
    const merchants = await requestJson(server.baseUrl, '/api/merchants', {
      method: 'POST',
      body: {
        name: '测试商家',
        store: '测试门店',
        category: '餐饮美食',
        district: '龙华区',
        exchangeAmount: 88,
      },
    });
    assert.equal(merchants.response.status, 201);
    assert.equal(merchants.payload.merchant.name, '测试商家');

    const exchanges = await requestJson(server.baseUrl, '/api/exchanges?status=pending');
    assert.equal(exchanges.response.status, 200);
    assert.ok(exchanges.payload.exchanges.length >= 1);

    const returned = await requestJson(
      server.baseUrl,
      `/api/exchanges/${exchanges.payload.exchanges[0].id}/status`,
      {
        method: 'PATCH',
        body: { status: 'returned', reason: '商家暂不可用' },
      },
    );
    assert.equal(returned.response.status, 200);
    assert.equal(returned.payload.exchange.status, 'returned');
    assert.equal(returned.payload.balanceRecord.type, 'exchange_refund');

    const records = await requestJson(server.baseUrl, '/api/balance-records?type=exchange_refund');
    assert.equal(records.response.status, 200);
    assert.ok(records.payload.records.some((item) => item.refId === returned.payload.exchange.id));
  } finally {
    await server.close();
  }
});
