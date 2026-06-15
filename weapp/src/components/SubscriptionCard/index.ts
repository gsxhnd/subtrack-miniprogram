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

            var currencySymbols: Record<string, string> = {
                CNY: '¥',
                USD: '$',
                EUR: '€',
                GBP: '£',
                JPY: '¥',
                HKD: 'HK$',
                TWD: 'NT$',
            }

            var cycleNames: Record<string, string> = {
                monthly: '每月',
                quarterly: '每季度',
                yearly: '每年',
            }

            var amount = sub.amount / 100
            var symbol = currencySymbols[sub.currency] || '¥'
            var amountDisplay = symbol + amount.toFixed(2)
            var billingRule = sub.billingRule || {}
            var cycleDisplay = cycleNames[billingRule.cycle] || '每月'

            // 计算距离下次扣款的天数
            var now = new Date()
            var nextDate = new Date(sub.nextBillingDate)
            var diff = nextDate.getTime() - now.getTime()
            var daysUntil = Math.ceil(diff / (1000 * 60 * 60 * 24))

            var nextBillingDisplay = ''
            if (daysUntil <= 0) {
                nextBillingDisplay = '今天扣款'
            } else if (daysUntil === 1) {
                nextBillingDisplay = '明天扣款'
            } else if (daysUntil <= 7) {
                nextBillingDisplay = daysUntil + '天后扣款'
            } else {
                nextBillingDisplay = sub.nextBillingDate
            }

            var statusDisplay = sub.status === 'cancelled' ? '已取消' : ''
            var categoryDisplay = sub.category || ''
            var hasCategory = !!sub.category

            this.setData({
                currencySymbol: symbol,
                amountDisplay: amountDisplay,
                cycleDisplay: cycleDisplay,
                daysUntil: daysUntil,
                nextBillingDisplay: nextBillingDisplay,
                statusDisplay: statusDisplay,
                categoryDisplay: categoryDisplay,
                hasCategory: hasCategory,
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
