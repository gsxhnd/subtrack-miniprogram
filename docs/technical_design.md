# SubTrack 技术设计文档

## 1. 技术架构

### 1.1 技术栈选型

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 前端框架 | Taro 3.x + Vue 3 | 多端统一框架，使用 Vue 3 Composition API |
| UI组件库 | NutUI 4.x | 京东风格的 Vue3 组件库，支持 Taro |
| 状态管理 | Pinia | Vue 3 官方推荐的状态管理库 |
| 数据存储 | 微信小程序本地存储 | 数据完全存储在本地，无需云端服务 |
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
- 本地存储 API 各平台兼容

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
│  │          │  (状态管理 + 持久化) │               │   │
│  │          └──────────┬──────────┘               │   │
│  │                     │                          │   │
│  │          ┌──────────▼──────────┐               │   │
│  │          │  本地存储 API       │               │   │
│  │          │  (Taro.setStorage)  │               │   │
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

```
miniprogram/
├── config/                     # Taro 配置文件
├── src/
│   ├── api/                    # 外部 API 封装（汇率等）
│   ├── assets/                 # 静态资源
│   ├── components/             # 公共组件
│   ├── composables/            # 组合式函数 (Vue 3 Hooks)
│   ├── models/                 # 数据模型/类型定义
│   ├── pages/                  # 页面
│   ├── store/                  # Pinia 状态管理
│   ├── styles/                 # 全局样式
│   ├── utils/                  # 工具函数
│   │   ├── storage.ts          # 本地存储封装
│   │   ├── import-export.ts    # 导入导出工具
│   │   └── billing.ts          # 扣款计算工具
│   ├── app.config.ts           # Taro 应用配置
│   ├── app.vue                 # 应用入口组件
│   └── main.ts                 # Vue 应用初始化
├── types/                      # 全局类型声明
├── project.config.json         # 微信小程序配置
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
import Taro from '@tarojs/taro';

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
      const data = Taro.getStorageSync(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  
  set: <T>(key: string, value: T): void => {
    Taro.setStorageSync(key, JSON.stringify(value));
  },
  
  remove: (key: string): void => {
    Taro.removeStorageSync(key);
  },
  
  clear: (): void => {
    Object.values(STORAGE_KEYS).forEach(key => {
      Taro.removeStorageSync(key);
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

### 4.2 Pinia 持久化

使用 `pinia-plugin-persistedstate` 实现状态持久化，支持 Taro 存储 API。

```typescript
// store/index.ts
import { createPinia } from 'pinia';
import { createPersistedState } from 'pinia-plugin-persistedstate';
import Taro from '@tarojs/taro';

const pinia = createPinia();

pinia.use(
  createPersistedState({
    storage: {
      getItem: (key) => Taro.getStorageSync(key),
      setItem: (key, value) => Taro.setStorageSync(key, value),
      removeItem: (key) => Taro.removeStorageSync(key),
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

