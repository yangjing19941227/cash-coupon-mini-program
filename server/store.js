const fs = require('node:fs');
const path = require('node:path');

const seed = require('../data/mock');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createInitialState() {
  return {
    userProfile: clone(seed.userProfile),
    coupons: clone(seed.coupons),
    merchants: clone(seed.merchantBenefits),
    lotteryState: clone(seed.lotteryState),
    lotteryRecords: clone(seed.lotteryRecords),
    exchangeRecords: clone(seed.exchangeRecords),
    activityItems: clone(seed.activityItems),
    orders: [
      {
        id: 'order-island-yard-paid',
        title: '海岛小院·双人海鲜套餐券',
        merchantName: '海岛小院',
        store: '海岛小院龙华店',
        amount: 128,
        quantity: 1,
        status: 'paid',
        paymentMethod: 'wechat',
        couponId: 'coupon-qilou-food',
        createdAt: '2026-06-18T09:41:00+08:00',
        paidAt: '2026-06-18T09:42:00+08:00',
      },
    ],
    balanceRecords: [
      {
        id: 'balance-initial',
        type: 'initial',
        title: '初始可置换额度',
        amount: Number(seed.userProfile.exchangeAmount || 0),
        balanceAfter: Number(seed.userProfile.exchangeAmount || 0),
        createdAt: '2026-06-18T09:00:00+08:00',
      },
    ],
    verificationRecords: seed.coupons
      .filter((coupon) => coupon.status === 'used')
      .map((coupon) => ({
        id: `verify-${coupon.id}`,
        couponId: coupon.id,
        couponTitle: coupon.title,
        merchantName: coupon.merchantName || coupon.store,
        operator: 'seed',
        verifiedAt: coupon.expiresAt,
      })),
  };
}

function normalizeState(state) {
  const next = state || {};
  const initial = createInitialState();

  for (const [key, value] of Object.entries(initial)) {
    if (next[key] === undefined) {
      next[key] = clone(value);
    }
  }

  return next;
}

class JsonStore {
  constructor(options = {}) {
    this.filePath = options.filePath || path.join(process.cwd(), '.data', 'store.json');
    this.initialState = clone(options.initialState || createInitialState());
    this.state = null;
  }

  ensureFile() {
    if (fs.existsSync(this.filePath)) {
      return;
    }

    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.initialState, null, 2));
  }

  read() {
    this.ensureFile();

    if (!this.state) {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      this.state = normalizeState(JSON.parse(raw));
    }

    return clone(this.state);
  }

  replace(nextState) {
    this.state = normalizeState(clone(nextState));
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2));
    return clone(this.state);
  }

  update(mutator) {
    const nextState = this.read();
    const result = mutator(nextState);
    this.replace(nextState);
    return clone(result === undefined ? nextState : result);
  }

  reset() {
    return this.replace(this.initialState);
  }
}

module.exports = {
  JsonStore,
  createInitialState,
};
