Component({
    properties: {
        spent: {
            type: Number,
            value: 0,
        },
        budget: {
            type: Number,
            value: 0,
        },
        progress: {
            type: Number,
            value: 0,
        },
        status: {
            type: String,
            value: 'normal',
        },
        currency: {
            type: String,
            value: 'CNY',
        },
    },

    data: {
        currencySymbol: '¥',
        spentInYuan: '0.00',
        budgetInYuan: '0.00',
        statusText: '预算正常',
        statusColor: '#10b981',
        progressWidth: 0,
        warningMessage: '',
        showWarning: false,
        overAmount: '0.00',
    },

    observers: {
        'spent, budget, progress, status, currency': function (
            spent: number,
            budget: number,
            progress: number,
            status: string,
            currency: string,
        ) {
            const currencySymbols: Record<string, string> = {
                CNY: '¥',
                USD: '$',
                EUR: '€',
                GBP: '£',
                JPY: '¥',
                HKD: 'HK$',
                TWD: 'NT$',
            }

            const statusTexts: Record<string, string> = {
                normal: '预算正常',
                warning: '预算紧张',
                exceeded: '已超支',
            }

            const statusColors: Record<string, string> = {
                normal: '#10b981',
                warning: '#f59e0b',
                exceeded: '#ef4444',
            }

            // 计算超支金额
            const overAmount = spent > budget ? ((spent - budget) / 100).toFixed(2) : '0.00'

            // 生成警告消息
            let warningMessage = ''
            let showWarning = false
            if (status === 'exceeded') {
                warningMessage = `已超支 ${currencySymbols[currency] || '¥'}${overAmount}，建议调整订阅`
                showWarning = true
            } else if (status === 'warning') {
                const remaining = ((budget - spent) / 100).toFixed(2)
                warningMessage = `剩余预算 ${currencySymbols[currency] || '¥'}${remaining}`
                showWarning = true
            }

            this.setData({
                currencySymbol: currencySymbols[currency] || '¥',
                spentInYuan: (spent / 100).toFixed(2),
                budgetInYuan: (budget / 100).toFixed(2),
                statusText: statusTexts[status] || '预算正常',
                statusColor: statusColors[status] || '#10b981',
                progressWidth: Math.min(progress, 100),
                warningMessage,
                showWarning,
                overAmount,
            })
        },
    },

    methods: {
        handleTap() {
            this.triggerEvent('tap')
        },
    },
})
