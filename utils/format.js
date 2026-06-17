function formatMoney(value) {
  const amount = Number(value);

  if (Number.isInteger(amount)) {
    return `¥${amount}`;
  }

  return `¥${amount.toFixed(2)}`;
}

function formatCouponValue(coupon) {
  const threshold = Number(coupon.threshold || 0);
  const amount = formatNumber(coupon.amount);

  if (threshold > 0) {
    return `满${formatNumber(threshold)}减${amount}`;
  }

  return `立减${amount}`;
}

function formatDateTime(value) {
  if (value instanceof Date) {
    return formatShanghaiDateTime(value);
  }

  const text = String(value);
  const hasExplicitTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(text);

  if (hasExplicitTimeZone) {
    const date = new Date(text);

    if (!Number.isNaN(date.getTime())) {
      return formatShanghaiDateTime(date);
    }
  }

  const match = text.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/);

  if (match) {
    return `${match[1]} ${match[2]}`;
  }

  return text;
}

function getStatusLabel(status) {
  const labels = {
    unused: { text: '未使用', tone: 'success' },
    pending: { text: '待商家确认', tone: 'warning' },
    expired: { text: '已失效', tone: 'muted' },
    used: { text: '已使用', tone: 'muted' },
    completed: { text: '已完成', tone: 'success' },
    returned: { text: '已退回', tone: 'muted' },
  };

  return labels[status] || { text: '未知状态', tone: 'muted' };
}

function padFourDigits(value) {
  const number = Number(value);
  const integer = Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
  const lastFourDigits = integer % 10000;

  return String(lastFourDigits).padStart(4, '0');
}

function formatNumber(value) {
  const number = Number(value);

  if (Number.isInteger(number)) {
    return String(number);
  }

  return number.toFixed(2);
}

function padTwoDigits(value) {
  return String(value).padStart(2, '0');
}

function formatShanghaiDateTime(date) {
  const shanghaiDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const year = shanghaiDate.getUTCFullYear();
  const month = padTwoDigits(shanghaiDate.getUTCMonth() + 1);
  const day = padTwoDigits(shanghaiDate.getUTCDate());
  const hour = padTwoDigits(shanghaiDate.getUTCHours());
  const minute = padTwoDigits(shanghaiDate.getUTCMinutes());

  return `${year}-${month}-${day} ${hour}:${minute}`;
}

module.exports = {
  formatMoney,
  formatCouponValue,
  formatDateTime,
  getStatusLabel,
  padFourDigits,
};
