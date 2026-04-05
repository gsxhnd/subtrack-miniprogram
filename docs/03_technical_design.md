# SubTrack 技术设计文档

## 1. 技术架构

### 1.1 当前架构原则

SubTrack 当前采用 CloudBase 云端架构，不再使用微信小程序本地存储作为主数据源。所有核心业务数据统一存放在云端，前端通过云托管后端服务访问数据与业务能力。

### 1.2 技术栈选型

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 前端框架 | weapp-vite | 微信小程序工程化开发工具 |
| UI组件 | 自定义组件 | 基于微信小程序原生组件封装 |
| 云平台 | 腾讯云 CloudBase | 提供云托管、文档数据库、云存储与身份接入 |
| 后端能力 | CloudBase 云托管 | 以 Go 服务构建 Docker 容器并部署 API 服务 |
| 数据库 | CloudBase 文档数据库 | 存储用户、订阅、预算、汇率等业务数据 |
| 身份认证 | 微信小程序身份接入 | 通过 CloudBase 获取可信 `openid` |
| 图表库 | Chart.js | 用于统计图表渲染 |

### 1.3 总体架构图

```
┌─────────────────────────────────────────────────────────┐
│                 微信小程序 (weapp-vite)                 │
│  ┌───────────────────────────────────────────────────┐  │
│  │ 页面 / 组件 / 状态层                              │  │
│  │ - 首页                                            │  │
│  │ - 订阅列表                                        │  │
│  │ - 统计                                            │  │
│  │ - 我的                                            │  │
│  └──────────────────────┬────────────────────────────┘  │
└─────────────────────────┼───────────────────────────────┘
                          │ HTTPS / CloudBase Access
┌─────────────────────────▼───────────────────────────────┐
│               CloudBase 云托管 Go 服务层                │
│  - auth / user API                                      │
│  - subscription API                                     │
│  - budget API                                           │
│  - statistics API                                       │
│  - exchange-rate API                                    │
│  - import-export API                                    │
│  - Docker 容器部署                                      │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                CloudBase 文档数据库 / 云存储             │
│  - users                                                │
│  - subscriptions                                        │
│  - monthly_budgets                                      │
│  - subscription_history                                 │
│  - exchange_rates                                       │
│  - 导出文件 / 图标资源                                  │
└─────────────────────────────────────────────────────────┘
```

### 1.4 认证与身份说明

- 当前不设计 Web 式登录页。
- 用户进入小程序后，通过微信小程序身份接入 CloudBase。
- 云托管 Go 服务负责处理 API 请求、身份校验和业务逻辑。
- 业务数据按 `openid` 或对应的用户记录隔离，确保每个用户只能访问自己的数据。

---

## 2. 项目结构

### 2.1 当前仓库结构

```
subtrack-miniprogram/
├── weapp/                     # 微信小程序工程
│   ├── src/
│   │   ├── components/        # 公共组件
│   │   ├── custom-tab-bar/    # 自定义 TabBar
│   │   ├── pages/             # 主包页面
│   │   ├── packageSettings/   # 设置相关分包
│   │   ├── packageSubscription/# 订阅相关分包
│   │   ├── store/             # 前端状态与事件管理
│   │   ├── app.json           # 小程序路由配置
│   │   └── app.scss           # 全局样式
│   ├── project.config.json
│   └── package.json
├── docs/                      # 项目文档
└── README.md
```

### 2.2 建议的后端目录

```
server/
├── cmd/
│   └── api/                   # 服务启动入口
├── internal/
│   ├── handler/               # HTTP 处理层
│   ├── service/               # 业务逻辑层
│   ├── repository/            # 数据访问层
│   ├── middleware/            # 鉴权、日志、中间件
│   ├── model/                 # 数据模型
│   └── config/                # 配置与环境变量
├── Dockerfile                 # 容器构建文件
└── go.mod
```

### 2.3 前端职责

- 页面渲染与交互。
- 表单校验与用户反馈。
- 通过 HTTPS 调用云托管 Go API 获取或提交数据。
- 在内存中维护页面状态，不以本地缓存作为最终数据来源。

### 2.4 云托管服务职责

