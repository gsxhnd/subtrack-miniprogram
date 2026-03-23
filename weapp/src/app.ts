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

  store: createStore(),

  onLaunch() {
    // 初始化状态管理（从本地存储恢复数据）
    initializeStore()
    console.log('[SubTrack] App launched')
  },
})
