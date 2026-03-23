import { eventBus, EVENTS } from '../../store/event-bus'
import { calculateMonthlyAmount, getDaysUntilBilling } from '../../utils/billing'
import { convertCurrency, type Currency } from '../../utils/currency'
import { CURRENCY_NAMES, CURRENCY_SYMBOLS } from '../../models'

type SortType = 'date' | 'amount' | 'name'
type SortOrder = 'asc' | 'desc'

interface SubscriptionData {
    subscriptions: any[]
    activeSubscriptions: any[]
    cancelledSubscriptions: any[]
    currentTab: 'active' | 'cancelled'
    sortType: SortType
    sortOrder: SortOrder
    showSortPicker: boolean
    showFilterPicker: boolean
    filterCurrency: Currency | 'all'
    filterCategory: string | 'all'
    categories: string[]
    currencyOptions: Array<{ value: string; label: string }>
}

Page<SubscriptionData, WechatMiniprogram.Page.CustomOption>({
    data: {
        subscriptions: [],
        activeSubscriptions: [],
        cancelledSubscriptions: [],
        currentTab: 'active',
        sortType: 'date',
        sortOrder: 'asc',
        showSortPicker: false,
        showFilterPicker: false,
        filterCurrency: 'all',
        filterCategory: 'all',
        categories: [],
        currencyOptions: [],
    },

    onLoad() {
        this.refreshData()
        eventBus.on(EVENTS.SUBSCRIPTION_CHANGED, this.refreshData.bind(this))
        this.initCurrencyOptions()
    },

    onUnload() {
        eventBus.off(EVENTS.SUBSCRIPTION_CHANGED, this.refreshData.bind(this))
    },

    onShow() {
        this.refreshData()
    },

    initCurrencyOptions() {
        const currencies: Currency[] = ['CNY', 'USD', 'EUR', 'GBP', 'JPY', 'HKD', 'TWD']
        const options = [
            { value: 'all', label: '全部货币' },
            ...currencies.map((c) => ({
                value: c,
                label: `${CURRENCY_NAMES[c]} (${CURRENCY_SYMBOLS[c]})`,
            })),
        ]
        this.setData({ currencyOptions: options })
    },

    refreshData() {
        const app = getApp()
        const { subscriptions, settings, exchangeRates } = app.globalData

        // 获取所有分类
        const categories = [...new Set(
            subscriptions
                .filter((s: any) => s.category)
                .map((s: any) => s.category)
        )] as string[]

        // 筛选和排序
        const activeSubscriptions = this.filterAndSort(
            subscriptions.filter((s: any) => s.status === 'active'),
            settings.baseCurrency,
            exchangeRates,
        )

        const cancelledSubscriptions = subscriptions.filter((s: any) => s.status === 'cancelled')

        this.setData({
            subscriptions,
            activeSubscriptions,
            cancelledSubscriptions,
            categories,
        })
    },

    filterAndSort(
        list: any[],
        baseCurrency: Currency,
        exchangeRates: any[],
    ): any[] {
        let result = [...list]

        // 货币筛选
        if (this.data.filterCurrency !== 'all') {
            result = result.filter((s) => s.currency === this.data.filterCurrency)
        }

        // 分类筛选
        if (this.data.filterCategory !== 'all') {
            result = result.filter((s) => s.category === this.data.filterCategory)
        }

        // 排序
        result.sort((a, b) => {
            let comparison = 0

            switch (this.data.sortType) {
                case 'date': {
                    const daysA = getDaysUntilBilling(a.nextBillingDate)
                    const daysB = getDaysUntilBilling(b.nextBillingDate)
                    comparison = daysA - daysB
                    break
                }
                case 'amount': {
                    const amountA = convertCurrency(
                        calculateMonthlyAmount(a),
                        a.currency,
                        baseCurrency,
                        exchangeRates,
                    )
                    const amountB = convertCurrency(
                        calculateMonthlyAmount(b),
                        b.currency,
                        baseCurrency,
                        exchangeRates,
                    )
                    comparison = amountA - amountB
                    break
                }
                case 'name':
                    comparison = a.name.localeCompare(b.name, 'zh-CN')
                    break
            }

            return this.data.sortOrder === 'asc' ? comparison : -comparison
        })

        return result
    },

    switchTab(e: any) {
        const { tab } = e.currentTarget.dataset
        this.setData({ currentTab: tab })
    },

    showSortOptions() {
        this.setData({ showSortPicker: true })
    },

    showFilterOptions() {
        this.setData({ showFilterPicker: true })
    },

    closeSortPicker() {
        this.setData({ showSortPicker: false })
    },

    closeFilterPicker() {
        this.setData({ showFilterPicker: false })
    },

    onSortTypeChange(e: any) {
        const { type } = e.currentTarget.dataset
        if (this.data.sortType === type) {
            // 切换排序方向
            this.setData({
                sortOrder: this.data.sortOrder === 'asc' ? 'desc' : 'asc',
            })
        } else {
            this.setData({ sortType: type, sortOrder: 'asc' })
        }
        this.refreshData()
    },

    onFilterCurrencyChange(e: any) {
        const { currency } = e.currentTarget.dataset
        this.setData({ filterCurrency: currency })
        this.refreshData()
    },

    onFilterCategoryChange(e: any) {
        const { category } = e.currentTarget.dataset
        this.setData({ filterCategory: category })
        this.refreshData()
    },

    resetFilter() {
        this.setData({
            filterCurrency: 'all',
            filterCategory: 'all',
        })
        this.refreshData()
    },

    goToAdd() {
        wx.navigateTo({ url: '/packageSubscription/pages/edit/index' })
    },

    goToDetail(e: any) {
        const { id } = e.detail
        wx.navigateTo({ url: `/packageSubscription/pages/detail/index?id=${id}` })
    },

    goToEdit(e: any) {
        const { id } = e.detail
        wx.navigateTo({ url: `/packageSubscription/pages/edit/index?id=${id}` })
    },
})
