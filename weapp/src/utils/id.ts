/**
 * ID 生成工具
 */

/**
 * 生成唯一 ID
 * 使用时间戳 + 随机数的方式生成
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 9)
  return `${timestamp}${random}`
}

/**
 * 生成短 ID（用于显示）
 */
export function generateShortId(): string {
  return Math.random().toString(36).substring(2, 6).toUpperCase()
}
