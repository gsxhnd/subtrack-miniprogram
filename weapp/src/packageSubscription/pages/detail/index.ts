interface DetailData {
    subscriptionId: string
    subscription: any
    amountDisplay: string
    cycleDisplay: string
    currencyName: string
    isCancelled: boolean
}

Page<DetailData, WechatMiniprogram.Page.CustomOption>({
    data: {
        subscriptionId: '',
        subscription: null,
        amountDisplay: '',
        cycleDisplay: '',
        currencyName: '',
        isCancelled: false,
    },

    onLoad(options: any) {
        if (options.id) {
            this.setData({ subscriptionId: options.id })
            this.loadSubscription()
        }
    },

    onShow() {
        if (this.data.subscriptionId) {
            this.loadSubscription()
        }
    },

    loadSubscription() {
        const app = getApp()
        const sub = app.store.getSubscriptionById(this.data.subscriptionId)
        if (!sub) return

        const currencyNames: Record<string, string> = {
            CNY: '人民币',
            USD: '美元',
            EUR: '欧元',
            GBP: '英镑',
            JPY: '日元',
            HKD: '港币',
            TWD: '新台币',
        }

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

        this.setData({
            subscription: sub,
            amountDisplay: `${symbol}${amount.toFixed(2)}`,
            cycleDisplay: cycleNames[sub.billingRule?.cycle] || '每月',
            currencyName: currencyNames[sub.currency] || sub.currency,
            isCancelled: sub.status === 'cancelled',
        })
    },

    handleEdit() {
        const id = this.data.subscription?.id
        if (id) {
            wx.navigateTo({ url: `/packageSubscription/pages/edit/index?id=${id}` })
        }
    },

    handleCancel() {
        const sub = this.data.subscription
        wx.showModal({
            title: '取消订阅',
            content: `确定要取消「${sub?.name}」吗？`,
            success: (res) => {
                if (res.confirm) {
                    const app = getApp()
                    app.store.cancelSubscription(sub.id)
                    wx.showToast({ title: '已取消', icon: 'success' })
                    this.setData({ isCancelled: true })
                }
            },
        })
    },

    handleRestore() {
        const sub = this.data.subscription
        const app = getApp()
        app.store.restoreSubscription(sub.id)
        wx.showToast({ title: '已恢复', icon: 'success' })
        this.setData({ isCancelled: false })
    },

    handleDelete() {
        const sub = this.data.subscription
        wx.showModal({
            title: '删除订阅',
            content: `确定要删除「${sub?.name}」吗？此操作不可恢复。`,
            confirmColor: '#ef4444',
            success: (res) => {
                if (res.confirm) {
                    const app = getApp()
                    app.store.deleteSubscription(sub.id)
                    wx.showToast({ title: '已删除', icon: 'success' })
                    wx.navigateBack()
                }
            },
        })
    },
})
