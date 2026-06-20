const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { createApp } = require('../server/app');
const { JsonStore } = require('../server/store');

const rootDir = path.join(__dirname, '..');

function readProjectFile(filePath) {
  return fs.readFileSync(path.join(rootDir, filePath), 'utf8');
}

function createTestServer() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cash-coupon-pay-'));
  const store = new JsonStore({ filePath: path.join(tempDir, 'store.json') });
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
        close: () => new Promise((done) => {
          server.close(done);
          server.closeIdleConnections?.();
          server.closeAllConnections?.();
        }),
      });
    });
  });
}

function createWxApi(baseUrl) {
  return {
    request(payload) {
      const requestUrl = new URL(payload.url);
      fetch(`${baseUrl}${requestUrl.pathname}${requestUrl.search}`, {
        method: payload.method || 'GET',
        headers: {
          'content-type': 'application/json',
          ...(payload.header || {}),
        },
        body: payload.data === undefined ? undefined : JSON.stringify(payload.data),
      })
        .then(async (response) => {
          payload.success({
            statusCode: response.status,
            data: await response.json(),
          });
        })
        .catch(payload.fail);
    },
  };
}

test('payment service creates orders, pays them and creates recharge records', async () => {
  const {
    createCouponOrder,
    payCouponOrder,
    createRechargePayment,
  } = require('../utils/payment-service');
  const server = await createTestServer();
  const wxApi = createWxApi(server.baseUrl);

  try {
    const created = await createCouponOrder({
      title: '测试优惠券订单',
      merchantName: '测试商户',
      templateId: 'template-test',
      amount: 128,
      quantity: 1,
    }, { wxApi, baseUrl: server.baseUrl });
    assert.equal(created.order.status, 'pending_payment');

    const paid = await payCouponOrder(created.order.id, { wxApi, baseUrl: server.baseUrl });
    assert.equal(paid.order.status, 'paid');
    assert.equal(paid.coupon.status, 'unused');
    assert.equal(paid.coupon.templateId, 'template-test');
    assert.equal(paid.payParams.__mock, true);

    const recharge = await createRechargePayment(300, { wxApi, baseUrl: server.baseUrl });
    assert.equal(recharge.record.paymentAmount, 300);
    assert.equal(recharge.record.amount, 345);
  } finally {
    await server.close();
  }
});

test('payment pages call the payment service instead of only navigating', () => {
  const orderConfirmJs = readProjectFile('pages/order-confirm/index.js');
  const orderConfirmWxml = readProjectFile('pages/order-confirm/index.wxml');
  const paymentSelectJs = readProjectFile('pages/payment-select/index.js');
  const paymentSelectWxml = readProjectFile('pages/payment-select/index.wxml');
  const rechargeWxml = readProjectFile('pages/recharge/index.wxml');

  assert.match(orderConfirmJs, /createCouponOrder/);
  assert.match(orderConfirmJs, /templateId/);
  assert.match(orderConfirmJs, /submitOrder/);
  assert.match(orderConfirmWxml, /bindtap="submitOrder"/);

  assert.match(paymentSelectJs, /payCouponOrder/);
  assert.match(paymentSelectJs, /createRechargePayment/);
  assert.match(paymentSelectJs, /submitPayment/);
  assert.match(paymentSelectWxml, /bindtap="submitPayment"/);
  assert.match(rechargeWxml, /data-amount/);
});
