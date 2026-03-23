/**
 * 汇率设置页面
 */

import { eventBus, EVENTS } from '../../../store/event-bus'
import { CURRENCY_NAMES, CURRENCY_SYMBOLS, type Currency } from '../../../models'

interface ExchangeRateData {
    baseCurrency: Currency
    rates: Array<{
        fromCurrency: Currency
        toCurrency: Currency
        rate: number
        updatedAt: string
        editing?: boolean
        inputRate: string
    }>
    currencyOptions: Array<{ value: Currency; label: string }>
    showCurrencyPicker: boolean
    pickerTargetCurrency: Currency | null
}

Page<ExchangeRateData, WechatMiniprogram.Page.CustomOption>({
    data: {
        baseCurrency: 'CNY',
        rates: [],
        currencyOptions: [],
        showCurrencyPicker: false,
        pickerTargetCurrency: null,
    },

    onLoad() {
        this.refreshData()
        this.initCurrencyOptions()
    },

    onShow() {
        this.refreshData()
    },

    refreshData() {
        const app = getApp()
        const { settings, exchangeRates } = app.globalData

        // 只显示非基准货币的汇率
        const rates = exchangeRates.map((r: any) => ({
            ...r,
            editing: false,
            inputRate: r.rate.toString(),
        }))

        this.setData({
            baseCurrency: settings.baseCurrency,
            rates,
        })
    },

    initCurrencyOptions() {
        const currencies: Currency[] = ['CNY', 'USD', 'EUR', 'GBP', 'JPY', 'HKD', 'TWD']
        const options = currencies.map((c) => ({
            value: c,
            label: `${CURRENCY_NAMES[c]} (${CURRENCY_SYMBOLS[c]})`,
        }))
        this.setData({ currencyOptions: options })
    },

    // 开始编辑汇率
    startEdit(e: any) {
        const { index } = e.currentTarget.dataset
        const rates = this.data.rates.map((r, i) => ({
            ...r,
            editing: i === index,
        }))
        this.setData({ rates })
    },

    // 输入汇率
    onRateInput(e: any) {
        const { index } = e.currentTarget.dataset
        const value = e.detail.value
        const rates = [...this.data.rates]
        rates[index].inputRate = value
        this.setData({ rates })
    },

    // 保存汇率
    saveRate(e: any) {
        const { index } = e.currentTarget.dataset
        const rate = parseFloat(this.data.rates[index].inputRate)

        if (isNaN(rate) || rate <= 0) {
            wx.showToast({ title: '请输入有效汇率', icon: 'none' })
            return
        }

        const app = getApp()
        const rates = [...app.globalData.exchangeRates]
        rates[index] = {
            ...rates[index],
            rate,
            updatedAt: new Date().toISOString(),
        }

        app.globalData.exchangeRates = rates
        wx.setStorageSync('subtrack_exchange_rates', rates)
        eventBus.emit(EVENTS.SETTINGS_CHANGED, app.globalData.settings)

        // 更新本地数据
        const localRates = this.data.rates.map((r, i) => ({
            ...r,
            editing: false,
            rate: i === index ? rate : r.rate,
            updatedAt: i === index ? new Date().toISOString() : r.updatedAt,
        }))
        this.setData({ rates: localRates })

        wx.showToast({ title: '已保存', icon: 'success' })
    },

    // 取消编辑
    cancelEdit(e: any) {
        const { index } = e.currentTarget.dataset
        const rates = this.data.rates.map((r, i) => ({
            ...r,
            editing: false,
            inputRate: i === index ? r.rate.toString() : r.inputRate,
        }))
        this.setData({ rates })
    },

    // 切换基准货币
    onBaseCurrencyChange() {
        this.setData({ showCurrencyPicker: true, pickerTargetCurrency: null })
    },

    // 选择基准货币
    onCurrencySelect(e: any) {
        const { currency } = e.currentTarget.dataset
        const app = getApp()

        app.globalData.settings.baseCurrency = currency
        app.globalData.settings.budgetCurrency = currency
        wx.setStorageSync('subtrack_user_settings', app.globalData.settings)
        eventBus.emit(EVENTS.SETTINGS_CHANGED, app.globalData.settings)

        this.setData({
            baseCurrency: currency,
            showCurrencyPicker: false,
        })

        // 刷新汇率列表
        this.refreshData()
        wx.showToast({ title: '已切换基准货币', icon: 'success' })
    },

    // 关闭货币选择器
    closePicker() {
        this.setData({ showCurrencyPicker: false })
    },

    // 格式化更新时间
    formatUpdatedAt(dateStr: string): string {
        const date = new Date(dateStr)
        return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
    },
})
