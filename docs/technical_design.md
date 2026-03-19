# SubTrack 技术设计文档

## 1. 技术架构

### 1.1 技术栈选型

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 前端框架 | Taro 3.x + Vue 3 | 多端统一框架，使用 Vue 3 Composition API |
| UI组件库 | NutUI 4.x | 京东风格的 Vue3 组件库，支持 Taro |
| 状态管理 | Pinia | Vue 3 官方推荐的状态管理库 |
| 后端服务 | 腾讯云 CloudBase | 云开发平台，支持多端接入 |
| 数据库 | CloudBase 数据库 | NoSQL 数据库 |
| 云函数 | CloudBase 云函数 (Go) | 服务端逻辑，使用 Go 语言实现 |
| 图表库 | ECharts for Taro | 数据可视化 |

### 1.2 多端策略

**当前阶段：** 仅实现微信小程序端

**未来扩展：** 保留以下平台的扩展能力

| 平台 | 扩展优先级 | 说明 |
|------|------------|------|
| H5 | P1 | 浏览器访问，便于分享传播 |
| 支付宝小程序 | P2 | 扩大用户覆盖 |
| App (iOS/Android) | P3 | 原生体验，需要额外适配 |

**多端适配注意事项：**
- 使用 Taro 内置 API，避免平台特定 API
- 样式使用 Taro 推荐的 CSS 单位（px 转 rpx）
- 条件编译处理平台差异
- CloudBase SDK 支持多端

### 1.3 架构图

```
┌─────────────────────────────────────────────────────────┐
│                   Taro 多端客户端                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Vue 3 + Composition API             │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐         │   │
│  │  │  首页   │  │订阅列表 │  │订阅详情 │  ...    │   │
│  │  └────┬────┘  └────┬────┘  └────┬────┘         │   │
│  │       └────────────┴────────────┘              │   │
│  │                     │                          │   │
│  │          ┌──────────▼──────────┐               │   │
│  │          │   Pinia Store       │               │   │
│  │          └──────────┬──────────┘               │   │
│  │                     │                          │   │
│  │          ┌──────────▼──────────┐               │   │
│  │          │  CloudBase SDK      │               │   │
│  │          └──────────┬──────────┘               │   │
│  └─────────────────────┼──────────────────────────┘   │
└────────────────────────┼──────────────────────────────┘
                         │
┌────────────────────────▼──────────────────────────────┐
│                腾讯云 CloudBase                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │  云函数     │  │  云数据库   │  │  云存储     │   │
│  │   (Go)      │  │             │  │             │   │
│  │ - CRUD操作  │  │ - users     │  │ - 图标存储  │   │
│  │ - 统计计算  │  │ - subscrip- │  │ - 导出文件  │   │
│  │ - 消息推送  │  │   tions     │  │             │   │
│  │ - 定时任务  │  │ - budgets   │  │             │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
└───────────────────────────────────────────────────────┘
```

---

## 2. 项目结构

```
subtrack-miniprogram/
├── config/                     # Taro 配置文件
├── src/
│   ├── api/                    # API 接口封装
│   ├── assets/                 # 静态资源
│   ├── components/             # 公共组件
│   ├── composables/            # 组合式函数 (Vue 3 Hooks)
│   ├── models/                 # 数据模型/类型定义
│   ├── pages/                  # 页面
│   ├── store/                  # Pinia 状态管理
│   ├── styles/                 # 全局样式
│   ├── utils/                  # 工具函数
│   ├── app.config.ts           # Taro 应用配置
│   ├── app.vue                 # 应用入口组件
│   └── main.ts                 # Vue 应用初始化
├── cloudfunctions/             # CloudBase 云函数 (Go)
│   ├── go.mod                  # Go 模块定义
│   ├── main.go                 # 云函数入口
│   ├── handler/                # 处理器
│   ├── model/                  # 数据模型
│   ├── service/                # 业务逻辑
│   ├── repository/             # 数据访问层
│   └── utils/                  # 工具函数
├── types/                      # 全局类型声明
├── project.config.json         # 微信小程序配置
├── cloudbaserc.json            # CloudBase 配置
└── package.json
```

---

## 3. 云函数接口设计

### 3.1 架构模式

采用**单函数多路由**模式，通过一个云函数入口，根据路由分发到不同的处理器。

```
客户端请求 ──► 云函数入口 ──► 路由分发 ──► Handler ──► Service ──► Repository ──► 数据库
                main.go       router        handler      service      repository
```

### 3.2 Go 数据模型定义

