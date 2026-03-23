interface EditData {
    isEditMode: boolean
    subscriptionId: string
    name: string
    amount: string
    currency: string
    billingCycle: string
    billingDay: number
    billingMonth: number
    startDate: string
    remark: string
    isValid: boolean
}

Page<EditData, WechatMiniprogram.Page.CustomOption>({
    data: {
        isEditMode: false,
        subscriptionId: '',
        name: '',
        amount: '',
        currency: 'CNY',
        billingCycle: 'monthly',
        billingDay: 1,
        billingMonth: 1,
        startDate: '',
        remark: '',
        isValid: false,
    },

    onLoad(options: any) {
        // 设置默认开始日期
        const today = new Date().toISOString().split('T')[0]
        this.setData({ startDate: today })

        // 编辑模式
        if (options.id) {
            const app = getApp()
            const sub = app.store.getSubscriptionById(options.id)
            if (sub) {
                this.setData({
                    isEditMode: true,
                    subscriptionId: options.id,
                    name: sub.name,
                    amount: (sub.amount / 100).toFixed(2),
                    currency: sub.currency,
                    billingCycle: sub.billingRule.cycle,
                    billingDay: sub.billingRule.day,
                    billingMonth: sub.billingRule.month || 1,
                    startDate: sub.startDate,
                    remark: sub.remark || '',
                })
            }
            wx.setNavigationBarTitle({ title: '编辑订阅' })
            this.validateForm()
        }
    },

    onInputChange(e: any) {
        const { field } = e.currentTarget.dataset
        const { value } = e.detail
        this.setData({ [field]: value })
        this.validateForm()
    },

    onCurrencyChange(e: any) {
        const currencies = ['CNY', 'USD', 'EUR', 'GBP', 'JPY', 'HKD', 'TWD']
        this.setData({ currency: currencies[e.detail.value] })
    },

    onCycleChange(e: any) {
        const cycles = ['monthly', 'quarterly', 'yearly']
        this.setData({ billingCycle: cycles[e.detail.value] })
    },

    onDayChange(e: any) {
        this.setData({ billingDay: e.detail.value + 1 })
    },

    onMonthChange(e: any) {
        this.setData({ billingMonth: e.detail.value + 1 })
    },

    onDateChange(e: any) {
        this.setData({ startDate: e.detail.value })
    },

    validateForm() {
        const { name, amount } = this.data
        const isValid = name.trim() !== '' && parseFloat(amount) > 0
        this.setData({ isValid })
    },

    handleSubmit() {
        if (!this.data.isValid) return

        const app = getApp()
        const {
            isEditMode,
            subscriptionId,
            name,
            amount,
            currency,
            billingCycle,
            billingDay,
            billingMonth,
            startDate,
            remark,
        } = this.data

        const billingRule: any = {
            cycle: billingCycle,
            day: billingDay,
        }

        if (billingCycle === 'yearly') {
            billingRule.month = billingMonth
        }

        const amountInCents = Math.round(parseFloat(amount) * 100)

        if (isEditMode) {
            app.store.updateSubscription(subscriptionId, {
                name: name.trim(),
                amount: amountInCents,
                currency,
                billingRule,
                remark: remark.trim() || undefined,
            })
            wx.showToast({ title: '已更新', icon: 'success' })
        } else {
            app.store.addSubscription({
                name: name.trim(),
                amount: amountInCents,
                currency,
                billingRule,
                startDate,
                remark: remark.trim() || undefined,
            })
            wx.showToast({ title: '已添加', icon: 'success' })
        }

        wx.navigateBack()
    },
})
