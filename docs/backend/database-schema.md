# MySQL 数据库设计

## 1. 表结构设计

### 1.1 users 表

```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  openid VARCHAR(64) NOT NULL UNIQUE,
  nickname VARCHAR(100),
  avatar VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_openid (openid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 1.2 subscriptions 表

```sql
CREATE TABLE subscriptions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  amount INT NOT NULL,
  currency VARCHAR(10) NOT NULL,
  billing_cycle VARCHAR(20) NOT NULL,
  billing_day INT NOT NULL,
  billing_month INT,
  start_date DATE,
  next_billing_date DATE NOT NULL,
  remark TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  cancelled_at TIMESTAMP NULL,
  icon VARCHAR(255),
  category VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_status (user_id, status),
  INDEX idx_next_billing (next_billing_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 1.3 user_settings 表

```sql
CREATE TABLE user_settings (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL UNIQUE,
  monthly_budget INT NOT NULL DEFAULT 0,
  budget_currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
  reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  reminder_days INT NOT NULL DEFAULT 3,
  base_currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 1.4 subscription_history 表

```sql
CREATE TABLE subscription_history (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  subscription_id VARCHAR(36) NOT NULL,
  action VARCHAR(20) NOT NULL,
  previous_value JSON,
  new_value JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_subscription (subscription_id),
  INDEX idx_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 2. 索引策略

### 2.1 主要索引

| 表名 | 索引名 | 字段 | 类型 |
|------|--------|------|------|
| users | PRIMARY | id | 主键 |
| users | idx_openid | openid | 唯一索引 |
| subscriptions | PRIMARY | id | 主键 |
| subscriptions | idx_user_status | user_id, status | 复合索引 |
| subscriptions | idx_next_billing | next_billing_date | 普通索引 |
| user_settings | PRIMARY | id | 主键 |
| user_settings | user_id | user_id | 唯一索引 |
| subscription_history | PRIMARY | id | 主键 |
| subscription_history | idx_subscription | subscription_id | 普通索引 |

## 3. 数据约束

### 3.1 字段约束

- `amount`: 必须 > 0
- `billing_day`: 范围 1-31
- `billing_month`: 范围 1-12（年付时）
- `reminder_days`: 范围 1-7
- `currency`: 枚举值 (CNY/USD/EUR/GBP/JPY/HKD/TWD)
- `billing_cycle`: 枚举值 (monthly/quarterly/yearly)
- `status`: 枚举值 (active/cancelled)

### 3.2 外键约束

- `subscriptions.user_id` → `users.id` (CASCADE DELETE)
- `user_settings.user_id` → `users.id` (CASCADE DELETE)
- `subscription_history.user_id` → `users.id` (CASCADE DELETE)

## 4. 初始化脚本

```sql
-- 创建数据库
CREATE DATABASE IF NOT EXISTS subtrack 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE subtrack;

-- 创建表（按依赖顺序）
-- 1. users 表
-- 2. subscriptions 表
-- 3. user_settings 表
-- 4. subscription_history 表

-- 插入测试数据（可选）
INSERT INTO users (id, openid, nickname) 
VALUES ('test-user-001', 'test-openid', '测试用户');
```

## 5. 数据迁移

### 5.1 版本管理

使用数据库迁移工具管理表结构变更：

- Go: [golang-migrate](https://github.com/golang-migrate/migrate)

### 5.2 迁移文件示例

```sql
-- migrations/001_create_users.up.sql
CREATE TABLE users (...);

-- migrations/001_create_users.down.sql
DROP TABLE users;
```