```go
// model/subscription.go
type Subscription struct {
    ID              string    `json:"_id" bson:"_id"`
    UserID          string    `json:"userId" bson:"userId"`
    Name            string    `json:"name" bson:"name"`
    Amount          int64     `json:"amount" bson:"amount"`           // 单位：分
    Currency        string    `json:"currency" bson:"currency"`       // CNY, USD, EUR 等
    BillingCycle    string    `json:"billingCycle" bson:"billingCycle"` // monthly, quarterly, yearly
    BillingDay      int       `json:"billingDay" bson:"billingDay"`   // 扣款日 1-31
    BillingMonth    *int      `json:"billingMonth,omitempty" bson:"billingMonth,omitempty"` // 年付时的月份
    StartDate       time.Time `json:"startDate" bson:"startDate"`
    NextBillingDate time.Time `json:"nextBillingDate" bson:"nextBillingDate"`
    Remark          string    `json:"remark,omitempty" bson:"remark"`
    Status          string    `json:"status" bson:"status"`           // active, cancelled
    CancelledAt     *time.Time `json:"cancelledAt,omitempty" bson:"cancelledAt"`
    Icon            string    `json:"icon,omitempty" bson:"icon"`
    Category        string    `json:"category,omitempty" bson:"category"`
    CreatedAt       time.Time `json:"createdAt" bson:"createdAt"`
    UpdatedAt       time.Time `json:"updatedAt" bson:"updatedAt"`
}
```

```go
// model/user.go
type User struct {
    ID              string    `json:"_id" bson:"_id"`
    OpenID          string    `json:"openid" bson:"openid"`
    Nickname        string    `json:"nickname,omitempty" bson:"nickname"`
    Avatar          string    `json:"avatar,omitempty" bson:"avatar"`
    MonthlyBudget   int64     `json:"monthlyBudget" bson:"monthlyBudget"`
    BudgetCurrency  string    `json:"budgetCurrency" bson:"budgetCurrency"`
    ReminderEnabled bool      `json:"reminderEnabled" bson:"reminderEnabled"`
    ReminderDays    int       `json:"reminderDays" bson:"reminderDays"`
    CreatedAt       time.Time `json:"createdAt" bson:"createdAt"`
    UpdatedAt       time.Time `json:"updatedAt" bson:"updatedAt"`
}
```

```go
// model/common.go
type Response struct {
    Code    int         `json:"code"`
    Message string      `json:"message"`
    Data    interface{} `json:"data,omitempty"`
}
```

### 3.3 API 接口定义

#### 订阅管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /subscription | 获取订阅列表 |
| POST | /subscription | 创建/更新订阅 |
| DELETE | /subscription?id={id} | 删除订阅 |

#### 统计分析

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /statistics?type={type} | 获取统计数据 |

#### 用户管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /user | 获取用户信息 |
| POST | /user | 更新用户信息 |

#### 汇率

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /exchange-rate | 获取汇率数据 |

### 3.4 请求/响应结构体

```go
// 获取订阅列表
type GetSubscriptionsRequest struct {
    Status    string `json:"status"`
    SortBy    string `json:"sortBy"`
    SortOrder string `json:"sortOrder"`
    Page      int    `json:"page"`
    PageSize  int    `json:"pageSize"`
}

type GetSubscriptionsResponse struct {
    Subscriptions []Subscription `json:"subscriptions"`
    Total         int64          `json:"total"`
}

// 保存订阅
type SaveSubscriptionRequest struct {
    ID           string `json:"id"`
    Name         string `json:"name"`
    Amount       int64  `json:"amount"`
    Currency     string `json:"currency"`
    BillingCycle string `json:"billingCycle"`
    BillingDay   int    `json:"billingDay"`
    BillingMonth *int   `json:"billingMonth"`
    StartDate    string `json:"startDate"`
    Remark       string `json:"remark"`
    Category     string `json:"category"`
    Icon         string `json:"icon"`
}

// 获取统计
type GetStatisticsRequest struct {
    Type           string `json:"type"`           // monthly, category, trend
    StartDate      string `json:"startDate"`
    EndDate        string `json:"endDate"`
    TargetCurrency string `json:"targetCurrency"`
}
```

---

## 4. 本地数据缓存策略

### 4.1 缓存配置

| 缓存项 | 过期时间 | 说明 |
|--------|----------|------|
| subscriptions | 5分钟 | 订阅列表数据 |
| statistics | 5分钟 | 统计数据 |
| exchangeRates | 1小时 | 汇率数据 |
| userInfo | 24小时 | 用户信息 |
| userSettings | 7天 | 用户设置 |

