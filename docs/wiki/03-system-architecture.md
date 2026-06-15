# SubTrack 架构与数据

## 整体架构

SubTrack 采用「前端本地缓存 + CloudBase 云端服务 + MySQL 持久化」架构：

1. 小程序（Vue 3 + Pinia）负责交互与状态管理
2. CloudBase 云函数处理轻量业务与身份获取（OPENID）
3. Cloud Run（Go，可选）承载复杂业务接口
4. MySQL 保存订阅、设置与历史数据

## 核心技术栈

- 前端：`weapp-vite` + `Vue 3` + `Pinia`
- 云平台：CloudBase（云函数 + Cloud Run）
- 后端：Go + Fiber + GORM
- 数据库：MySQL 8.0+

## 关键数据流

- **读流程**：先读本地缓存，缓存失效时请求云端并回写缓存
- **写流程**：先本地乐观更新，再提交云端；失败则回滚并提示
- **同步策略**：云端主数据、本地缓存、增量同步、冲突按时间戳处理

## 数据模型（核心）

### users

- `id`（PK）
- `openid`（唯一）
- `nickname` / `avatar`
- `created_at` / `updated_at`

### subscriptions

- `id`（PK）
- `user_id`（FK -> users.id）
- `name` / `amount` / `currency`
- `billing_cycle` / `billing_day` / `billing_month`
- `next_billing_date` / `status`
- `category` / `remark`

### user_settings

- `user_id`（唯一）
- `monthly_budget` / `budget_currency`
- `reminder_enabled` / `reminder_days`
- `base_currency`

### subscription_history

- `subscription_id`
- `action`（created/updated/cancelled/deleted）
- `previous_value` / `new_value`

## 约束与规则

- 所有金额以「分」存储，避免浮点误差
- 日期统一使用 ISO 8601（接口层）与标准日期类型（数据库层）
- 所有用户数据查询必须带 `user_id` 条件，禁止跨用户访问
- 关键索引：
  - `users.openid`
  - `subscriptions(user_id, status)`
  - `subscriptions.next_billing_date`

## 运行与质量要求

- 性能：首屏 < 3s，列表滚动流畅
- 可用性：离线可读、失败可重试
- 安全：HTTPS、身份校验、参数验证与 SQL 注入防护