- 接收小程序请求并暴露稳定 API。
- 获取调用者身份。
- 执行业务校验。
- 访问 CloudBase 文档数据库。
- 汇总统计结果并返回前端。
- 控制数据权限边界。

### 2.5 容器部署说明

- 后端使用 Go 编写。
- 通过 Dockerfile 构建容器镜像。
- 部署到 CloudBase 云托管。
- 服务需监听平台注入的 `PORT`，保持无状态。
- 持久化数据统一落在数据库或云存储，不写本地磁盘。

---

## 3. 数据模型设计

### 3.1 用户集合 `users`

| 字段名 | 类型 | 说明 |
|--------|------|------|
| _id | String | 文档主键 |
| openid | String | 微信用户标识 |
| nickname | String | 昵称 |
| avatar | String | 头像 |
| monthlyBudget | Number | 默认月度预算，单位分 |
| budgetCurrency | String | 预算币种 |
| reminderEnabled | Boolean | 是否开启提醒 |
| reminderDays | Number | 提前提醒天数 |
| createdAt | Date | 创建时间 |
| updatedAt | Date | 更新时间 |

### 3.2 订阅集合 `subscriptions`

| 字段名 | 类型 | 说明 |
|--------|------|------|
| _id | String | 文档主键 |
| openid | String | 所属用户标识 |
| name | String | 订阅名称 |
| amount | Number | 金额，单位分 |
| currency | String | 币种 |
| billingCycle | String | `monthly` / `quarterly` / `yearly` |
| billingDay | Number | 扣款日 |
| billingMonth | Number | 年付月份 |
| startDate | Date | 开始日期 |
| nextBillingDate | Date | 下次扣款日期 |
| remark | String | 备注 |
| status | String | `active` / `cancelled` |
| cancelledAt | Date | 取消时间 |
| icon | String | 图标标识或文件地址 |
| category | String | 分类 |
| createdAt | Date | 创建时间 |
| updatedAt | Date | 更新时间 |

### 3.3 月度预算集合 `monthly_budgets`

| 字段名 | 类型 | 说明 |
|--------|------|------|
| _id | String | 文档主键 |
| openid | String | 所属用户标识 |
| year | Number | 年 |
| month | Number | 月 |
| budget | Number | 预算金额，单位分 |
| currency | String | 预算币种 |
| createdAt | Date | 创建时间 |
| updatedAt | Date | 更新时间 |

### 3.4 历史记录集合 `subscription_history`

| 字段名 | 类型 | 说明 |
|--------|------|------|
| _id | String | 文档主键 |
| openid | String | 所属用户标识 |
| subscriptionId | String | 订阅 ID |
| action | String | `created` / `updated` / `cancelled` / `reactivated` |
| previousValue | Object | 变更前值 |
| newValue | Object | 变更后值 |
| createdAt | Date | 创建时间 |

### 3.5 汇率集合 `exchange_rates`

| 字段名 | 类型 | 说明 |
|--------|------|------|
| _id | String | 文档主键 |
| baseCurrency | String | 基准货币 |
| rates | Object | 各币种汇率映射 |
| source | String | 数据来源 |
| updatedAt | Date | 更新时间 |

### 3.6 索引建议

| 集合 | 索引字段 | 用途 |
|------|----------|------|
| subscriptions | `openid, status, nextBillingDate` | 首页提醒、列表筛选 |
| subscriptions | `openid, category` | 分类统计 |
| monthly_budgets | `openid, year, month` | 月预算查询 |
| subscription_history | `openid, subscriptionId, createdAt` | 变更历史查询 |

---

## 4. 认证与权限设计

### 4.1 身份流程

```
用户进入小程序
    │
    ▼
初始化 CloudBase 环境
    │
    ▼
前端调用 auth API
    │
    ▼
Go 服务获取并校验 OPENID
    │
    ▼
查找或创建 users 记录
    │
    ▼
返回当前用户基础信息
```

### 4.2 权限原则

- 所有用户数据按 `openid` 隔离。
- 所有写操作必须在后端服务中校验所属用户。
- 前端不直接信任页面传入的 `userId`。
- 导入、导出、删除等敏感操作必须再次校验当前调用者身份。

