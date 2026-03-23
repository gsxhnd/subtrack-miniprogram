/**
 * 全局状态管理
 */

import { eventBus, EVENTS } from './event-bus'
import type { Subscription, UserSettings, Currency } from '@/models'
import { DEFAULT_USER_SETTINGS, DEFAULT_EXCHANGE_RATES, STORAGE_KEYS } from '@/models'
import { storage } from '@/utils/storage'
import { calculateNextBillingDate } from '@/utils/billing'
import { generateId } from '@/utils/id'

// 全局状态定义
interface GlobalData {
    subscriptions: Subscription[]
    settings: UserSettings
    exchangeRates: typeof DEFAULT_EXCHANGE_RATES
    initialized: boolean
}

// 扩展 App 类型
declare global {
    interface IAppOption {
        globalData: GlobalData
        store: ReturnType<typeof createStore>
    }
}

/**
 * 初始化全局状态
 */
export function initializeStore(): void {
    const app = getApp()

    // 从本地存储恢复数据
    const subscriptions = storage.get<Subscription[]>(STORAGE_KEYS.SUBSCRIPTIONS) || []
    const settings = storage.get<UserSettings>(STORAGE_KEYS.USER_SETTINGS) || { ...DEFAULT_USER_SETTINGS }
    const exchangeRates = storage.get<typeof DEFAULT_EXCHANGE_RATES>(STORAGE_KEYS.EXCHANGE_RATES) || [...DEFAULT_EXCHANGE_RATES]

    app.globalData = {
        subscriptions,
        settings,
        exchangeRates,
        initialized: true,
    }
}

/**
 * 创建 Store 操作方法
 */
export function createStore() {
    return {
        // ========== 订阅相关 ==========
        getSubscriptions(): Subscription[] {
            return getApp().globalData.subscriptions
        },

        getActiveSubscriptions(): Subscription[] {
            return getApp().globalData.subscriptions.filter((s) => s.status === 'active')
        },

        getSubscriptionById(id: string): Subscription | undefined {
            return getApp().globalData.subscriptions.find((s) => s.id === id)
        },

        addSubscription(input: {
            name: string
            amount: number
            currency: Currency
            billingRule: {
                cycle: 'monthly' | 'quarterly' | 'yearly'
                day: number
                month?: number
            }
            startDate?: string
            remark?: string
            icon?: string
            category?: string
        }): Subscription {
            const app = getApp()
            const now = new Date().toISOString()
            const id = generateId()

            const subscription: Subscription = {
                id,
                name: input.name,
                amount: input.amount,
                currency: input.currency,
                billingRule: input.billingRule,
                startDate: input.startDate || now.split('T')[0],
                nextBillingDate: calculateNextBillingDate(input.billingRule, input.startDate),
                remark: input.remark,
                status: 'active',
                icon: input.icon,
                category: input.category,
                createdAt: now,
                updatedAt: now,
            }

            app.globalData.subscriptions.push(subscription)
            storage.set(STORAGE_KEYS.SUBSCRIPTIONS, app.globalData.subscriptions)
            eventBus.emit(EVENTS.SUBSCRIPTION_CHANGED, { action: 'add', data: subscription })

            return subscription
        },

        updateSubscription(id: string, data: Partial<Subscription>): boolean {
            const app = getApp()
            const index = app.globalData.subscriptions.findIndex((s) => s.id === id)
            if (index === -1) return false

            const existing = app.globalData.subscriptions[index]
            app.globalData.subscriptions[index] = {
                ...existing,
                ...data,
                nextBillingDate: data.billingRule
                    ? calculateNextBillingDate(data.billingRule, existing.startDate)
                    : existing.nextBillingDate,
                updatedAt: new Date().toISOString(),
            }

            storage.set(STORAGE_KEYS.SUBSCRIPTIONS, app.globalData.subscriptions)
            eventBus.emit(EVENTS.SUBSCRIPTION_CHANGED, { action: 'update', id, data })

            return true
        },

        cancelSubscription(id: string): boolean {
            const app = getApp()
            const subscription = app.globalData.subscriptions.find((s) => s.id === id)
            if (!subscription) return false

            subscription.status = 'cancelled'
            subscription.cancelledAt = new Date().toISOString()
            subscription.updatedAt = new Date().toISOString()

            storage.set(STORAGE_KEYS.SUBSCRIPTIONS, app.globalData.subscriptions)
            eventBus.emit(EVENTS.SUBSCRIPTION_CHANGED, { action: 'cancel', id })

            return true
        },

        restoreSubscription(id: string): boolean {
            const app = getApp()
            const subscription = app.globalData.subscriptions.find((s) => s.id === id)
            if (!subscription) return false

            subscription.status = 'active'
            subscription.cancelledAt = undefined
            subscription.updatedAt = new Date().toISOString()

            storage.set(STORAGE_KEYS.SUBSCRIPTIONS, app.globalData.subscriptions)
            eventBus.emit(EVENTS.SUBSCRIPTION_CHANGED, { action: 'restore', id })

            return true
        },

        deleteSubscription(id: string): boolean {
            const app = getApp()
            const index = app.globalData.subscriptions.findIndex((s) => s.id === id)
            if (index === -1) return false

            app.globalData.subscriptions.splice(index, 1)
            storage.set(STORAGE_KEYS.SUBSCRIPTIONS, app.globalData.subscriptions)
            eventBus.emit(EVENTS.SUBSCRIPTION_CHANGED, { action: 'delete', id })

            return true
        },

        // ========== 设置相关 ==========
        getSettings(): UserSettings {
            return getApp().globalData.settings
        },

        updateBudget(budget: number): void {
            const app = getApp()
            app.globalData.settings.monthlyBudget = budget
            storage.set(STORAGE_KEYS.USER_SETTINGS, app.globalData.settings)
            eventBus.emit(EVENTS.SETTINGS_CHANGED, app.globalData.settings)
        },

        updateBaseCurrency(currency: Currency): void {
            const app = getApp()
            app.globalData.settings.baseCurrency = currency
            app.globalData.settings.budgetCurrency = currency
            storage.set(STORAGE_KEYS.USER_SETTINGS, app.globalData.settings)
            eventBus.emit(EVENTS.SETTINGS_CHANGED, app.globalData.settings)
        },

        // ========== 汇率相关 ==========
        getExchangeRates() {
            return getApp().globalData.exchangeRates
        },
    }
}
