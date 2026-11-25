PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

/* ---------------------------------------------------------
   用户与登录身份
   --------------------------------------------------------- */
CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  nickname       TEXT NOT NULL,
  avatar         TEXT NOT NULL DEFAULT 'model-2',
  real_name      TEXT NOT NULL DEFAULT '',
  gender         TEXT NOT NULL DEFAULT '',
  height         INTEGER,
  weight         INTEGER,
  size           TEXT NOT NULL DEFAULT 'M',
  city           TEXT NOT NULL DEFAULT '三亚',
  member_level   TEXT NOT NULL DEFAULT '旅行会员',
  deposit_credit INTEGER NOT NULL DEFAULT 2000,
  address_name   TEXT NOT NULL DEFAULT '',
  address_phone  TEXT NOT NULL DEFAULT '',
  address_text   TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'active',
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS identities (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('phone', 'wechat')),
  value         TEXT NOT NULL,
  nickname      TEXT NOT NULL DEFAULT '',
  avatar        TEXT NOT NULL DEFAULT '',
  union_id      TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL,
  last_login_at TEXT NOT NULL,
  UNIQUE (type, value)
);
CREATE INDEX IF NOT EXISTS idx_identities_user ON identities(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_identities_user_type ON identities(user_id, type);

CREATE TABLE IF NOT EXISTS customer_sessions (
  token       TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_user ON customer_sessions(user_id);

CREATE TABLE IF NOT EXISTS auth_codes (
  phone      TEXT PRIMARY KEY,
  code       TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS merge_tickets (
  id                   TEXT PRIMARY KEY,
  current_user_id      TEXT NOT NULL,
  target_user_id       TEXT NOT NULL,
  identity_type        TEXT NOT NULL,
  identity_value       TEXT NOT NULL,
  expires_at           TEXT NOT NULL,
  used                 INTEGER NOT NULL DEFAULT 0,
  created_at           TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS account_merges (
  id                TEXT PRIMARY KEY,
  survivor_user_id  TEXT NOT NULL,
  merged_user_id    TEXT NOT NULL,
  detail            TEXT NOT NULL DEFAULT '{}',
  created_at        TEXT NOT NULL
);

/* ---------------------------------------------------------
   商品与供给
   --------------------------------------------------------- */
CREATE TABLE IF NOT EXISTS products (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  price       INTEGER NOT NULL,
  deposit     INTEGER NOT NULL,
  rating      REAL NOT NULL DEFAULT 4.8,
  reviews     INTEGER NOT NULL DEFAULT 0,
  img         TEXT NOT NULL,
  gallery     TEXT NOT NULL DEFAULT '[]',
  styles      TEXT NOT NULL DEFAULT '[]',
  badge       TEXT NOT NULL DEFAULT '',
  sizes       TEXT NOT NULL DEFAULT '["S","M","L"]',
  fit         TEXT NOT NULL DEFAULT '',
  model       TEXT NOT NULL DEFAULT '',
  merchant    TEXT NOT NULL DEFAULT '',
  includes    TEXT NOT NULL DEFAULT '',
  real        TEXT NOT NULL DEFAULT '[]',
  city        TEXT NOT NULL DEFAULT '三亚',
  status      TEXT NOT NULL DEFAULT 'active',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS product_skus (
  id              TEXT PRIMARY KEY,
  product_id      TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size            TEXT NOT NULL,
  stock_total     INTEGER NOT NULL DEFAULT 0,
  stock_available INTEGER NOT NULL DEFAULT 0,
  UNIQUE (product_id, size)
);

CREATE TABLE IF NOT EXISTS photographers (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  title           TEXT NOT NULL DEFAULT '',
  avatar          TEXT NOT NULL DEFAULT 'model-1',
  cover           TEXT NOT NULL DEFAULT 'hero-beach',
  rating          REAL NOT NULL DEFAULT 4.8,
  orders_count    INTEGER NOT NULL DEFAULT 0,
  price           INTEGER NOT NULL DEFAULT 0,
  tags            TEXT NOT NULL DEFAULT '[]',
  works           TEXT NOT NULL DEFAULT '[]',
  bio             TEXT NOT NULL DEFAULT '',
  package_title   TEXT NOT NULL DEFAULT '',
  package_desc    TEXT NOT NULL DEFAULT '',
  package_price   INTEGER NOT NULL DEFAULT 0,
  package_deposit INTEGER NOT NULL DEFAULT 0,
  package_includes TEXT NOT NULL DEFAULT '[]',
  status          TEXT NOT NULL DEFAULT 'active',
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS makeup_artists (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  title      TEXT NOT NULL DEFAULT '',
  avatar     TEXT NOT NULL DEFAULT 'model-1',
  description TEXT NOT NULL DEFAULT '',
  tags       TEXT NOT NULL DEFAULT '[]',
  price      INTEGER NOT NULL DEFAULT 0,
  status     TEXT NOT NULL DEFAULT 'active',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

/* ---------------------------------------------------------
   订单 / 押金
   --------------------------------------------------------- */
CREATE TABLE IF NOT EXISTS orders (
  id             TEXT PRIMARY KEY,
  order_no       TEXT NOT NULL UNIQUE,
  user_id        TEXT NOT NULL REFERENCES users(id),
  type           TEXT NOT NULL CHECK (type IN ('rental', 'photo')),
  status         TEXT NOT NULL,
  status_sub     TEXT NOT NULL DEFAULT '',
  product_id     TEXT REFERENCES products(id),
  photographer_id TEXT REFERENCES photographers(id),
  title          TEXT NOT NULL,
  image          TEXT NOT NULL DEFAULT '',
  date_text      TEXT NOT NULL DEFAULT '',
  merchant       TEXT NOT NULL DEFAULT '',
  paid           INTEGER NOT NULL DEFAULT 0,
  deposit        INTEGER NOT NULL DEFAULT 0,
  balance        INTEGER NOT NULL DEFAULT 0,
  size           TEXT NOT NULL DEFAULT '',
  days           INTEGER NOT NULL DEFAULT 0,
  delivery       TEXT NOT NULL DEFAULT '',
  insurance      INTEGER NOT NULL DEFAULT 0,
  address_name   TEXT NOT NULL DEFAULT '',
  address_phone  TEXT NOT NULL DEFAULT '',
  address_text   TEXT NOT NULL DEFAULT '',
  timeline       TEXT NOT NULL DEFAULT '[]',
  slot           TEXT NOT NULL DEFAULT '',
  start_date     TEXT NOT NULL DEFAULT '',
  end_date       TEXT NOT NULL DEFAULT '',
  stock_released INTEGER NOT NULL DEFAULT 0,
  admin_note     TEXT NOT NULL DEFAULT '',
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_type ON orders(type);

CREATE TABLE IF NOT EXISTS deposits (
  id             TEXT PRIMARY KEY,
  order_id       TEXT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  user_id        TEXT NOT NULL REFERENCES users(id),
  amount         INTEGER NOT NULL,
  status         TEXT NOT NULL DEFAULT 'held',
  refunded_amount INTEGER NOT NULL DEFAULT 0,
  note           TEXT NOT NULL DEFAULT '',
  refunded_at    TEXT,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);

/* ---------------------------------------------------------
   社区 / 收藏
   --------------------------------------------------------- */
CREATE TABLE IF NOT EXISTS posts (
  id         TEXT PRIMARY KEY,
  user_name  TEXT NOT NULL,
  avatar     TEXT NOT NULL DEFAULT 'model-1',
  city       TEXT NOT NULL DEFAULT '三亚',
  text       TEXT NOT NULL DEFAULT '',
  images     TEXT NOT NULL DEFAULT '[]',
  tags       TEXT NOT NULL DEFAULT '[]',
  product_id TEXT REFERENCES products(id),
  likes      INTEGER NOT NULL DEFAULT 0,
  comments   INTEGER NOT NULL DEFAULT 0,
  status     TEXT NOT NULL DEFAULT 'published',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS post_likes (
  post_id    TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS favorites (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, product_id)
);

/* ---------------------------------------------------------
   管理后台
   --------------------------------------------------------- */
CREATE TABLE IF NOT EXISTS admin_users (
  id            TEXT PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'ops',
  status        TEXT NOT NULL DEFAULT 'active',
  last_login_at TEXT,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token      TEXT PRIMARY KEY,
  admin_id   TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id         TEXT PRIMARY KEY,
  admin_id   TEXT NOT NULL,
  admin_name TEXT NOT NULL DEFAULT '',
  action     TEXT NOT NULL,
  entity     TEXT NOT NULL DEFAULT '',
  entity_id  TEXT NOT NULL DEFAULT '',
  detail     TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
