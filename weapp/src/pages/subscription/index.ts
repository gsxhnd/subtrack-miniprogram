import { eventBus, EVENTS } from '../../store/event-bus'

interface SubscriptionData {
    subscriptions: any[]
    activeSubscriptions: any[]
    cancelledSubscriptions: any[]
    currentTab: 'active' | 'cancelled'
}

Page<SubscriptionData, WechatMiniprogram.Page.CustomOption>({
    data: {
        subscriptions: [],
        activeSubscriptions: [],
        cancelledSubscriptions: [],
        currentTab: 'active',
    },

    onLoad() {
        this.refreshData()
        eventBus.on(EVENTS.SUBSCRIPTION_CHANGED, this.refreshData.bind(this))
    },

    onUnload() {
        eventBus.off(EVENTS.SUBSCRIPTION_CHANGED, this.refreshData.bind(this))
    },

    onShow() {
        this.refreshData()
    },

    refreshData() {
        const app = getApp()
        const { subscriptions } = app.globalData

        const activeSubscriptions = subscriptions.filter((s: any) => s.status === 'active')
        const cancelledSubscriptions = subscriptions.filter((s: any) => s.status === 'cancelled')

        this.setData({
            subscriptions,
            activeSubscriptions,
            cancelledSubscriptions,
        })
    },

    switchTab(e: any) {
        const { tab } = e.currentTarget.dataset
        this.setData({ currentTab: tab })
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
