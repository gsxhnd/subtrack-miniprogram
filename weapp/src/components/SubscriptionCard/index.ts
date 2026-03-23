Component({
    properties: {
        subscription: {
            type: Object,
            value: {},
        },
        showStatus: {
            type: Boolean,
            value: false,
        },
    },

    data: {
        currencySymbol: '¥',
        amountDisplay: '',
        cycleDisplay: '',
        daysUntil: 0,
        nextBillingDisplay: '',
        statusDisplay: '',
        categoryDisplay: '',
        hasCategory: false,
    },

    observers: {
        subscription: function (sub: any) {
            if (!sub || !sub.name) return

            const currencySymbols: Record<string, string> = {
                CNY: '¥',
                USD: '$',
                EUR: '€',
                GBP: '£',
                JPY: '¥',
                HKD: 'HK$',
                TWD: 'NT$',
            }

            const cycleNames: Record<string, string> = {
                monthly: '每月',
                quarterly: '每季度',
                yearly: '每年',
            }

            const amount = sub.amount / 100
            const symbol = currencySymbols[sub.currency] || '¥'
            const amountDisplay = `${symbol}${amount.toFixed(2)}`
            const cycleDisplay = cycleNames[sub.billingRule?.cycle] || '每月'

            // 计算距离下次扣款的天数
            const now = new Date()
            const nextDate = new Date(sub.nextBillingDate)
            const diff = nextDate.getTime() - now.getTime()
            const daysUntil = Math.ceil(diff / (1000 * 60 * 60 * 24))

            let nextBillingDisplay = ''
            if (daysUntil <= 0) {
                nextBillingDisplay = '今天扣款'
            } else if (daysUntil === 1) {
                nextBillingDisplay = '明天扣款'
            } else if (daysUntil <= 7) {
                nextBillingDisplay = `${daysUntil}天后扣款`
            } else {
                nextBillingDisplay = sub.nextBillingDate
            }

            const statusDisplay = sub.status === 'cancelled' ? '已取消' : ''
            const categoryDisplay = sub.category || ''
            const hasCategory = !!sub.category

            this.setData({
                currencySymbol: symbol,
                amountDisplay,
                cycleDisplay,
                daysUntil,
                nextBillingDisplay,
                statusDisplay,
                categoryDisplay,
                hasCategory,
            })
        },
    },

    methods: {
        handleTap() {
            this.triggerEvent('tap', { id: this.properties.subscription.id })
        },

        handleEdit(e: any) {
            e.stopPropagation()
            this.triggerEvent('edit', { id: this.properties.subscription.id })
        },
    },
})
