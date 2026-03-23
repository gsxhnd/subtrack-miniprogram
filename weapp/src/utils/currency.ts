/**
 * 货币格式化工具
 */

import {
  type Currency,
  type UserExchangeRate,
  CURRENCY_SYMBOLS,
  CURRENCY_NAMES,
} from '@/models'

/**
 * 格式化金额显示
 * @param amount 金额（单位：分）
 * @param currency 货币类型
 * @param showSymbol 是否显示货币符号
 */
export function formatAmount(
  amount: number,
  currency: Currency,
  showSymbol = true,
): string {
  const value = amount / 100 // 转换为元
  const formatted = value.toFixed(2)

  if (showSymbol) {
    return `${CURRENCY_SYMBOLS[currency]}${formatted}`
  }

  return formatted
}

/**
 * 格式化金额显示（带货币名称）
 */
export function formatAmountWithName(
  amount: number,
  currency: Currency,
): string {
  const value = amount / 100
  return `${value.toFixed(2)} ${CURRENCY_NAMES[currency]}`
}

/**
 * 获取货币符号
 */
export function getCurrencySymbol(currency: Currency): string {
  return CURRENCY_SYMBOLS[currency]
}

/**
 * 获取货币名称
 */
export function getCurrencyName(currency: Currency): string {
  return CURRENCY_NAMES[currency]
}

/**
 * 货币转换
 * @param amount 金额（单位：分）
 * @param fromCurrency 源货币
 * @param toCurrency 目标货币
 * @param rates 汇率列表
 */
export function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  rates: UserExchangeRate[],
): number {
  // 相同货币无需转换
  if (fromCurrency === toCurrency) {
    return amount
  }

  // 查找汇率
  const rate = rates.find(
    (r) => r.fromCurrency === fromCurrency && r.toCurrency === toCurrency,
  )

  if (!rate) {
    console.warn(`[currency] No exchange rate found for ${fromCurrency} -> ${toCurrency}`)
    return amount
  }

  return Math.round(amount * rate.rate)
}

/**
 * 转换为基准货币
 */
export function convertToBaseCurrency(
  amount: number,
  fromCurrency: Currency,
  baseCurrency: Currency,
  rates: UserExchangeRate[],
): number {
  return convertCurrency(amount, fromCurrency, baseCurrency, rates)
}

/**
 * 计算总金额（转换为基准货币）
 */
export function calculateTotalInBaseCurrency(
  items: Array<{ amount: number; currency: Currency }>,
  baseCurrency: Currency,
  rates: UserExchangeRate[],
): number {
  return items.reduce((total, item) => {
    const converted = convertToBaseCurrency(
      item.amount,
      item.currency,
      baseCurrency,
      rates,
    )
    return total + converted
  }, 0)
}

/**
 * 所有支持的货币列表
 */
export const SUPPORTED_CURRENCIES: Currency[] = [
  'CNY',
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'HKD',
  'TWD',
]

/**
 * 货币选项（用于选择器）
 */
export const CURRENCY_OPTIONS = SUPPORTED_CURRENCIES.map((currency) => ({
  value: currency,
  label: `${CURRENCY_NAMES[currency]} (${CURRENCY_SYMBOLS[currency]})`,
}))
