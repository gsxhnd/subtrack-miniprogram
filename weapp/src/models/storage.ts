/**
 * 存储模型定义
 */

// 存储数据版本
export const STORAGE_VERSION = '1.0.0'

// 通用存储结构（带版本）
export interface StorageWrapper<T> {
  version: string
  data: T
  lastUpdated: string
}

// 存储键名
export const STORAGE_KEYS = {
  SUBSCRIPTIONS: 'subtrack_subscriptions',
  USER_SETTINGS: 'subtrack_user_settings',
  EXCHANGE_RATES: 'subtrack_exchange_rates',
} as const

// 存储键类型
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]
