# SubTrack 后端接口与部署

## API 约定

- 协议：HTTPS
- 编码：UTF-8
- 数据格式：JSON
- 统一响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

## 认证方式

### 小程序 + 云函数

- 使用 `wx.cloud.callFunction` 时身份自动注入
- 云函数通过 `cloud.getWXContext()` 获取 `OPENID`

### Cloud Run / HTTP API

- 请求头必须携带：
  - `X-Platform`
  - `X-Platform-UserID`
  - `X-Timestamp`

## 核心接口（最小集合）

- `GET /subscriptions`：查询订阅列表
- `POST /subscriptions`：创建订阅
- `PUT /subscriptions/:id`：更新订阅
- `DELETE /subscriptions/:id`：删除订阅
- `POST /subscriptions/:id/cancel`：取消订阅
- `GET /settings` / `PUT /settings`：用户设置
- `GET /statistics/summary`：概览统计
- `POST /sync`：增量同步

## 数据库（MySQL）

### 主要表

- `users`
- `subscriptions`
- `user_settings`
- `subscription_history`

### 关键索引

- `users.openid`（唯一）
- `subscriptions(user_id, status)`
- `subscriptions.next_billing_date`
- `subscription_history(subscription_id)`

## 部署说明（Cloud Run）

1. 使用 Go 多阶段 Docker 构建镜像
2. 通过 `tcb run deploy` 发布服务
3. 配置健康检查：`GET /health`
4. 启用日志与告警（错误率、P95、CPU、内存）

## 安全与权限

- 所有用户数据查询必须按 `user_id` 过滤
- 时间戳校验防重放（建议 5 分钟窗口）
- 生产环境仅保留必要日志，敏感字段不落盘



## 1. TypeScript 类型定义

### 1.1 订阅模型

```typescript
export interface Subscription {
  id: string;
  userId: string;
  name: string;
  amount: number;              // 单位：分
  currency: Currency;
  billingCycle: BillingCycle;
  billingDay: number;          // 1-31
  billingMonth?: number;       // 年付时的月份 1-12
  startDate: string;           // ISO 8601
  nextBillingDate: string;     // ISO 8601
  remark?: string;
  status: SubscriptionStatus;
  cancelledAt?: string;        // ISO 8601
  icon?: string;
  category?: string;
  createdAt: string;           // ISO 8601
  updatedAt: string;           // ISO 8601
}

export type Currency = 'CNY' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'HKD' | 'TWD';

export type BillingCycle = 'monthly' | 'quarterly' | 'yearly';

export type SubscriptionStatus = 'active' | 'cancelled';
```

### 1.2 用户设置模型

```typescript
export interface UserSettings {
  id: string;
  userId: string;
  monthlyBudget: number;       // 单位：分
  budgetCurrency: Currency;
  reminderEnabled: boolean;
  reminderDays: number;        // 1-7
  baseCurrency: Currency;      // 统计时的基准货币
  createdAt: string;
  updatedAt: string;
}
```

### 1.3 用户模型

```typescript
export interface User {
  id: string;
  openid: string;
  nickname?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 1.4 订阅历史模型

```typescript
export interface SubscriptionHistory {
  id: string;
  userId: string;
  subscriptionId: string;
  action: HistoryAction;
  previousValue?: Partial<Subscription>;
  newValue?: Partial<Subscription>;
  createdAt: string;
}

export type HistoryAction = 'created' | 'updated' | 'cancelled' | 'deleted';
```

## 2. 数据关系

```
┌─────────────┐
│    User     │
│             │
│ - id (PK)   │
│ - openid    │
└──────┬──────┘
       │
       │ 1:N
       │
       ├──────────────────────────────┐
       │                              │
       ▼                              ▼
┌─────────────────┐          ┌─────────────────┐
│  Subscription   │          │  UserSettings   │
│                 │          │                 │
│ - id (PK)       │          │ - id (PK)       │
│ - user_id (FK)  │          │ - user_id (FK)  │
└────────┬────────┘          └─────────────────┘
         │
         │ 1:N
         │
         ▼
┌──────────────────────┐
│ SubscriptionHistory  │
│                      │
│ - id (PK)            │
│ - subscription_id(FK)│
└──────────────────────┘
```

## 3. 枚举值定义

### 3.1 货币代码

| 值 | 名称 | 符号 |
|----|------|------|
| CNY | 人民币 | ¥ |
| USD | 美元 | $ |
| EUR | 欧元 | € |
| GBP | 英镑 | £ |
| JPY | 日元 | ¥ |
| HKD | 港币 | HK$ |
| TWD | 新台币 | NT$ |

### 3.2 计费周期

| 值 | 名称 | 月数 |
|----|------|------|
| monthly | 月付 | 1 |
| quarterly | 季付 | 3 |
| yearly | 年付 | 12 |

### 3.3 订阅状态

| 值 | 名称 | 说明 |
|----|------|------|
| active | 有效 | 当前正在使用 |
| cancelled | 已取消 | 已取消订阅 |

### 3.4 历史操作类型

| 值 | 名称 | 说明 |
|----|------|------|
| created | 创建 | 新建订阅 |
| updated | 更新 | 修改订阅信息 |
| cancelled | 取消 | 取消订阅 |
| deleted | 删除 | 删除订阅记录 |

## 4. 业务规则

### 4.1 金额存储

所有金额以**分**为单位存储，避免浮点数精度问题。

```typescript
// 示例
const amount = 19.99; // 美元
const storedAmount = Math.round(amount * 100); // 1999 分
```

### 4.2 日期格式

所有日期使用 **ISO 8601** 格式存储。

```typescript
// 示例
const date = new Date().toISOString(); // "2026-03-24T01:27:46.550Z"
```

### 4.3 下次扣款日期计算

根据计费周期和扣款日自动计算下次扣款日期。

```typescript
// 伪代码
function calculateNextBillingDate(
  startDate: Date,
  billingCycle: BillingCycle,
  billingDay: number,
  billingMonth?: number
): Date {
  // 实现逻辑...
}
```

### 4.4 月均费用计算

```typescript
function calculateMonthlyAmount(
  amount: number,
  billingCycle: BillingCycle
): number {
  switch (billingCycle) {
    case 'monthly': return amount;
    case 'quarterly': return Math.round(amount / 3);
    case 'yearly': return Math.round(amount / 12);
  }
}
```

## 5. 数据验证规则

### 5.1 订阅验证

- `name`: 必填，长度 1-50
- `amount`: 必填，> 0
- `currency`: 必填，枚举值
- `billingCycle`: 必填，枚举值
- `billingDay`: 必填，1-31
- `billingMonth`: 年付时必填，1-12

### 5.2 用户设置验证

- `monthlyBudget`: 必填，>= 0
- `budgetCurrency`: 必填，枚举值
- `reminderDays`: 必填，1-7
- `baseCurrency`: 必填，枚举值

## 6. 数据迁移

### 6.1 版本控制

每个存储项包含 `version` 字段用于数据迁移。

```typescript
interface StorageData<T> {
  version: string;
  data: T;
  lastUpdated: string;
}
```

### 6.2 迁移策略

- 版本升级时自动执行迁移脚本
- 保持向后兼容性
- 迁移失败时回滚
