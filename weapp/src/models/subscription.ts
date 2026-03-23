/**
 * 订阅数据模型定义
 */

// 订阅 ID 类型
export type SubscriptionId = string

// 支持的货币类型
export type Currency = 'CNY' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'HKD' | 'TWD'

// 计费周期
export type BillingCycle = 'monthly' | 'quarterly' | 'yearly'

// 订阅状态
export type SubscriptionStatus = 'active' | 'cancelled'

// 扣款日期规则
export interface BillingRule {
  cycle: BillingCycle
  day: number // 扣款日 1-31
  month?: number // 年付时的月份 1-12
}

// 订阅实体
export interface Subscription {
  id: SubscriptionId
  name: string
  amount: number // 单位：分（避免浮点数精度问题）
  currency: Currency
  billingRule: BillingRule
  startDate: string // ISO 日期字符串
  nextBillingDate: string // 下次扣款日期
  remark?: string
  status: SubscriptionStatus
  cancelledAt?: string
  icon?: string
  category?: string
  createdAt: string
  updatedAt: string
}

// 创建订阅请求
export interface CreateSubscriptionInput {
  name: string
  amount: number
  currency: Currency
  billingRule: BillingRule
  startDate?: string
  remark?: string
  icon?: string
  category?: string
}

// 更新订阅请求
export interface UpdateSubscriptionInput extends Partial<CreateSubscriptionInput> {
  id: SubscriptionId
}

// 货币符号映射
export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  CNY: '¥',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  HKD: 'HK$',
  TWD: 'NT$',
}

// 货币名称映射
export const CURRENCY_NAMES: Record<Currency, string> = {
  CNY: '人民币',
  USD: '美元',
  EUR: '欧元',
  GBP: '英镑',
  JPY: '日元',
  HKD: '港币',
  TWD: '新台币',
}

// 计费周期名称映射
export const BILLING_CYCLE_NAMES: Record<BillingCycle, string> = {
  monthly: '每月',
  quarterly: '每季度',
  yearly: '每年',
}
