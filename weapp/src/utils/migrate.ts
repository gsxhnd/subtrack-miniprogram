/**
 * 数据迁移工具
 */

import { STORAGE_VERSION, type StorageWrapper } from '@/models'

// 迁移函数类型
type MigrationFn = (data: unknown) => unknown

// 迁移映射表（版本 -> 迁移函数）
const migrations: Record<string, MigrationFn> = {
  // 示例：从 0.9.0 迁移到 1.0.0
  // '0.9.0': (data) => {
  //   // 执行迁移逻辑
  //   return data
  // },
}

/**
 * 获取下一个版本号
 */
function getNextVersion(version: string): string {
  const parts = version.split('.')
  if (parts.length !== 3) {
    return STORAGE_VERSION
  }

  const patch = parseInt(parts[2], 10) + 1
  return `${parts[0]}.${parts[1]}.${patch}`
}

/**
 * 比较版本号
 * @returns -1: v1 < v2, 0: v1 === v2, 1: v1 > v2
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number)
  const parts2 = v2.split('.').map(Number)

  for (let i = 0; i < 3; i++) {
    if (parts1[i] < parts2[i]) return -1
    if (parts1[i] > parts2[i]) return 1
  }

  return 0
}

/**
 * 执行数据迁移
 */
export function migrateData<T>(
  stored: StorageWrapper<T>,
  currentVersion: string = STORAGE_VERSION,
): T {
  // 版本相同，无需迁移
  if (stored.version === currentVersion) {
    return stored.data
  }

  let data: unknown = stored.data
  let version = stored.version

  // 按版本顺序执行迁移
  while (compareVersions(version, currentVersion) < 0) {
    const migrate = migrations[version]
    if (!migrate) {
      console.warn(`[migrate] No migration found for version ${version}`)
      break
    }

    try {
      data = migrate(data)
      version = getNextVersion(version)
      console.log(`[migrate] Migrated to version ${version}`)
    } catch (error) {
      console.error(`[migrate] Migration failed for version ${version}:`, error)
      break
    }
  }

  return data as T
}

/**
 * 检查是否需要迁移
 */
export function needsMigration(
  stored: StorageWrapper<unknown>,
  currentVersion: string = STORAGE_VERSION,
): boolean {
  return compareVersions(stored.version, currentVersion) < 0
}

/**
 * 创建初始存储结构
 */
export function createInitialStorage<T>(data: T): StorageWrapper<T> {
  return {
    version: STORAGE_VERSION,
    data,
    lastUpdated: new Date().toISOString(),
  }
}