### 4.3 服务端身份处理约定

- 小程序侧完成 CloudBase 环境初始化。
- 请求进入 Go 服务后，由服务端结合 CloudBase 提供的身份上下文识别当前用户。
- 服务端统一将当前用户身份映射到业务查询条件，不信任前端直接传入的用户标识。
- 所有用户数据访问都以服务端解析出的 `openid` 为准。

---

## 5. API 设计

### 5.1 用户与设置

| 服务 | 操作 | 说明 |
|------|------|------|
| auth | init | 初始化当前用户 |
| user | get | 获取用户设置 |
| user | update | 更新预算、提醒等设置 |

### 5.2 订阅管理

| 服务 | 操作 | 说明 |
|------|------|------|
| subscription | list | 获取订阅列表 |
| subscription | detail | 获取订阅详情 |
| subscription | save | 新建或更新订阅 |
| subscription | delete | 删除订阅 |
| subscription | cancel | 取消订阅 |

### 5.3 预算与统计

| 服务 | 操作 | 说明 |
|------|------|------|
| budget | getMonthlyBudget | 获取月度预算 |
| budget | saveMonthlyBudget | 保存月度预算 |
| statistics | dashboard | 首页总览数据 |
| statistics | trend | 月度支出趋势 |
| statistics | category | 分类统计 |
| statistics | currency | 币种分布 |

### 5.4 汇率与导入

| 服务 | 操作 | 说明 |
|------|------|------|
| exchange-rate | get | 获取当前汇率 |
| exchange-rate | update | 更新用户使用的汇率 |
| import-export | import | 导入数据 |

### 5.5 响应结构

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

错误约定：

- `code = 0`：成功
- `code = 400`：参数错误
- `code = 401`：身份无效或未获取到用户信息
- `code = 403`：无权访问目标数据
- `code = 500`：服务端异常

---

## 6. 业务规则

### 6.1 扣款日期计算

| 周期 | 规则 |
|------|------|
| 月付 | 每月指定日期扣款 |
| 季付 | 从开始日期起每 3 个月扣款 |
| 年付 | 每年指定月日扣款 |

边界规则：

- 月末日期自动修正到当月有效日期。
- 闰年场景按真实自然日计算。
- 保存订阅时由后端服务统一计算 `nextBillingDate`。

### 6.2 订阅状态变更

- `active` 表示有效订阅。
- `cancelled` 表示已取消订阅。
- 取消后重新订阅时创建新记录，保留历史链路。

### 6.3 预算统计

月均费用换算规则：

- 月付：金额
- 季付：金额 / 3
- 年付：金额 / 12

统计时统一转换为用户选择的基准货币。

---

## 7. 续费提醒与导入

### 7.1 续费提醒

- 默认提前 3 天提醒。
- 用户可配置 1 到 7 天的提醒周期。
- 首页会展示即将续费的订阅列表。
- 后续可接入订阅消息提醒，当前先保留小程序内提示能力。

### 7.2 数据导入

- 前端上传 JSON 数据。
- 后端服务执行格式校验、去重与导入。
- 支持替换、合并、仅导入订阅三种模式。

---

## 8. 性能与安全

### 8.1 性能策略

- 订阅列表按条件分页查询。
- 首页与统计页聚合结果由后端服务统一计算。
- 对高频查询字段建立索引。
- 汇率数据设置缓存更新时间，避免重复拉取。

### 8.2 安全策略

- 所有写入通过后端服务执行。
- 所有查询以当前 `openid` 为过滤条件。
- 云数据库权限配置为仅允许受控访问。
- 导入数据前需完成格式校验与用户确认。

### 8.3 监控与排障

- 关键 API 与后端服务记录结构化日志。
- 统计失败与导入失败保留错误信息。
- 发布前检查云托管配置、数据库索引与环境变量。

---

## 9. 相关文档

- [产品设计文档](./01_project_design.md) - 产品目标、功能范围与业务规则
- [界面设计文档](./02_ui_design.md) - 页面结构、交互与组件设计
- [开发路线图](./04_roadmap.md) - 迭代规划与交付节奏
