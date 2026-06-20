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

    const createdCoupon = await requestJson(server.baseUrl, '/api/coupons', {
      method: 'POST',
      body: {
        title: 'Admin deletion test coupon',
        merchantName: 'Admin merchant',
        category: 'Food',
        amount: 25,
        threshold: 80,
      },
    });
    assert.equal(createdCoupon.response.status, 201);

    const deletedCoupon = await requestJson(server.baseUrl, `/api/coupons/${createdCoupon.payload.coupon.id}`, {
      method: 'DELETE',
    });
    assert.equal(deletedCoupon.response.status, 200);
    assert.equal(deletedCoupon.payload.coupon.id, createdCoupon.payload.coupon.id);

    const couponsAfterDelete = await requestJson(server.baseUrl, '/api/coupons');
    assert.equal(
      couponsAfterDelete.payload.coupons.some((item) => item.id === createdCoupon.payload.coupon.id),
      false,
    );
  } finally {
    await server.close();
  }
});

test('backend separates merchant coupon templates from user coupon assets', async () => {
  const server = await createTestServer();

  try {
    const templates = await requestJson(server.baseUrl, '/api/coupon-templates');
    assert.equal(templates.response.status, 200);
    assert.ok(templates.payload.templates.length >= 1);
    assert.equal(templates.payload.templates[0].status, 'online');
    assert.equal(templates.payload.templates[0].merchantName, '海岛小院');

    const createdTemplate = await requestJson(server.baseUrl, '/api/coupon-templates', {
      method: 'POST',
      body: {
        title: '测试商户满减券',
        merchantName: '测试商户',
        store: '测试门店',
        category: '餐饮',
        amount: 35,
        threshold: 120,
        stock: 5,
        userScope: ['user-haikou-life'],
        verifierScope: ['merchant-operator'],
      },
    });
    assert.equal(createdTemplate.response.status, 201);
    assert.equal(createdTemplate.payload.template.stock, 5);
    assert.deepEqual(createdTemplate.payload.template.userScope, ['user-haikou-life']);
    assert.deepEqual(createdTemplate.payload.template.verifierScope, ['merchant-operator']);

    const wrongUser = await requestJson(
      server.baseUrl,
      `/api/coupon-templates/${createdTemplate.payload.template.id}/assign`,
      {
        method: 'POST',
        body: { userId: 'other-user' },
      },
    );
    assert.equal(wrongUser.response.status, 403);

    const assigned = await requestJson(
      server.baseUrl,
      `/api/coupon-templates/${createdTemplate.payload.template.id}/assign`,
      {
        method: 'POST',
        body: { userId: 'user-haikou-life' },
      },
    );
    assert.equal(assigned.response.status, 201);
    assert.equal(assigned.payload.coupon.templateId, createdTemplate.payload.template.id);
    assert.equal(assigned.payload.coupon.userId, 'user-haikou-life');
    assert.equal(assigned.payload.coupon.status, 'unused');
    assert.equal(assigned.payload.template.stock, 4);

    const wrongMerchant = await requestJson(server.baseUrl, '/api/merchant/coupons/verify', {
      method: 'POST',
      body: {
        code: assigned.payload.coupon.code,
        merchantName: '其他商户',
        operator: 'merchant-user',
      },
    });
    assert.equal(wrongMerchant.response.status, 403);

    const wrongOperator = await requestJson(server.baseUrl, '/api/merchant/coupons/verify', {
      method: 'POST',
      body: {
        code: assigned.payload.coupon.code,
        merchantName: '测试商户',
        operator: 'merchant-user',
      },
    });
    assert.equal(wrongOperator.response.status, 403);

    const verified = await requestJson(server.baseUrl, '/api/merchant/coupons/verify', {
      method: 'POST',
      body: {
        code: assigned.payload.coupon.code,
        merchantName: '测试商户',
        operator: 'merchant-operator',
      },
    });
    assert.equal(verified.response.status, 200);
    assert.equal(verified.payload.coupon.status, 'used');
    assert.equal(verified.payload.verification.operator, 'merchant-operator');
  } finally {
    await server.close();
  }
});

test('backend accepts admin image uploads for coupon templates', async () => {
  const server = await createTestServer();

  try {
    const uploaded = await requestJson(server.baseUrl, '/api/uploads', {
      method: 'POST',
      body: {
        filename: 'coupon-test.png',
        dataUrl: 'data:image/png;base64,aGVsbG8=',
      },
    });
    assert.equal(uploaded.response.status, 201);
    assert.match(uploaded.payload.url, /^\/uploads\/coupon-test-[a-z0-9]+\.png$/);

    const imageResponse = await fetch(`${server.baseUrl}${uploaded.payload.url}`);
    assert.equal(imageResponse.status, 200);
    assert.equal(imageResponse.headers.get('content-type'), 'image/png');
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
