# 认证与权限

## 1. 认证架构设计

### 1.1 核心原则

SubTrack 采用 **Provider 抽象层** 设计，支持多平台小程序接入：

- **微信小程序**：使用 CloudBase 原生认证，OPENID 自动注入
- **其他平台**（支付宝、抖音等）：通过统一的 Auth Provider 接口扩展
- **Web 端**（未来）：支持 OAuth 2.0 / JWT 认证

### 1.2 架构概览

```
┌─────────────────────────────────────────────────┐
│              客户端（多平台）                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ 微信小程序│  │ 支付宝   │  │ 抖音     │      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
└───────┼──────────────┼──────────────┼────────────┘
        │              │              │
        ▼              ▼              ▼
┌─────────────────────────────────────────────────┐
│           Auth Provider 抽象层                    │
│  ┌──────────────┐  ┌──────────────┐             │
│  │WechatProvider│  │AlipayProvider│  ...        │
│  └──────┬───────┘  └──────┬───────┘             │
└─────────┼──────────────────┼─────────────────────┘
          │                  │
          ▼                  ▼
┌─────────────────────────────────────────────────┐
│           统一用户标识 (Unified UserID)           │
│  - platform: "wechat" | "alipay" | "douyin"     │
│  - platform_user_id: 各平台的用户唯一标识         │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│           业务逻辑层                              │
│  - 基于 unified_user_id 进行数据隔离             │
│  - 权限验证中间件                                │
└─────────────────────────────────────────────────┘
```

---

## 2. 微信小程序认证（CloudBase 原生）

### 2.1 核心特性

微信小程序使用 CloudBase 时，**无需实现复杂的登录流程**。用户身份由微信自动注入并验证。

**关键优势：**

- 无需 `wx.login()` + `code2Session` 流程
- 无需生成和管理 JWT Token
- 云函数中直接获取已验证的 `OPENID`
- 微信服务器保证身份真实性

### 2.2 小程序端初始化

在小程序入口文件中初始化 CloudBase：

```javascript
// app.js
App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'your-env-id',  // CloudBase 环境 ID
        traceUser: true       // 可选：在控制台追踪用户访问
      })
    }
  }
})
```

### 2.3 云函数中获取用户身份

```javascript
// cloudfunctions/getUserInfo/index.js
const cloud = require('wx-server-sdk')

// 初始化云 SDK（自动使用当前环境）
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  // 获取用户身份 - 由微信自动注入并验证
  const wxContext = cloud.getWXContext()

  return {
    openid: wxContext.OPENID,   // 用户在当前小程序的唯一标识
    appid: wxContext.APPID,     // 当前小程序的 AppID
    unionid: wxContext.UNIONID  // 可选：跨应用用户标识
  }
}
```

**关键字段说明：**

| 字段 | 说明 | 是否可用 |
|------|------|----------|
| `OPENID` | 用户在当前小程序的唯一标识 | 始终可用 |
| `APPID` | 当前小程序的 AppID | 始终可用 |
| `UNIONID` | 跨应用用户标识 | 需绑定微信开放平台 |

### 2.4 小程序调用云函数

```javascript
// 在小程序页面中调用
Page({
  onLoad: function() {
    this.fetchUserData()
  },

  fetchUserData: function() {
    wx.cloud.callFunction({
      name: 'getUserInfo',
      success: res => {
        console.log('用户信息:', res.result)
        // res.result.openid 可直接用于数据查询
      },
      fail: err => {
        console.error('获取用户信息失败:', err)
      }
    })
  }
})
```

---

## 3. Go 后端认证（CloudRun / HTTP API）

当使用 Go 后端服务（部署在 CloudRun）时，需要通过 HTTP API 接收小程序传递的身份信息。

### 3.1 认证流程

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  小程序端    │         │  Go 后端    │         │  CloudBase  │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │ wx.cloud.callFunction │                       │
       │ 或 HTTP 请求          │                       │
       ├──────────────────────►│                       │
       │                       │                       │
       │ Header:               │                       │
       │ X-Platform: wechat    │                       │
       │ X-OpenID: xxx         │                       │
       ├──────────────────────►│                       │
       │                       │ 验证 OPENID 格式      │
       │                       │ 查询/创建用户          │
       │                       │                       │
       │ { user_id, ... }      │                       │
       │◄──────────────────────┤                       │
       │                       │                       │
