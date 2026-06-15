import { getIconAsync } from '../../../utils/icons'

interface BudgetData {
    budgetInYuan: string
    baseCurrency: string
    iconExchangeRate: string
    iconTip: string
    iconChevronRight: string
    iconChevronDown: string
}

Page<BudgetData, WechatMiniprogram.Page.CustomOption>({
    data: {
        budgetInYuan: '0.00',
        baseCurrency: 'CNY',
        iconExchangeRate: '',
        iconTip: '',
        iconChevronRight: '',
        iconChevronDown: '',
    },

    onLoad() {
        const app = getApp()
        const { settings } = app.globalData
        this.setData({
            budgetInYuan: (settings.monthlyBudget / 100).toFixed(2),
            baseCurrency: settings.baseCurrency,
        })
        this.initIcons()
    },

    async initIcons() {
        const [iconExchangeRate, iconTip, iconChevronRight, iconChevronDown] =
            await Promise.all([
                getIconAsync('arrowLeftRight', { color: '#64748b', size: 24 }),
                getIconAsync('lightbulb', { color: '#d97706', size: 22 }),
                getIconAsync('chevronRight', { color: '#94a3b8', size: 22 }),
                getIconAsync('chevronDown', { color: '#94a3b8', size: 18 }),
            ])
        this.setData({ iconExchangeRate, iconTip, iconChevronRight, iconChevronDown })
    },

    onBudgetInput(e: any) {
        this.setData({ budgetInYuan: e.detail.value })
    },

    onCurrencyChange(e: any) {
        const currencies = ['CNY', 'USD', 'EUR', 'GBP', 'JPY', 'HKD', 'TWD']
        this.setData({ baseCurrency: currencies[e.detail.value] })
    },

    goToExchangeRate() {
        wx.navigateTo({ url: '/pages/settings/exchange-rate/index' })
    },

    handleSave() {
        const app = getApp()
        const budget = Math.round(parseFloat(this.data.budgetInYuan || '0') * 100)
        app.store.updateBudget(budget)
        app.store.updateBaseCurrency(this.data.baseCurrency)
        wx.showToast({ title: '已保存', icon: 'success' })
        wx.navigateBack()
    },
})
