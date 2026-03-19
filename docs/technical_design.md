# SubTrack 技术设计文档

## 1. 技术架构

### 1.1 技术栈选型

本项目采用**各平台原生开发**模式，当前优先实现微信小程序，后续根据需要扩展其他平台。

#### 微信小程序技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 前端框架 | [weapp-vite](https://vite.icebreaker.top/) + Vue 3 | 现代化小程序工程化工具，基于 Vite + Vue 3 |
| UI组件库 | Vant Weapp / 自定义组件 | 微信小程序原生组件库 |
| 状态管理 | Wevu / Pinia | Vue 3 风格响应式状态管理 |
| 数据存储 | 微信小程序本地存储 | 数据完全存储在本地，无需云端服务 |
| 图表库 | ECharts for WeChat | 微信小程序图表组件 |

### 1.2 多平台策略

**当前阶段：** 仅实现微信小程序端

**项目结构设计：** 采用多平台独立目录结构，便于后续扩展

```
subtrack-miniprogram/
├── wechat/                 # 微信小程序（当前开发）
│   ├── src/
│   ├── miniprogram/
│   └── package.json
├── alipay/                 # 支付宝小程序（未来扩展）
├── h5/                     # H5 版本（未来扩展）
└── docs/                   # 共享文档
```

**未来扩展平台：**

| 平台 | 扩展优先级 | 说明 |
|------|------------|------|
| 支付宝小程序 | P1 | 扩大用户覆盖 |
| H5 | P2 | 浏览器访问，便于分享传播 |
| 抖音小程序 | P3 | 短视频平台用户覆盖 |

### 1.3 架构图

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
│  │          │  (状态管理 + 持久化) │               │   │
│  │          └──────────┬──────────┘               │   │
│  │                     │                          │   │
│  │          ┌──────────▼──────────┐               │   │
│  │          │  本地存储 API       │               │   │
│  │          │  (wx.setStorage)    │               │   │
│  │          └─────────────────────┘               │   │
│  └────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────┘
                         │
                         ▼
