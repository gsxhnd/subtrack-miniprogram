import { initializeStore, createStore } from './store/index'

App({
  globalData: {
    subscriptions: [],
    settings: {
      monthlyBudget: 0,
      budgetCurrency: 'CNY',
      reminderEnabled: true,
      reminderDays: 3,
      baseCurrency: 'CNY',
    },
    exchangeRates: [],
    initialized: false,
  },

  store: null as ReturnType<typeof createStore> | null,

  onLaunch() {
    // 初始化状态管理
    initializeStore()
    this.store = createStore()
    console.log('[SubTrack] App launched')
  },
})