```

### 3.2 请求头规范

所有需要认证的 API 请求需携带以下头部：

```http
X-Platform: wechat          # 平台标识: wechat/alipay/douyin
X-Platform-UserID: oXXXX    # 平台用户ID (openid/user_id等)
X-Timestamp: 1711238400     # 请求时间戳（防重放）
X-Signature: abc123...      # 签名（可选，增强安全性）
```

### 3.3 Go 中间件实现

```go
// middleware/auth.go
package middleware

import (
    "context"
    "net/http"
    "time"
)

// UserContext 用户上下文
type UserContext struct {
    Platform       string // wechat, alipay, douyin
    PlatformUserID string // 各平台的用户ID
    UnifiedUserID  string // 统一用户ID（数据库中的 user_id）
}

// AuthMiddleware 认证中间件
func AuthMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // 1. 提取平台标识
        platform := r.Header.Get("X-Platform")
        if platform == "" {
            http.Error(w, "Missing X-Platform header", http.StatusBadRequest)
            return
        }

        // 2. 提取平台用户ID
        platformUserID := r.Header.Get("X-Platform-UserID")
        if platformUserID == "" {
            http.Error(w, "Missing X-Platform-UserID header", http.StatusBadRequest)
            return
        }

        // 3. 验证时间戳（防重放攻击，允许 5 分钟误差）
        timestamp := r.Header.Get("X-Timestamp")
        if !validateTimestamp(timestamp) {
            http.Error(w, "Invalid timestamp", http.StatusUnauthorized)
            return
        }

        // 4. 根据平台获取/创建统一用户ID
        unifiedUserID, err := getOrCreateUnifiedUserID(platform, platformUserID)
        if err != nil {
            http.Error(w, "Authentication failed", http.StatusInternalServerError)
            return
        }

        // 5. 将用户信息注入上下文
        ctx := context.WithValue(r.Context(), UserContextKey, &UserContext{
            Platform:       platform,
            PlatformUserID: platformUserID,
            UnifiedUserID:  unifiedUserID,
        })

        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

// GetUserFromContext 从上下文中获取用户信息
func GetUserFromContext(ctx context.Context) *UserContext {
    user, ok := ctx.Value(UserContextKey).(*UserContext)
    if !ok {
        return nil
    }
    return user
}

