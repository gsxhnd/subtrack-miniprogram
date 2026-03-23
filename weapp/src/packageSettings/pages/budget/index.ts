interface BudgetData {
    budgetInYuan: string
    baseCurrency: string
}

Page<BudgetData, WechatMiniprogram.Page.CustomOption>({
    data: {
        budgetInYuan: '0.00',
        baseCurrency: 'CNY',
    },

    onLoad() {
        const app = getApp()
        const { settings } = app.globalData
        this.setData({
            budgetInYuan: (settings.monthlyBudget / 100).toFixed(2),
            baseCurrency: settings.baseCurrency,
        })
    },

    onBudgetInput(e: any) {
        this.setData({ budgetInYuan: e.detail.value })
    },

    onCurrencyChange(e: any) {
        const currencies = ['CNY', 'USD', 'EUR', 'GBP', 'JPY', 'HKD', 'TWD']
        this.setData({ baseCurrency: currencies[e.detail.value] })
    },

    goToExchangeRate() {
        wx.navigateTo({ url: '/packageSettings/pages/exchange-rate/index' })
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
