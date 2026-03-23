/**
 * 事件总线实现
 */

type EventHandler = (data?: unknown) => void

class EventBus {
    private events: Map<string, EventHandler[]> = new Map()

    /**
     * 监听事件
     */
    on(event: string, handler: EventHandler): void {
        if (!this.events.has(event)) {
            this.events.set(event, [])
        }
        this.events.get(event)!.push(handler)
    }

    /**
     * 取消监听
     */
    off(event: string, handler: EventHandler): void {
        const handlers = this.events.get(event)
        if (handlers) {
            const index = handlers.indexOf(handler)
            if (index !== -1) {
                handlers.splice(index, 1)
            }
        }
    }

    /**
     * 触发事件
     */
    emit(event: string, data?: unknown): void {
        const handlers = this.events.get(event)
        if (handlers) {
            handlers.forEach((handler) => handler(data))
        }
    }

    /**
     * 清除所有事件监听
     */
    clear(): void {
        this.events.clear()
    }
}

export const eventBus = new EventBus()

// 事件常量
export const EVENTS = {
    SUBSCRIPTION_CHANGED: 'subscription:changed',
    SETTINGS_CHANGED: 'settings:changed',
    BUDGET_CHANGED: 'budget:changed',
} as const
