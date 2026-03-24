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

## 2. 认证接口

### 2.1 微信登录

**POST** `/auth/login`

**请求：**
```json
{
  "code": "wx_login_code"
}
```

**响应：**
```json
{
  "code": 0,
  "data": {
    "token": "jwt_token",
    "expiresIn": 7200,
    "user": {
      "id": "user_id",
      "openid": "wx_openid",
      "nickname": "用户昵称",
      "avatar": "头像URL"
    }
  }
}
```

### 2.2 刷新 Token

**POST** `/auth/refresh`

**请求头：**
```
Authorization: Bearer {token}
```

**响应：**
```json
{
  "code": 0,
  "data": {
    "token": "new_jwt_token",
    "expiresIn": 7200
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
| 401 | 未授权，Token 无效或过期 |
| 403 | 无权限访问 |
| 404 | 资源不存在 |
| 409 | 数据冲突 |
| 500 | 服务器内部错误 |

## 8. 认证机制

所有需要认证的接口，请求头需携带 JWT Token：

```
Authorization: Bearer {token}
```
