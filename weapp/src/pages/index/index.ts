import { eventBus, EVENTS } from '../../store/event-bus'
import { calculateMonthlyAmount, calculateYearlyAmount } from '../../utils/billing'
import { convertCurrency, formatAmount } from '../../utils/currency'

interface IndexData {
  monthlySpending: number
  monthlyBudget: number
  budgetProgress: number
  budgetStatus: 'normal' | 'warning' | 'exceeded'
  baseCurrency: string
  upcomingRenewals: any[]
  activeCount: number
  hasBudget: boolean
  yearlySpending: number
  yearlySpendingDisplay: string
  monthlySpendingDisplay: string
  currencySymbol: string
}

Page<IndexData, WechatMiniprogram.Page.CustomOption>({
  data: {
    monthlySpending: 0,
    monthlyBudget: 0,
    budgetProgress: 0,
    budgetStatus: 'normal',
    baseCurrency: 'CNY',
    upcomingRenewals: [],
    activeCount: 0,
    hasBudget: false,
    yearlySpending: 0,
    yearlySpendingDisplay: '0.00',
    monthlySpendingDisplay: '0.00',
    currencySymbol: '¥',
  },

  onLoad() {
    this.refreshData()
    eventBus.on(EVENTS.SUBSCRIPTION_CHANGED, this.refreshData.bind(this))
    eventBus.on(EVENTS.SETTINGS_CHANGED, this.refreshData.bind(this))
  },

  onUnload() {
    eventBus.off(EVENTS.SUBSCRIPTION_CHANGED, this.refreshData.bind(this))
    eventBus.off(EVENTS.SETTINGS_CHANGED, this.refreshData.bind(this))
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
    this.refreshData()
  },

  refreshData() {
    const app = getApp()
    const { subscriptions, settings, exchangeRates } = app.globalData

    // 计算本月支出
    const activeSubscriptions = subscriptions.filter((s: any) => s.status === 'active')
    const monthlySpending = activeSubscriptions.reduce((total: number, sub: any) => {
      const monthlyAmount = calculateMonthlyAmount(sub)
      const converted = convertCurrency(
        monthlyAmount,
        sub.currency,
        settings.baseCurrency,
        exchangeRates,
      )
      return total + converted
    }, 0)

    // 计算年度支出
    const yearlySpending = activeSubscriptions.reduce((total: number, sub: any) => {
      const yearlyAmount = calculateYearlyAmount(sub)
      const converted = convertCurrency(
        yearlyAmount,
        sub.currency,
        settings.baseCurrency,
        exchangeRates,
      )
      return total + converted
    }, 0)

    // 计算预算进度
    const monthlyBudget = settings.monthlyBudget
    const budgetProgress = monthlyBudget > 0 ? Math.round((monthlySpending / monthlyBudget) * 100) : 0

    // 预算状态
    let budgetStatus: 'normal' | 'warning' | 'exceeded' = 'normal'
    if (budgetProgress >= 100) {
      budgetStatus = 'exceeded'
    } else if (budgetProgress >= 80) {
      budgetStatus = 'warning'
    }

    // 获取即将续费列表（7天内）
    const now = new Date()
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const upcomingRenewals = activeSubscriptions
      .filter((s: any) => {
        const nextDate = new Date(s.nextBillingDate)
        return nextDate >= now && nextDate <= sevenDaysLater
      })
      .sort((a: any, b: any) =>
        new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime(),
      )

    // 货币符号
    const currencySymbols: Record<string, string> = {
      CNY: '¥',
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      HKD: 'HK$',
      TWD: 'NT$',
    }

    this.setData({
      monthlySpending,
      monthlyBudget,
      budgetProgress,
      budgetStatus,
      baseCurrency: settings.baseCurrency,
      upcomingRenewals,
      activeCount: activeSubscriptions.length,
      hasBudget: monthlyBudget > 0,
      yearlySpending,
      yearlySpendingDisplay: (yearlySpending / 100).toFixed(2),
      monthlySpendingDisplay: (monthlySpending / 100).toFixed(2),
      currencySymbol: currencySymbols[settings.baseCurrency] || '¥',
    })
  },

  goToBudgetSettings() {
    wx.navigateTo({ url: '/packageSettings/pages/budget/index' })
  },

  goToSubscriptionList() {
    wx.switchTab({ url: '/pages/subscription/index' })
  },

  goToSubscriptionDetail(e: any) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/packageSubscription/pages/detail/index?id=${id}` })
  },

  goToStatistics() {
    wx.switchTab({ url: '/pages/statistics/index' })
  },
})
