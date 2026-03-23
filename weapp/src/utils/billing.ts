/**
 * 扣款日期计算工具
 */

import type { BillingRule, BillingCycle, Subscription } from '@/models'

/**
 * 获取指定月份的天数
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/**
 * 计算下次扣款日期
 */
export function calculateNextBillingDate(
  rule: BillingRule,
  startDate?: string,
): string {
  const now = new Date()
  const start = startDate ? new Date(startDate) : now

  switch (rule.cycle) {
    case 'monthly': {
      // 月付：下个月同一日期
      const next = new Date(now)
      next.setMonth(next.getMonth() + 1)
      // 处理日期溢出（如 31 日在 2 月不存在）
      const maxDay = getDaysInMonth(next.getFullYear(), next.getMonth() + 1)
      next.setDate(Math.min(rule.day, maxDay))
      return formatDate(next)
    }
    case 'quarterly': {
      // 季付：3 个月后
      const next = new Date(now)
      next.setMonth(next.getMonth() + 3)
      const maxDay = getDaysInMonth(next.getFullYear(), next.getMonth() + 1)
      next.setDate(Math.min(rule.day, maxDay))
      return formatDate(next)
    }
    case 'yearly': {
      // 年付：下一年指定月份和日期
      const next = new Date(now)
      next.setFullYear(next.getFullYear() + 1)
      next.setMonth(rule.month! - 1) // month 是 1-12，需要转换为 0-11
      const maxDay = getDaysInMonth(next.getFullYear(), next.getMonth() + 1)
      next.setDate(Math.min(rule.day, maxDay))
      return formatDate(next)
    }
  }
}

/**
 * 计算月均费用（单位：分）
 */
export function calculateMonthlyAmount(subscription: Subscription): number {
  const { amount, billingRule } = subscription

  switch (billingRule.cycle) {
    case 'monthly':
      return amount
    case 'quarterly':
      return Math.round(amount / 3)
    case 'yearly':
      return Math.round(amount / 12)
  }
}

/**
 * 计算本月应扣款金额（单位：分）
 */
export function calculateThisMonthBilling(subscription: Subscription): number {
  const { amount, billingRule, nextBillingDate } = subscription
  const now = new Date()
  const nextBilling = new Date(nextBillingDate)

  // 检查本月是否有扣款
  const isThisMonth =
    nextBilling.getFullYear() === now.getFullYear() &&
    nextBilling.getMonth() === now.getMonth()

  if (!isThisMonth) {
    return 0
  }

  return amount
}

/**
 * 获取本月所有扣款
 */
export function getThisMonthBillings(subscriptions: Subscription[]): Array<{
  subscription: Subscription
  amount: number
  date: string
}> {
  const now = new Date()
  const result: Array<{
    subscription: Subscription
    amount: number
    date: string
  }> = []

  for (const sub of subscriptions) {
    if (sub.status !== 'active') continue

    const billing = calculateThisMonthBilling(sub)
    if (billing > 0) {
      result.push({
        subscription: sub,
        amount: billing,
        date: sub.nextBillingDate,
      })
    }
  }

  // 按日期排序
  return result.sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 解析日期字符串
 */
export function parseDate(dateStr: string): Date {
  return new Date(dateStr)
}

/**
 * 获取距离下次扣款的天数
 */
export function getDaysUntilBilling(nextBillingDate: string): number {
  const now = new Date()
  const next = new Date(nextBillingDate)
  const diff = next.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * 判断是否即将续费（默认 7 天内）
 */
export function isUpcomingRenewal(
  subscription: Subscription,
  days = 7,
): boolean {
  if (subscription.status !== 'active') return false

  const daysUntil = getDaysUntilBilling(subscription.nextBillingDate)
  return daysUntil > 0 && daysUntil <= days
}

/**
 * 获取即将续费的订阅列表
 */
export function getUpcomingRenewals(
  subscriptions: Subscription[],
  days = 7,
): Subscription[] {
  return subscriptions
    .filter((s) => isUpcomingRenewal(s, days))
    .sort(
      (a, b) =>
        new Date(a.nextBillingDate).getTime() -
        new Date(b.nextBillingDate).getTime(),
    )
}