// validateTimestamp 验证时间戳
func validateTimestamp(timestamp string) bool {
    ts, err := parseTimestamp(timestamp)
    if err != nil {
        return false
    }
    return time.Since(ts) < 5*time.Minute
}
```

### 3.4 用户映射表设计

为了支持多平台用户统一识别，需要在数据库中维护平台用户ID到统一用户ID的映射：

```sql
CREATE TABLE user_platforms (
  id VARCHAR(36) PRIMARY KEY,
  unified_user_id VARCHAR(36) NOT NULL,  -- 关联 users 表
  platform VARCHAR(20) NOT NULL,          -- wechat/alipay/douyin
  platform_user_id VARCHAR(128) NOT NULL, -- 各平台的用户ID
  platform_extra JSON,                    -- 平台额外信息（如 unionid）
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_platform_user (platform, platform_user_id),
  INDEX idx_unified_user (unified_user_id),
  FOREIGN KEY (unified_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 4. 多平台扩展指南

### 4.1 新增平台 Provider

要支持新的平台（如支付宝小程序），只需：

1. **实现 Auth Provider 接口**

```go
// auth/provider.go
package auth

type AuthProvider interface {
    // Validate 验证平台传来的身份信息
    Validate(platformUserID string, extra map[string]string) error

    // GetUnifiedUserID 获取或创建统一用户ID
    GetUnifiedUserID(platformUserID string) (string, error)
}
```

1. **注册新平台**

```go
// auth/alipay_provider.go
package auth

type AlipayProvider struct {
    db *gorm.DB
}

func (p *AlipayProvider) Validate(platformUserID string, extra map[string]string) error {
    // 支付宝身份验证逻辑
    // 例如：验证 user_id 格式、校验签名等
    return nil
}

func (p *AlipayProvider) GetUnifiedUserID(platformUserID string) (string, error) {
    // 查询或创建用户映射
    var mapping UserPlatform
    err := p.db.Where("platform = ? AND platform_user_id = ?", "alipay", platformUserID).
        First(&mapping).Error

    if err == gorm.ErrRecordNotFound {
        // 创建新用户
        return p.createNewUser(platformUserID)
    }
    return mapping.UnifiedUserID, err
}
```

1. **在路由中使用**

```go
// main.go
authProviders := map[string]auth.AuthProvider{
    "wechat": &auth.WechatProvider{db: db},
    "alipay": &auth.AlipayProvider{db: db},
    // 未来扩展
    // "douyin": &auth.DouyinProvider{db: db},
}

router.Use(middleware.AuthMiddleware(authProviders))
```

### 4.2 平台对比

| 特性 | 微信小程序 | 支付宝小程序 | 抖音小程序 |
|------|-----------|-------------|-----------|
| 用户标识 | OPENID | user_id | open_id |
| 跨应用标识 | UNIONID | user_id（同主体） | union_id |
| CloudBase 支持 | ✅ 原生 | ❌ 需 HTTP API | ❌ 需 HTTP API |
| 认证复杂度 | 低（自动） | 中 | 中 |

---

## 5. 权限控制

### 5.1 资源权限模型

用户只能访问自己的数据，通过在数据库查询中使用 `unified_user_id` 过滤实现：

```go
// services/subscription.go
func GetUserSubscriptions(ctx context.Context, db *gorm.DB) ([]Subscription, error) {
    user := middleware.GetUserFromContext(ctx)
    if user == nil {
        return nil, errors.New("unauthenticated")
    }

    var subscriptions []Subscription
    err := db.Where("user_id = ?", user.UnifiedUserID).
        Find(&subscriptions).Error
    return subscriptions, err
}
```

### 5.2 SQL 层面的安全保障

所有涉及用户数据的查询都必须包含用户ID过滤：

```sql
-- 正确：包含用户ID过滤
SELECT * FROM subscriptions
WHERE user_id = ? AND id = ?

-- 错误：缺少用户ID过滤（禁止）
SELECT * FROM subscriptions
WHERE id = ?
```

---

## 6. 安全措施

### 6.1 防重放攻击

- 请求携带时间戳
- 服务端验证时间戳在合理范围内（如 5 分钟）
- HTTPS 加密传输

### 6.2 敏感信息保护

- 不存储密码（使用平台原生认证）
- 平台用户ID不记录到日志
- 数据库连接信息通过环境变量配置

### 6.3 速率限制

- 登录接口：同一 IP 每分钟最多 10 次
- 业务接口：同一用户每秒最多 20 次

---

## 7. 错误处理

### 7.1 认证失败

**401 Unauthorized**

```json
{
  "code": 401,
  "message": "认证失败：无效的凭证或已过期的会话"
}
```

### 7.2 权限不足

**403 Forbidden**

```json
{
  "code": 403,
  "message": "无权限访问该资源"
}
```

### 7.3 平台不支持

**400 Bad Request**

```json
{
  "code": 400,
  "message": "不支持的平台: xxx"
}
```

---

## 8. 最佳实践

### 8.1 微信小程序优先使用云函数

对于大多数业务场景，**优先使用云函数**而非 CloudRun：

| 对比项 | 云函数 | CloudRun |
|--------|--------|----------|
| 身份获取 | 自动（getWXContext） | 需手动传递 |
| 冷启动 | 较快 | 较慢 |
| 成本 | 按调用计费 | 按实例运行计费 |
| 适用场景 | CRUD、简单逻辑 | 长连接、复杂计算 |

### 8.2 统一用户ID设计

- 使用 UUID v4 作为 `unified_user_id`
- 一个用户可以关联多个平台账号
- 通过 `user_platforms` 表管理多平台映射

### 8.3 调试技巧

在开发环境中，可以添加调试接口快速测试：

```javascript
// 云函数：debug/getMyOpenID
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  return { openid: OPENID }
}
```

在小程序控制台调用此函数即可快速获取当前用户的 OPENID。
