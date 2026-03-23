/**
 * 用户设置模型定义
 */

import type { Currency } from './subscription'

// 用户设置
export interface UserSettings {
  monthlyBudget: number // 月度预算，单位：分
  budgetCurrency: Currency
  reminderEnabled: boolean
  reminderDays: number // 提前提醒天数 1-7
  baseCurrency: Currency // 基准货币（用于统计和显示）
}

// 默认用户设置
export const DEFAULT_USER_SETTINGS: UserSettings = {
  monthlyBudget: 0,
  budgetCurrency: 'CNY',
  reminderEnabled: true,
  reminderDays: 3,
  baseCurrency: 'CNY',
}
