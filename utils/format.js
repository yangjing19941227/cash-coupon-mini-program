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
    const year = value.getFullYear();
    const month = padTwoDigits(value.getMonth() + 1);
    const day = padTwoDigits(value.getDate());
    const hour = padTwoDigits(value.getHours());
    const minute = padTwoDigits(value.getMinutes());

    return `${year}-${month}-${day} ${hour}:${minute}`;
  }

  const text = String(value);
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
  return String(value).padStart(4, '0');
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

module.exports = {
  formatMoney,
  formatCouponValue,
  formatDateTime,
  getStatusLabel,
  padFourDigits,
};
