# SubTrack API 设计

## 1. API 规范

### 1.1 基础信息

- **协议**: HTTPS
- **格式**: JSON
- **编码**: UTF-8
- **Base URL**: `https://api.subtrack.example.com/v1`

### 1.2 通用响应格式

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

**状态码说明：**

- `0`: 成功
- `400`: 请求参数错误
- `401`: 未授权
- `403`: 无权限
- `404`: 资源不存在
- `500`: 服务器错误

## 2. 认证说明

### 2.1 微信小程序（CloudBase 云函数）

使用 CloudBase 云函数时，**无需显式登录接口**。用户身份通过 `wx.cloud.callFunction` 自动传递，云函数中通过 `cloud.getWXContext()` 获取已验证的 OPENID。

详见 [认证与权限](./09-authentication.md)。

### 2.2 Go 后端服务（CloudRun / HTTP API）

当使用 Go 后端服务时，小程序需在请求头中携带身份信息：

```http
X-Platform: wechat
X-Platform-UserID: oXXXX_openid
X-Timestamp: 1711238400
```

**响应示例：**

```json
{
  "code": 0,
  "data": {
    "user_id": "unified_user_id",
    "platform": "wechat",
    "openid": "wx_openid"
  }
}
```

## 3. 订阅管理接口

### 3.1 获取订阅列表

**GET** `/subscriptions`

**查询参数：**

- `status`: 状态筛选 (active/cancelled/all)
- `sortBy`: 排序字段 (name/amount/nextBillingDate)
- `sortOrder`: 排序方向 (asc/desc)

**响应：**

```json
{
  "code": 0,
  "data": {
    "subscriptions": [
      {
        "id": "sub_001",
        "name": "ChatGPT Plus",
        "amount": 2000,
        "currency": "USD",
        "billingCycle": "monthly",
        "billingDay": 15,
        "nextBillingDate": "2026-04-15T00:00:00Z",
        "status": "active",
        "category": "AI工具",
        "createdAt": "2024-01-15T00:00:00Z",
        "updatedAt": "2026-03-24T00:00:00Z"
      }
    ],
    "total": 5
  }
}
```

### 3.2 创建订阅

**POST** `/subscriptions`

**请求：**

```json
{
  "name": "ChatGPT Plus",
  "amount": 2000,
  "currency": "USD",
  "billingCycle": "monthly",
  "billingDay": 15,
  "startDate": "2024-01-15",
  "category": "AI工具",
  "remark": "个人使用"
}
```

**响应：**

```json
{
  "code": 0,
  "data": {
    "id": "sub_001",
    "name": "ChatGPT Plus",
    "amount": 2000,
    "currency": "USD",
    "billingCycle": "monthly",
    "billingDay": 15,
    "nextBillingDate": "2026-04-15T00:00:00Z",
    "status": "active",
    "createdAt": "2026-03-24T00:00:00Z"
  }
}
```

### 3.3 更新订阅

**PUT** `/subscriptions/:id`

**请求：**

```json
{
  "name": "ChatGPT Plus",
  "amount": 2000,
  "remark": "更新备注"
}
```

**响应：**

```json
{
  "code": 0,
  "data": {
    "id": "sub_001",
    "updatedAt": "2026-03-24T00:00:00Z"
  }
}
```

### 3.4 删除订阅

**DELETE** `/subscriptions/:id`

**响应：**

```json
{
  "code": 0,
  "message": "删除成功"
}
```

### 3.5 取消订阅

**POST** `/subscriptions/:id/cancel`

**响应：**

```json
{
  "code": 0,
  "data": {
    "id": "sub_001",
    "status": "cancelled",
    "cancelledAt": "2026-03-24T00:00:00Z"
  }
}
```

## 4. 用户设置接口

### 4.1 获取设置

**GET** `/settings`

**响应：**

```json
{
  "code": 0,
  "data": {
    "monthlyBudget": 50000,
    "budgetCurrency": "CNY",
    "reminderEnabled": true,
    "reminderDays": 3,
    "baseCurrency": "CNY"
  }
}
```

### 4.2 更新设置

**PUT** `/settings`

**请求：**

```json
{
  "monthlyBudget": 50000,
  "budgetCurrency": "CNY",
  "reminderEnabled": true,
  "reminderDays": 3
}
```

**响应：**

```json
{
  "code": 0,
  "message": "更新成功"
}
```

## 5. 统计接口

### 5.1 概览统计

**GET** `/statistics/summary`

**响应：**

```json
{
  "code": 0,
  "data": {
    "activeCount": 5,
    "cancelledCount": 2,
    "monthlyTotal": 26500,
    "yearlyTotal": 318000,
    "currency": "CNY"
  }
}
```

### 5.2 趋势分析

**GET** `/statistics/trend`

**查询参数：**

- `period`: 时间范围 (month/quarter/year)

**响应：**

```json
{
  "code": 0,
  "data": {
    "trend": [
      { "month": "2026-01", "amount": 26500 },
      { "month": "2026-02", "amount": 28000 },
      { "month": "2026-03", "amount": 26500 }
    ]
  }
}
```

### 5.3 分类统计

**GET** `/statistics/category`

**响应：**

```json
{
  "code": 0,
  "data": {
    "categories": [
      { "name": "AI工具", "amount": 12000, "percentage": 45 },
      { "name": "效率工具", "amount": 8000, "percentage": 30 },
      { "name": "娱乐", "amount": 5000, "percentage": 19 }
    ]
  }
}
```

## 6. 数据同步接口

### 6.1 批量同步

**POST** `/sync`

**请求：**

```json
{
  "lastSyncTime": "2026-03-23T00:00:00Z",
  "localChanges": [
    {
      "type": "subscription",
      "action": "create",
      "data": {}
    }
  ]
}
```

**响应：**

```json
{
  "code": 0,
  "data": {
    "serverChanges": [],
    "conflicts": [],
    "syncTime": "2026-03-24T00:00:00Z"
  }
}
```

## 7. 错误码定义

| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权，身份验证失败 |
| 403 | 无权限访问 |
| 404 | 资源不存在 |
| 409 | 数据冲突 |
| 500 | 服务器内部错误 |

## 8. 认证机制

### 8.1 微信小程序（云函数）

使用 `wx.cloud.callFunction` 调用云函数时，用户身份自动传递，无需额外配置。

### 8.2 Go 后端服务（HTTP API）

所有需要认证的 HTTP 接口，请求头需携带以下字段：

```http
X-Platform: wechat              # 平台标识
X-Platform-UserID: oXXXX        # 平台用户ID
X-Timestamp: 1711238400         # 时间戳（防重放）
```

详见 [认证与权限](./09-authentication.md)。
