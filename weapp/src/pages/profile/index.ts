import { eventBus, EVENTS } from '../../store/event-bus'
import { calculateMonthlyAmount, calculateYearlyAmount } from '../../utils/billing'
import { convertCurrency } from '../../utils/currency'

interface ProfileData {
    activeCount: number
    cancelledCount: number
    monthlySpendingDisplay: string
    yearlySpendingDisplay: string
    currencySymbol: string
    budgetDisplay: string
    reminderEnabled: boolean
    reminderDays: number
    appVersion: string
}

Page<ProfileData, WechatMiniprogram.Page.CustomOption>({
    data: {
        activeCount: 0,
        cancelledCount: 0,
        monthlySpendingDisplay: '0.00',
        yearlySpendingDisplay: '0.00',
        currencySymbol: '¥',
        budgetDisplay: '未设置',
        reminderEnabled: true,
        reminderDays: 3,
        appVersion: '1.0.0',
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
            this.getTabBar().setData({ selected: 3 })
        }
        this.refreshData()
    },

    refreshData() {
        const app = getApp()
        const { subscriptions, settings, exchangeRates } = app.globalData

        const activeSubscriptions = subscriptions.filter((s: any) => s.status === 'active')
        const cancelledSubscriptions = subscriptions.filter((s: any) => s.status === 'cancelled')

        // 计算月度和年度支出
        let monthlySpending = 0
        let yearlySpending = 0

        for (const sub of activeSubscriptions) {
            const monthly = calculateMonthlyAmount(sub)
            const yearly = calculateYearlyAmount(sub)
            monthlySpending += convertCurrency(monthly, sub.currency, settings.baseCurrency, exchangeRates)
            yearlySpending += convertCurrency(yearly, sub.currency, settings.baseCurrency, exchangeRates)
        }

        // 货币符号
        const currencySymbols: Record<string, string> = {
            CNY: '¥', USD: '$', EUR: '€', GBP: '£', JPY: '¥', HKD: 'HK$', TWD: 'NT$',
        }

        // 预算显示
        const budget = settings.monthlyBudget
        const budgetDisplay = budget > 0
            ? `${currencySymbols[settings.baseCurrency] || '¥'}${(budget / 100).toFixed(2)}`
            : '未设置'

        this.setData({
            activeCount: activeSubscriptions.length,
            cancelledCount: cancelledSubscriptions.length,
            monthlySpendingDisplay: (monthlySpending / 100).toFixed(2),
            yearlySpendingDisplay: (yearlySpending / 100).toFixed(2),
            currencySymbol: currencySymbols[settings.baseCurrency] || '¥',
            budgetDisplay,
            reminderEnabled: settings.reminderEnabled !== false,
            reminderDays: settings.reminderDays || 3,
        })
    },

    goToBudgetSettings() {
        wx.navigateTo({ url: '/packageSettings/pages/budget/index' })
    },

    goToExchangeRate() {
        wx.navigateTo({ url: '/packageSettings/pages/exchange-rate/index' })
    },

    handleExportData() {
        const app = getApp()
        const { subscriptions, settings, exchangeRates } = app.globalData

        const exportData = JSON.stringify({
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            subscriptions,
            settings,
            exchangeRates,
        }, null, 2)

        wx.setClipboardData({
            data: exportData,
            success() {
                wx.showToast({ title: '数据已复制到剪贴板', icon: 'success' })
            },
        })
    },

    handleClearData() {
        wx.showModal({
            title: '清除所有数据',
            content: '此操作将清空所有订阅和设置数据，且无法恢复。确定继续吗？',
            confirmColor: '#ef4444',
            success(res) {
                if (res.confirm) {
                    const app = getApp()
                    app.store.clearAllData()
                    wx.showToast({ title: '数据已清除', icon: 'success' })
                }
            },
        })
    },

    handleFeedback() {
        wx.showToast({ title: '感谢您的反馈', icon: 'none' })
    },
})