┌───────────────────────────────────────────────────────┐
│                   本地数据存储                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │  - subscriptions: 订阅列表数据                   │  │
│  │  - userSettings: 用户设置（预算、提醒等）        │  │
│  │  - exchangeRates: 汇率缓存数据                   │  │
│  │  - exportHistory: 导出历史记录                   │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  特点：完全本地运行，无需云端服务                     │
│  支持：JSON 导入导出，数据备份与迁移                  │
└───────────────────────────────────────────────────────┘
```

---

## 2. 项目结构

### 2.1 整体项目结构

```
subtrack-miniprogram/
├── wechat/                     # 微信小程序（当前开发）
│   ├── src/
│   │   ├── api/                # 外部 API 封装（汇率等）
│   │   ├── assets/             # 静态资源
│   │   ├── components/         # 公共组件
│   │   ├── composables/        # 组合式函数 (Vue 3 Hooks)
│   │   ├── models/             # 数据模型/类型定义
│   │   ├── pages/              # 页面
│   │   ├── store/              # Wevu / Pinia 状态管理
│   │   ├── styles/             # 全局样式
│   │   ├── utils/              # 工具函数
│   │   │   ├── storage.ts      # 本地存储封装
│   │   │   ├── import-export.ts # 导入导出工具
│   │   │   └── billing.ts      # 扣款计算工具
│   │   ├── app.vue             # 应用入口组件
│   │   └── main.ts             # Vue 应用初始化
│   ├── miniprogram/           # 小程序编译输出目录
│   ├── project.config.json    # 微信小程序配置
│   └── package.json
├── alipay/                    # 支付宝小程序（未来扩展）
├── h5/                        # H5 版本（未来扩展）
├── docs/                      # 项目文档
└── README.md
```

### 2.2 微信小程序详细结构

```
wechat/
├── src/
│   ├── api/                    # 外部 API 封装
│   │   └── exchange-rate.ts    # 汇率 API
│   ├── assets/                 # 静态资源
│   │   ├── icons/              # 图标资源
│   │   └── images/             # 图片资源
│   ├── components/             # 公共组件
│   │   ├── BudgetProgress/     # 预算进度组件
│   │   ├── SubscriptionCard/   # 订阅卡片组件
│   │   ├── AmountInput/        # 金额输入组件
│   │   └── BillingDatePicker/  # 扣款日期选择组件
│   ├── composables/            # 组合式函数
│   │   ├── useSubscription.ts  # 订阅相关逻辑
│   │   ├── useBudget.ts        # 预算相关逻辑
│   │   └── useExchangeRate.ts  # 汇率相关逻辑
│   ├── models/                 # 数据模型/类型定义
│   │   ├── subscription.ts     # 订阅数据模型
│   │   ├── user.ts             # 用户设置模型
│   │   └── exchange-rate.ts    # 汇率模型
│   ├── pages/                  # 页面
│   │   ├── index/              # 首页
│   │   ├── subscription/       # 订阅列表
│   │   ├── subscription-detail/# 订阅详情
│   │   ├── subscription-edit/  # 订阅编辑
│   │   ├── statistics/         # 统计页
│   │   ├── settings/           # 设置页
│   │   ├── exchange-rate/      # 汇率设置
│   │   ├── export/             # 导出数据
│   │   └── import/             # 导入数据
│   ├── store/                  # 状态管理
│   │   ├── index.ts            # Store 入口
│   │   ├── subscription.ts     # 订阅 Store
│   │   ├── user.ts             # 用户设置 Store
│   │   └── exchange-rate.ts    # 汇率 Store
│   ├── styles/                 # 全局样式
│   │   ├── variables.scss      # 样式变量
│   │   └── common.scss         # 公共样式
│   ├── utils/                  # 工具函数
│   │   ├── storage.ts          # 本地存储封装
│   │   ├── import-export.ts    # 导入导出工具
│   │   ├── billing.ts          # 扣款计算工具
│   │   └── currency.ts         # 货币格式化工具
│   ├── app.vue                 # 应用入口组件
│   ├── app.json                # 小程序配置
│   └── main.ts                 # Vue 应用初始化
├── miniprogram/               # 小程序编译输出目录
├── project.config.json        # 微信小程序项目配置
├── vite.config.ts             # Vite 配置
└── package.json
```

---

## 3. 数据模型设计

### 3.1 TypeScript 类型定义

```typescript
// models/subscription.ts
export interface Subscription {
  id: string;
  name: string;
  amount: number;           // 单位：分
  currency: Currency;
  billingCycle: BillingCycle;
  billingDay: number;       // 扣款日 1-31
  billingMonth?: number;    // 年付时的月份 1-12
  startDate: string;
  nextBillingDate: string;
  remark?: string;
  status: SubscriptionStatus;
  cancelledAt?: string;
  icon?: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export type Currency = 'CNY' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'HKD' | 'TWD';
export type BillingCycle = 'monthly' | 'quarterly' | 'yearly';
export type SubscriptionStatus = 'active' | 'cancelled';
```

```typescript
// models/user.ts
export interface UserSettings {
  monthlyBudget: number;      // 单位：分
  budgetCurrency: Currency;
  reminderEnabled: boolean;
  reminderDays: number;       // 提前提醒天数
  baseCurrency: Currency;     // 基准货币
}
```

```typescript
// models/exchange-rate.ts
export interface ExchangeRates {
  base: Currency;
  rates: Record<Currency, number>;
  updatedAt: string;
}
```

### 3.2 本地存储结构

```typescript
// utils/storage.ts

export const STORAGE_KEYS = {
  SUBSCRIPTIONS: 'subtrack_subscriptions',
  USER_SETTINGS: 'subtrack_user_settings',
  EXCHANGE_RATES: 'subtrack_exchange_rates',
  EXPORT_HISTORY: 'subtrack_export_history',
} as const;

// 存储操作封装
export const storage = {
  get: <T>(key: string): T | null => {
    try {
      const data = wx.getStorageSync(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  
  set: <T>(key: string, value: T): void => {
    wx.setStorageSync(key, JSON.stringify(value));
  },
  
  remove: (key: string): void => {
    wx.removeStorageSync(key);
  },
  
  clear: (): void => {
    Object.values(STORAGE_KEYS).forEach(key => {
      wx.removeStorageSync(key);
    });
  }
};
```

---

## 4. 本地存储策略

### 4.1 存储配置

| 存储项 | 存储键 | 说明 |
|--------|--------|------|
| subscriptions | subtrack_subscriptions | 订阅列表数据 |
| userSettings | subtrack_user_settings | 用户设置（预算、提醒等） |
| exchangeRates | subtrack_exchange_rates | 汇率缓存数据 |
| exportHistory | subtrack_export_history | 导出历史记录 |

### 4.2 状态持久化

使用 Wevu 或 Pinia 配合持久化插件实现状态持久化。

```typescript
// store/index.ts
import { createPinia } from 'pinia';
import { createPersistedState } from 'pinia-plugin-persistedstate';

const pinia = createPinia();

pinia.use(
  createPersistedState({
    storage: {
      getItem: (key) => wx.getStorageSync(key),
      setItem: (key, value) => wx.setStorageSync(key, value),
      removeItem: (key) => wx.removeStorageSync(key),
    },
  })
);
```

### 4.3 数据同步策略

- 所有数据变更即时写入本地存储
- 使用 Pinia store 作为内存缓存
- 页面加载时从本地存储恢复数据
- 支持手动导出备份

---

## 5. 本地数据结构

### 5.1 订阅数据结构

```typescript
// 存储在 subtrack_subscriptions 键下
interface SubscriptionStorage {
  version: string;
  data: Subscription[];
  lastUpdated: string;
}
```

### 5.2 用户设置数据结构

```typescript
// 存储在 subtrack_user_settings 键下
interface UserSettingsStorage {
  version: string;
  data: UserSettings;
  lastUpdated: string;
}
```

### 5.3 汇率数据结构

```typescript
// 存储在 subtrack_exchange_rates 键下
interface ExchangeRatesStorage {
  version: string;
  data: ExchangeRates;
  lastUpdated: string;
}
```

### 5.4 数据版本管理

- 每个存储项包含 `version` 字段用于数据迁移
- 版本升级时自动执行迁移脚本
- 保持向后兼容性

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

**用户手动输入汇率模式：**

- 用户在设置页面手动输入各货币相对于基准货币的汇率
- 支持保存多个常用汇率
- 用户可随时更新汇率值
- 无需网络请求，完全离线可用

### 6.3 汇率设置数据结构

```typescript
// models/exchange-rate.ts
export interface UserExchangeRate {
  fromCurrency: Currency;
  toCurrency: Currency;    // 通常为基准货币
  rate: number;            // 汇率值，如 7.2 表示 1 USD = 7.2 CNY
  updatedAt: string;
}

// 存储在 subtrack_user_settings 中
interface ExchangeRateSettings {
  baseCurrency: Currency;  // 基准货币
  rates: UserExchangeRate[];
}
```

### 6.4 汇率设置界面

用户可在设置页面管理汇率：

| 操作 | 说明 |
|------|------|
| 设置基准货币 | 选择统计时的基准货币 |
| 添加汇率 | 为新货币设置汇率 |
| 编辑汇率 | 修改已有货币的汇率 |
| 删除汇率 | 移除不需要的汇率 |

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

## 9. 续费提醒设计

### 9.1 提醒机制

采用本地提醒机制，无需云端服务：

| 提醒类型 | 实现方式 | 说明 |
|----------|----------|------|
| 小程序内提醒 | 页面加载时检查 | 打开小程序时显示即将续费提示 |
| 订阅消息 | 微信小程序订阅消息 | 需用户授权，通过微信服务发送 |

### 9.2 续费提醒逻辑

- 提前 1、3、7 天发送提醒
- 检查用户是否开启提醒
- 小程序内展示即将续费列表
- 调用微信小程序订阅消息 API（需用户主动触发授权）

### 9.3 提醒检查流程

```
用户打开小程序
    │
    ▼
加载本地订阅数据
    │
    ▼
计算即将续费的订阅（7天内）
    │
    ▼
首页显示提醒卡片
```

---

## 10. 本地数据导入导出

### 10.1 功能概述

支持通过 JSON 文件导入导出订阅数据，实现本地数据备份与迁移，无需依赖云端服务。

### 10.2 导出功能

#### 导出数据格式

```json
{
  "version": "1.0.0",
  "exportTime": "2026-03-19T10:30:00Z",
  "data": {
    "user": {
      "monthlyBudget": 50000,
      "budgetCurrency": "CNY",
      "reminderEnabled": true,
      "reminderDays": 3
    },
    "subscriptions": [
      {
        "id": "sub_001",
        "name": "ChatGPT Plus",
        "amount": 2000,
        "currency": "USD",
        "billingCycle": "monthly",
        "billingDay": 15,
        "startDate": "2024-01-15",
        "nextBillingDate": "2026-04-15",
        "remark": "个人使用",
        "status": "active",
        "category": "AI工具",
        "icon": "chatgpt"
      }
    ]
  }
}
```

#### 导出流程

1. 用户进入设置页面，点击"导出数据"
2. 前端收集本地存储的所有订阅数据
3. 生成符合格式的 JSON 数据
4. 调用微信小程序文件 API 保存到本地或分享

#### 导出选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| 包含已取消订阅 | 是否导出 cancelled 状态的订阅 | true |
| 包含历史记录 | 是否导出订阅变更历史 | false |

### 10.3 导入功能

#### 导入流程

1. 用户进入设置页面，点击"导入数据"
2. 选择本地 JSON 文件
3. 前端解析并验证数据格式
4. 显示数据预览（订阅数量、预算设置等）
5. 用户确认后合并或替换现有数据

#### 数据验证规则

| 验证项 | 规则 | 错误处理 |
|--------|------|----------|
| 版本兼容性 | 检查 version 字段 | 不兼容版本提示升级 |
| 必填字段 | 检查 subscription 必填字段 | 跳过无效记录，记录错误 |
| 数据类型 | 验证字段类型 | 类型转换或报错 |
| 重复数据 | 检测同名订阅 | 提示用户选择合并/跳过/替换 |

#### 导入模式

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| 完全替换 | 清空现有数据，使用导入数据 | 恢复备份 |
| 智能合并 | 保留现有数据，合并新数据 | 迁移数据 |
| 仅导入订阅 | 只导入订阅，保留用户设置 | 部分恢复 |

### 10.4 本地存储架构

#### 存储方案

使用微信小程序本地存储 API，数据完全存储在设备本地：

```typescript
// 存储键名定义
const STORAGE_KEYS = {
  SUBSCRIPTIONS: 'subtrack_subscriptions',
  USER_SETTINGS: 'subtrack_user_settings',
  EXCHANGE_RATES: 'subtrack_exchange_rates',
  EXPORT_HISTORY: 'subtrack_export_history'
};
```

#### 数据持久化

- 使用 `wx.setStorageSync` 进行同步存储
- 单条数据大小限制：1MB
- 总存储空间限制：10MB
- 定期自动备份到本地缓存

### 10.5 安全与隐私

- 导出的 JSON 文件不包含敏感信息（如 OpenID）
- 建议用户妥善保管导出文件
- 导入时进行数据完整性校验
- 支持设置导出文件密码（可选功能）

---

## 11. 性能优化策略

### 11.1 数据加载优化

- 分页加载订阅列表（虚拟列表）
- 按需加载统计数据
- 图片懒加载
- 骨架屏占位
- 预加载关键数据

### 11.2 Vue 3 性能优化

- 使用 `shallowRef` 减少响应式开销
- 使用 `computed` 缓存计算结果
- 使用 `v-memo` 优化列表渲染

### 11.3 本地存储优化

- 大数据分片存储
- 读写操作批量处理
- 定期清理过期缓存

### 11.4 小程序分包优化

| 分包 | 包含页面 |
|------|----------|
| 主包 | 首页、订阅列表、设置 |
| packageDetail | 订阅详情、订阅编辑 |
| packageStatistics | 统计页 |

