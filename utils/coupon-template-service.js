const { getCouponTemplates: getMockCouponTemplates } = require('./mock-service');

const API_BASE_URL = 'http://127.0.0.1:8787';
const TEMPLATE_IMAGE_FALLBACKS = [
  '/assets/images/coupon-deal-hair-clean.png',
  '/assets/images/coupon-deal-tea-clean.png',
  '/assets/images/coupon-deal-fish-clean.png',
  '/assets/images/coupon-deal-meal-clean.png',
];

function getWxApi() {
  return typeof wx === 'undefined' ? null : wx;
}

function buildQuery(params = {}) {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== '');

  if (!entries.length) {
    return '';
  }

  return `?${entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&')}`;
}

function requestJson(pathname, options = {}) {
  const wxApi = options.wxApi || getWxApi();
  const baseUrl = options.baseUrl || API_BASE_URL;

  if (wxApi && typeof wxApi.request === 'function') {
    return new Promise((resolve, reject) => {
      wxApi.request({
        url: `${baseUrl}${pathname}`,
        method: 'GET',
        header: {
          'content-type': 'application/json',
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
    return fetch(`${baseUrl}${pathname}`).then(async (response) => {
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || '请求失败');
      }

      return payload;
    });
  }

  return Promise.reject(new Error('当前环境不支持网络请求'));
}

function formatPrice(template) {
  if (template.price) {
    return template.price;
  }

  return `￥${Number(template.amount || 0)}`;
}

function formatDiscount(template) {
  if (template.discount) {
    return template.discount;
  }

  return Number(template.threshold || 0) > 0 ? `满${template.threshold}可用` : '无门槛';
}

function resolveTemplateImage(image) {
  const value = String(image || '').trim();

  if (!value) {
    return '';
  }

  if (value.startsWith('/uploads/')) {
    return `${API_BASE_URL}${value}`;
  }

  return value;
}

function normalizeTemplate(template, index = 0) {
  const image = resolveTemplateImage(template.image);

  return {
    id: template.id,
    templateId: template.id,
    merchantId: template.merchantId,
    merchantName: template.merchantName,
    category: template.category || '餐饮',
    title: template.title,
    sales: template.sales || `库存 ${template.stock || 0} 张`,
    rank: template.rank || '商户优惠券',
    rating: template.rating || '4.8分',
    store: template.store || template.merchantName,
    distance: template.distance || '同城可用',
    price: formatPrice(template),
    salePrice: Number(template.salePrice || template.amount || 0),
    amount: Number(template.amount || 0),
    threshold: Number(template.threshold || 0),
    discount: formatDiscount(template),
    badge: template.badge || '后台配置',
    image: image || TEMPLATE_IMAGE_FALLBACKS[index % TEMPLATE_IMAGE_FALLBACKS.length],
    stock: Number(template.stock || 0),
    userScope: Array.isArray(template.userScope) ? template.userScope : [],
    verifierScope: Array.isArray(template.verifierScope) ? template.verifierScope : [],
  };
}

async function getCouponTemplates(category = '全部', options = {}) {
  try {
    const query = buildQuery({
      status: 'online',
      category: category && !['全部', '附近美食'].includes(category) ? category : '',
    });
    const payload = await requestJson(`/api/coupon-templates${query}`, options);
    return (payload.templates || []).map(normalizeTemplate);
  } catch (error) {
    return getMockCouponTemplates(category).map(normalizeTemplate);
  }
}

function getLocalCouponTemplates(category = '全部') {
  return getMockCouponTemplates(category).map(normalizeTemplate);
}

module.exports = {
  getCouponTemplates,
  getLocalCouponTemplates,
  normalizeTemplate,
};
