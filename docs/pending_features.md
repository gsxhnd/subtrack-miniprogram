# SubTrack 待定功能文档

本文档记录暂不实现的功能设计，待后续版本考虑开发。

---

## 1. 云端服务架构（待定）

### 1.1 技术栈选型

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 后端服务 | 腾讯云 CloudBase | 云开发平台，支持多端接入 |
| 数据库 | CloudBase 数据库 | NoSQL 数据库 |
| 云函数 | CloudBase 云函数 (Go) | 服务端逻辑，使用 Go 语言实现 |

### 1.2 架构图

```
┌─────────────────────────────────────────────────────────┐
│              微信小程序 (weapp-vite)                     │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Vue 3 + Composition API             │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐         │   │
│  │  │  首页   │  │订阅列表 │  │订阅详情 │  ...    │   │
│  │  └────┬────┘  └────┬────┘  └────┬────┘         │   │
│  │       └────────────┴────────────┘              │   │
│  │                     │                          │   │
│  │          ┌──────────▼──────────┐               │   │
│  │          │   Wevu / Pinia      │               │   │
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

## 2. Go 云函数设计

### 2.1 项目结构

```
cloudfunctions/
├── go.mod                  # Go 模块定义
├── main.go                 # 云函数入口
├── handler/                # 处理器
│   ├── subscription.go     # 订阅相关处理器
│   ├── user.go             # 用户相关处理器
│   ├── statistics.go       # 统计相关处理器
│   └── exchange_rate.go    # 汇率相关处理器
├── model/                  # 数据模型
│   ├── subscription.go
│   ├── user.go
│   └── common.go
├── service/                # 业务逻辑
│   ├── subscription.go
│   ├── user.go
│   └── statistics.go
├── repository/             # 数据访问层
│   ├── subscription.go
│   └── user.go
├── config/                 # 配置
│   └── config.go
└── utils/                  # 工具函数
    ├── response.go
    └── validator.go
```

### 2.2 技术框架

| 框架/库 | 用途 | 说明 |
|---------|------|------|
| [Fiber](https://github.com/gofiber/fiber) | REST API 框架 | 高性能、类 Express 风格 |
| [Uber Fx](https://github.com/uber-go/fx) | 依赖注入 | 应用生命周期管理 |
| [Uber Zap](https://github.com/uber-go/zap) | 日志 | 高性能结构化日志 |

### 2.3 依赖注入配置 (Fx)

```go
// main.go
package main

import (
    "go.uber.org/fx"
    "go.uber.org/zap"
    
    "subtrack/config"
    "subtrack/handler"
    "subtrack/repository"
    "subtrack/service"
)

func main() {
    app := fx.New(
        // 提供依赖
        fx.Provide(
            config.NewConfig,
            NewLogger,
            repository.NewSubscriptionRepository,
            repository.NewUserRepository,
            service.NewSubscriptionService,
            service.NewUserService,
            handler.NewSubscriptionHandler,
            handler.NewUserHandler,
            NewFiberApp,
        ),
        // 注册生命周期钩子
        fx.Invoke(RegisterRoutes),
        fx.Invoke(StartServer),
    )
    
    app.Run()
}

// NewLogger 创建 Zap Logger
func NewLogger() *zap.Logger {
    logger, _ := zap.NewProduction()
    return logger
}

// NewFiberApp 创建 Fiber 应用
func NewFiberApp(logger *zap.Logger) *fiber.App {
    return fiber.New(fiber.Config{
        Logger:   true,
        Prefork:  false,
        ErrorHandler: CustomErrorHandler(logger),
    })
}
```

### 2.4 数据模型定义

```go
// model/subscription.go
package model

import "time"

type Subscription struct {
    ID              string     `json:"_id" bson:"_id"`
    UserID          string     `json:"userId" bson:"userId"`
    Name            string     `json:"name" bson:"name"`
    Amount          int64      `json:"amount" bson:"amount"`           // 单位：分
    Currency        string     `json:"currency" bson:"currency"`       // CNY, USD, EUR 等
    BillingCycle    string     `json:"billingCycle" bson:"billingCycle"` // monthly, quarterly, yearly
    BillingDay      int        `json:"billingDay" bson:"billingDay"`   // 扣款日 1-31
    BillingMonth    *int       `json:"billingMonth,omitempty" bson:"billingMonth,omitempty"` // 年付时的月份
    StartDate       time.Time  `json:"startDate" bson:"startDate"`
    NextBillingDate time.Time  `json:"nextBillingDate" bson:"nextBillingDate"`
    Remark          string     `json:"remark,omitempty" bson:"remark"`
    Status          string     `json:"status" bson:"status"`           // active, cancelled
    CancelledAt     *time.Time `json:"cancelledAt,omitempty" bson:"cancelledAt"`
    Icon            string     `json:"icon,omitempty" bson:"icon"`
    Category        string     `json:"category,omitempty" bson:"category"`
    CreatedAt       time.Time  `json:"createdAt" bson:"createdAt"`
    UpdatedAt       time.Time  `json:"updatedAt" bson:"updatedAt"`
}
```

```go
// model/user.go
package model

