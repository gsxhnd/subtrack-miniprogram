# 认证与权限

## 1. 微信小程序登录流程

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  小程序端    │         │  后端服务    │         │  微信服务器  │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │ wx.login()            │                       │
       ├──────────────────────►│                       │
       │                       │                       │
       │ code                  │                       │
       │◄──────────────────────┤                       │
       │                       │                       │
       │ POST /auth/login      │                       │
       │ { code }              │                       │
       ├──────────────────────►│                       │
       │                       │ code2Session          │
       │                       ├──────────────────────►│
       │                       │                       │
       │                       │ openid, session_key   │
       │                       │◄──────────────────────┤
       │                       │                       │
       │                       │ 查询/创建用户          │
       │                       │ 生成 JWT Token        │
       │                       │                       │
       │ { token, user }       │                       │
       │◄──────────────────────┤                       │
       │                       │                       │
```

## 2. JWT Token 机制

### 2.1 Token 结构

```
Header.Payload.Signature
```

**Payload 内容：**
```json
{
  "userId": "user_id",
  "openid": "wx_openid",
  "iat": 1711238400,
  "exp": 1711245600
}
```

### 2.2 Token 生成

- 算法: HS256
- 密钥: 环境变量 `JWT_SECRET`
- 有效期: 2 小时

### 2.3 Token 刷新

- Token 过期前 30 分钟可刷新
- 刷新后旧 Token 立即失效
- 刷新接口: `POST /auth/refresh`

## 3. API 认证

### 3.1 请求头

所有需要认证的接口，请求头需携带：

```
Authorization: Bearer {token}
```

### 3.2 认证中间件

```
请求
  │
  ▼
提取 Token
  │
  ▼
验证 Token
  │
  ├─ 有效 ──► 解析用户信息 ──► 继续处理
  │
  └─ 无效 ──► 返回 401 错误
```

## 4. 权限控制

### 4.1 资源权限

用户只能访问自己的数据：

- 订阅数据: `subscription.user_id == current_user.id`
- 用户设置: `settings.user_id == current_user.id`
- 统计数据: 基于 `current_user.id` 查询

### 4.2 权限验证

在数据库查询时添加用户 ID 过滤：

```sql
SELECT * FROM subscriptions 
WHERE user_id = ? AND id = ?
```

## 5. 安全措施

### 5.1 防止重放攻击

- Token 包含时间戳
- Token 有效期限制
- HTTPS 加密传输

### 5.2 防止暴力破解

- 登录失败次数限制
- IP 访问频率限制
- 验证码机制（可选）

### 5.3 敏感信息保护

- 密码不存储（使用微信登录）
- Token 不记录到日志
- 数据库连接信息加密存储

## 6. 错误处理

### 6.1 认证失败

**401 Unauthorized**
```json
{
  "code": 401,
  "message": "Token 无效或已过期"
}
```

### 6.2 权限不足

**403 Forbidden**
```json
{
  "code": 403,
  "message": "无权限访问该资源"
}
```
