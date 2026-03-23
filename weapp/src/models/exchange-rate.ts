/**
 * 汇率模型定义
 */

import type { Currency } from './subscription'

// 用户自定义汇率
export interface UserExchangeRate {
  fromCurrency: Currency
  toCurrency: Currency
  rate: number // 汇率值，如 7.2 表示 1 USD = 7.2 CNY
  updatedAt: string
}

// 汇率设置
export interface ExchangeRateSettings {
  baseCurrency: Currency
  rates: UserExchangeRate[]
}

// 默认汇率（仅供参考，用户可自定义）
export const DEFAULT_EXCHANGE_RATES: UserExchangeRate[] = [
  { fromCurrency: 'USD', toCurrency: 'CNY', rate: 7.2, updatedAt: new Date().toISOString() },
  { fromCurrency: 'EUR', toCurrency: 'CNY', rate: 7.8, updatedAt: new Date().toISOString() },
  { fromCurrency: 'GBP', toCurrency: 'CNY', rate: 9.0, updatedAt: new Date().toISOString() },
  { fromCurrency: 'JPY', toCurrency: 'CNY', rate: 0.048, updatedAt: new Date().toISOString() },
  { fromCurrency: 'HKD', toCurrency: 'CNY', rate: 0.92, updatedAt: new Date().toISOString() },
  { fromCurrency: 'TWD', toCurrency: 'CNY', rate: 0.22, updatedAt: new Date().toISOString() },
]