import "time"

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
package model

type Response struct {
    Code    int         `json:"code"`
    Message string      `json:"message"`
    Data    interface{} `json:"data,omitempty"`
}
```

### 2.5 API 接口定义

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

### 2.6 Handler 示例

```go
// handler/subscription.go
package handler

import (
    "github.com/gofiber/fiber/v2"
    "go.uber.org/zap"
    
    "subtrack/model"
    "subtrack/service"
)

type SubscriptionHandler struct {
    service *service.SubscriptionService
    logger  *zap.Logger
}

func NewSubscriptionHandler(svc *service.SubscriptionService, logger *zap.Logger) *SubscriptionHandler {
    return &SubscriptionHandler{
        service: svc,
        logger:  logger,
    }
}

// GetSubscriptions 获取订阅列表
func (h *SubscriptionHandler) GetSubscriptions(c *fiber.Ctx) error {
    userID := c.Locals("userID").(string)
    
    subscriptions, err := h.service.GetByUserID(c.Context(), userID)
    if err != nil {
        h.logger.Error("获取订阅列表失败",
            zap.String("userID", userID),
            zap.Error(err),
        )
        return c.Status(500).JSON(model.Response{
            Code:    500,
            Message: "获取订阅列表失败",
        })
    }
    
    return c.JSON(model.Response{
        Code: 0,
        Data: subscriptions,
    })
}

// CreateSubscription 创建订阅
func (h *SubscriptionHandler) CreateSubscription(c *fiber.Ctx) error {
    var req model.CreateSubscriptionRequest
    if err := c.BodyParser(&req); err != nil {
        return c.Status(400).JSON(model.Response{
            Code:    400,
            Message: "请求参数错误",
        })
    }
    
    userID := c.Locals("userID").(string)
    
    subscription, err := h.service.Create(c.Context(), userID, &req)
    if err != nil {
        h.logger.Error("创建订阅失败",
            zap.String("userID", userID),
            zap.Error(err),
        )
        return c.Status(500).JSON(model.Response{
            Code:    500,
            Message: "创建订阅失败",
        })
    }
    
    h.logger.Info("创建订阅成功",
        zap.String("userID", userID),
        zap.String("subscriptionID", subscription.ID),
    )
    
    return c.JSON(model.Response{
        Code: 0,
        Data: subscription,
    })
}
```

### 2.7 请求/响应结构体

```go
// model/request.go
package model

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

## 3. 数据库设计

### 3.1 数据库集合

| 集合名 | 说明 | 权限规则 |
|--------|------|----------|
| users | 用户信息 | 仅创建者可读写 |
| subscriptions | 订阅记录 | 仅创建者可读写 |
| monthly_budgets | 月度预算 | 仅创建者可读写 |
| subscription_history | 订阅状态变更历史 | 仅创建者可读写 |
| exchange_rates | 汇率缓存 | 所有用户可读 |

### 3.2 数据库安全规则

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

### 3.3 索引设计

| 集合 | 索引名 | 字段 |
|------|--------|------|
| subscriptions | userId_status_nextBillingDate | `{ userId: 1, status: 1, nextBillingDate: 1 }` |
| monthly_budgets | userId_year_month | `{ userId: 1, year: 1, month: 1 }` (unique) |
| subscription_history | userId_subscriptionId_createdAt | `{ userId: 1, subscriptionId: 1, createdAt: -1 }` |

---

## 4. 定时任务设计

### 4.1 定时触发器配置

| 触发器 | Cron 表达式 | 说明 |
|--------|-------------|------|
| 续费提醒 | `0 0 9 * * * *` | 每天早上9点执行 |
| 更新汇率 | `0 0 0 * * * *` | 每天凌晨执行 |

### 4.2 云函数冷启动优化

- 定时预热云函数
- 使用全局变量缓存常用数据
- 优化依赖加载

---

## 5. 功能优先级

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 多端数据同步 | P1 | 云端存储支持多设备同步 |
| 家庭共享 | P2 | 多用户共享订阅信息 |
| 数据备份 | P1 | 云端自动备份 |
| 高级统计 | P2 | 更多统计维度 |

---

## 6. 实现条件

云端服务功能实现需要满足以下条件：

1. **用户需求**：用户量增长，需要多设备同步
2. **成本评估**：云开发费用预算
3. **运维能力**：具备云服务运维能力
4. **安全合规**：数据安全与隐私合规评估

---

## 7. 相关文档

- [技术设计文档](./technical_design.md) - 当前技术架构
- [产品设计文档](./project_design.md) - 产品功能设计
- [开发路线图](./roadmap.md) - 迭代规划