### 4.2 Pinia 持久化

使用 `pinia-plugin-persistedstate` 实现状态持久化，支持 Taro 存储 API。

---

## 5. 数据库设计

### 5.1 数据库集合

| 集合名 | 说明 | 权限规则 |
|--------|------|----------|
| users | 用户信息 | 仅创建者可读写 |
| subscriptions | 订阅记录 | 仅创建者可读写 |
| monthly_budgets | 月度预算 | 仅创建者可读写 |
| subscription_history | 订阅状态变更历史 | 仅创建者可读写 |
| exchange_rates | 汇率缓存 | 所有用户可读 |

### 5.2 数据库安全规则

```json
// users 集合规则
{ "read": "auth.uid == doc._id", "write": "auth.uid == doc._id" }

// subscriptions 集合规则
{ "read": "auth.uid == doc.userId", "write": "auth.uid == doc.userId" }

// monthly_budgets 集合规则
{ "read": "auth.uid == doc.userId", "write": "auth.uid == doc.userId" }

// exchange_rates 集合规则（公开只读）
{ "read": true, "write": "auth.uid != null && doc.updatedBy == auth.uid" }
```

### 5.3 索引设计

| 集合 | 索引名 | 字段 |
|------|--------|------|
| subscriptions | userId_status_nextBillingDate | `{ userId: 1, status: 1, nextBillingDate: 1 }` |
| monthly_budgets | userId_year_month | `{ userId: 1, year: 1, month: 1 }` (unique) |
| subscription_history | userId_subscriptionId_createdAt | `{ userId: 1, subscriptionId: 1, createdAt: -1 }` |

---

## 6. 多币种支持设计

### 6.1 支持的货币

| 货币代码 | 货币名称 | 符号 |
|----------|----------|------|
| CNY | 人民币 | ¥ |
| USD | 美元 | $ |
| EUR | 欧元 | € |
| GBP | 英镑 | £ |
| JPY | 日元 | ¥ |
| HKD | 港币 | HK$ |
| TWD | 新台币 | NT$ |

### 6.2 汇率处理

- 使用定时任务每日更新汇率
- 汇率数据缓存到云数据库
- 支持用户设置基准货币（默认 CNY）

---

## 7. 扣款日期计算规则

### 7.1 扣款模式

| 计费周期 | 扣款规则 | 示例 |
|----------|----------|------|
| 月付 | 每月 [1-31] 号扣款 | 每月15号 |
| 季付 | 每季度 [1-31] 号扣款 | 每季度15号 |
| 年付 | 每年 [1-12] 月 [1-28] 日扣款 | 每年3月15日 |

### 7.2 边界情况处理

- 月末日期自动调整（如31号在2月不存在）
- 闰年2月29日处理

---

## 8. 订阅状态变更处理

### 8.1 状态定义

| 状态 | 说明 |
|------|------|
| active | 当前正在使用的订阅 |
| cancelled | 已取消的订阅，记录取消日期 |

### 8.2 状态变更策略

取消后重新订阅时，创建新的订阅记录，保留历史记录用于统计分析。

```
创建订阅 ──► 有效 (active) ──► 取消订阅 ──► 已取消 (cancelled)
                                              │
                                              ▼
                                         重新续费 ──► 创建新订阅记录 (active)
```

---

## 9. 定时任务设计

### 9.1 定时触发器配置

| 触发器 | Cron 表达式 | 说明 |
|--------|-------------|------|
| 续费提醒 | `0 0 9 * * * *` | 每天早上9点执行 |
| 更新汇率 | `0 0 0 * * * *` | 每天凌晨执行 |

### 9.2 续费提醒逻辑

- 提前 1、3、7 天发送提醒
- 检查用户是否开启提醒
- 调用微信小程序订阅消息 API

---

## 10. 性能优化策略

### 10.1 数据加载优化

- 分页加载订阅列表（虚拟列表）
- 按需加载统计数据
- 图片懒加载
- 骨架屏占位
- 预加载关键数据

### 10.2 Vue 3 性能优化

- 使用 `shallowRef` 减少响应式开销
- 使用 `computed` 缓存计算结果
- 使用 `v-memo` 优化列表渲染

### 10.3 CloudBase 优化

- 云函数冷启动优化（定时预热）
- 数据库查询优化（索引、限制字段、分页）
- 批量操作减少调用次数

### 10.4 小程序分包优化

| 分包 | 包含页面 |
|------|----------|
| 主包 | 首页、订阅列表、设置 |
| packageDetail | 订阅详情、订阅编辑 |
| packageStatistics | 统计页 |

