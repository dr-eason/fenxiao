-- Admin account
CREATE TABLE IF NOT EXISTS admin (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT    NOT NULL UNIQUE,
    password   TEXT    NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Authorization code types (product catalog)
CREATE TABLE IF NOT EXISTS code_type (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    price         INTEGER NOT NULL,
    image_url     TEXT    NOT NULL DEFAULT '',
    commission_l1 INTEGER NOT NULL DEFAULT 0,
    commission_l2 INTEGER NOT NULL DEFAULT 0,
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users (customers / distributors)
CREATE TABLE IF NOT EXISTS user (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    phone          TEXT    NOT NULL UNIQUE,
    nickname       TEXT    NOT NULL DEFAULT '',
    avatar_url     TEXT    NOT NULL DEFAULT '',
    password       TEXT    NOT NULL DEFAULT '',
    referrer_id    INTEGER REFERENCES user(id),
    is_distributor INTEGER NOT NULL DEFAULT 0,
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_user_referrer ON user(referrer_id);

-- Orders
CREATE TABLE IF NOT EXISTS "order" (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no     TEXT    NOT NULL UNIQUE,
    user_id      INTEGER NOT NULL REFERENCES user(id),
    code_type_id INTEGER NOT NULL REFERENCES code_type(id),
    quantity     INTEGER NOT NULL DEFAULT 1,
    total_price  INTEGER NOT NULL,
    status       INTEGER NOT NULL DEFAULT 0,
    paid_at      DATETIME,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_order_user ON "order"(user_id);

-- Authorization codes
CREATE TABLE IF NOT EXISTS auth_code (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    code         TEXT    NOT NULL UNIQUE,
    code_type_id INTEGER NOT NULL REFERENCES code_type(id),
    order_id     INTEGER REFERENCES "order"(id),
    user_id      INTEGER REFERENCES user(id),
    status       INTEGER NOT NULL DEFAULT 0,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_auth_code_type_status ON auth_code(code_type_id, status);

-- Commission records
CREATE TABLE IF NOT EXISTS commission (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES user(id),
    order_id     INTEGER NOT NULL REFERENCES "order"(id),
    from_user_id INTEGER NOT NULL REFERENCES user(id),
    level        INTEGER NOT NULL,
    amount       INTEGER NOT NULL,
    status       INTEGER NOT NULL DEFAULT 0,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_commission_user ON commission(user_id);
