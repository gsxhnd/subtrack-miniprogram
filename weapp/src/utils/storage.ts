/**
 * 本地存储封装
 */

import { STORAGE_KEYS, STORAGE_VERSION, type StorageWrapper } from '@/models'

/**
 * 基础存储操作
 */
export const storage = {
  /**
   * 获取存储数据
   */
  get<T>(key: string): T | null {
    try {
      const data = wx.getStorageSync(key)
      if (!data) return null
      return JSON.parse(data) as T
    } catch {
      return null
    }
  },

  /**
   * 设置存储数据
   */
  set<T>(key: string, value: T): void {
    try {
      wx.setStorageSync(key, JSON.stringify(value))
    } catch (error) {
      console.error(`[storage] set error for key ${key}:`, error)
    }
  },

  /**
   * 移除存储数据
   */
  remove(key: string): void {
    try {
      wx.removeStorageSync(key)
    } catch (error) {
      console.error(`[storage] remove error for key ${key}:`, error)
    }
  },

  /**
   * 清除所有应用数据
   */
  clear(): void {
    Object.values(STORAGE_KEYS).forEach((key) => {
      this.remove(key)
    })
  },
}

/**
 * 带版本的存储操作
 */
export const versionedStorage = {
  /**
   * 获取带版本的数据
   */
  get<T>(key: string): StorageWrapper<T> | null {
    return storage.get<StorageWrapper<T>>(key)
  },

  /**
   * 设置带版本的数据
   */
  set<T>(key: string, data: T): void {
    const wrapper: StorageWrapper<T> = {
      version: STORAGE_VERSION,
      data,
      lastUpdated: new Date().toISOString(),
    }
    storage.set(key, wrapper)
  },

  /**
   * 获取数据（自动解包）
   */
  getData<T>(key: string): T | null {
    const wrapper = this.get<T>(key)
    return wrapper?.data ?? null
  },
}

/**
 * 获取存储信息
 */
export function getStorageInfo(): WechatMiniprogram.GetStorageInfoSyncOption {
  return wx.getStorageInfoSync()
}

/**
 * 检查存储空间是否充足
 */
export function isStorageAvailable(requiredSize = 1024 * 100): boolean {
  try {
    const info = getStorageInfo()
    return info.remainingSize >= requiredSize
  } catch {
    return false
  }
}
