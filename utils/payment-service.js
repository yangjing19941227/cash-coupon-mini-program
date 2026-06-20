const API_BASE_URL = 'http://127.0.0.1:8787';

function getWxApi() {
  return typeof wx === 'undefined' ? null : wx;
}

function requestJson(pathname, options = {}) {
  const wxApi = options.wxApi || getWxApi();
  const baseUrl = options.baseUrl || API_BASE_URL;
  const method = options.method || 'GET';
  const data = options.data || {};

  if (wxApi && typeof wxApi.request === 'function') {
    return new Promise((resolve, reject) => {
      wxApi.request({
        url: `${baseUrl}${pathname}`,
        method,
        data,
        header: {
          'content-type': 'application/json',
          ...(options.header || {}),
        },
        success(response) {
          const statusCode = Number(response.statusCode || 0);

          if (statusCode >= 200 && statusCode < 300) {
            resolve(response.data);
            return;
          }

          reject(new Error(response.data?.message || '请求失败'));
        },
        fail(error) {
          reject(new Error(error.errMsg || '请求失败'));
        },
      });
    });
  }

  if (typeof fetch === 'function') {
    return fetch(`${baseUrl}${pathname}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(options.header || {}),
      },
      body: method === 'GET' ? undefined : JSON.stringify(data),
    }).then(async (response) => {
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || '请求失败');
      }

      return payload;
    });
  }

  return Promise.reject(new Error('当前环境不支持网络请求'));
}

function normalizeAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function createCouponOrder(order, options = {}) {
  return requestJson('/api/orders', {
    ...options,
    method: 'POST',
    data: {
      title: order.title,
      templateId: order.templateId || order.id || '',
      userId: order.userId || '',
      merchantName: order.merchantName || order.store,
      store: order.store || order.merchantName,
      category: order.category || '餐饮',
      amount: normalizeAmount(order.amount),
      quantity: normalizeAmount(order.quantity) || 1,
    },
  });
}

async function payCouponOrder(orderId, options = {}) {
  if (!orderId) {
    throw new Error('订单不存在');
  }

  const payload = await requestJson(`/api/orders/${orderId}/pay`, {
    ...options,
    method: 'POST',
    data: { method: 'wechat' },
  });

  return {
    ...payload,
    payParams: payload.payParams || { __mock: true },
  };
}

function createRechargePayment(amount, options = {}) {
  return requestJson('/api/recharges', {
    ...options,
    method: 'POST',
    data: {
      amount: normalizeAmount(amount),
      channel: 'wechat',
    },
  });
}

function requestWechatPayment(payParams, wxApi = getWxApi()) {
  if (!payParams || payParams.__mock || !wxApi || typeof wxApi.requestPayment !== 'function') {
    return Promise.resolve({ mock: true });
  }

  return new Promise((resolve, reject) => {
    wxApi.requestPayment({
      ...payParams,
      success: resolve,
      fail: reject,
    });
  });
}

module.exports = {
  API_BASE_URL,
  createCouponOrder,
  payCouponOrder,
  createRechargePayment,
  requestWechatPayment,
};
