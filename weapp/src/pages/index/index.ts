import { eventBus, EVENTS } from '../../store/event-bus'
import { calculateMonthlyAmount } from '../../utils/billing'
import { convertCurrency } from '../../utils/currency'

interface IndexData {
  monthlySpending: number
  monthlyBudget: number
  budgetProgress: number
  budgetStatus: 'normal' | 'warning' | 'exceeded'
  baseCurrency: string
  upcomingRenewals: any[]
  activeCount: number
  hasBudget: boolean
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

    this.setData({
      monthlySpending,
      monthlyBudget,
      budgetProgress,
      budgetStatus,
      baseCurrency: settings.baseCurrency,
      upcomingRenewals,
      activeCount: activeSubscriptions.length,
      hasBudget: monthlyBudget > 0,
    })
  },

  goToBudgetSettings() {
    wx.navigateTo({ url: '/packageSettings/pages/budget/index' })
  },

  goToSubscriptionList() {
    wx.navigateTo({ url: '/pages/subscription/index' })
  },

  goToAddSubscription() {
    wx.navigateTo({ url: '/packageSubscription/pages/edit/index' })
  },

  goToSubscriptionDetail(e: any) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/packageSubscription/pages/detail/index?id=${id}` })
  },
})
