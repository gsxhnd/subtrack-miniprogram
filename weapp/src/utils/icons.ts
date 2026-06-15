/**
 * 图标工具 - 分包异步化包装层
 *
 * lucide 图标核心逻辑已移至分包 pkg-icons
 * 本模块通过 require.async 异步加载，对外提供 getIcon / getIconAsync
 */

export interface IconOptions {
  color?: string;
  size?: number;
  strokeWidth?: number;
}

export type IconName =
  | 'house' | 'list' | 'chartColumn' | 'user' | 'plus'
  | 'arrowUpDown' | 'arrowUp' | 'arrowDown'
  | 'listFilter' | 'x' | 'check'
  | 'chevronRight' | 'chevronDown' | 'chevronUp'
  | 'triangleAlert' | 'lightbulb' | 'arrowLeftRight'
  | 'chartColumnIncreasing';

/** 分包模块类型 */
interface IconModule {
  getIcon: (name: IconName, options?: IconOptions) => string;
  getIconSvg: (name: IconName, options?: IconOptions) => string;
  getIconDataUri: (name: IconName, options?: IconOptions) => string;
  svgToDataUri: (svg: string) => string;
}

/** 缓存已加载的分包模块 */
let _module: IconModule | null = null;

/**
 * 异步加载图标分包模块
 */
export function loadIconModule(): Promise<IconModule> {
  if (_module) return Promise.resolve(_module);

  return new Promise((resolve, reject) => {
    require.async('../pkg-icons/index', (mod: IconModule) => {
      _module = mod;
      resolve(mod);
    }, (err: any) => {
      console.error('[icons] Failed to load pkg-icons:', err);
      reject(err);
    });
  });
}

/**
 * 异步获取图标 Data URI
 */
export async function getIconAsync(name: IconName, options: IconOptions = {}): Promise<string> {
  const mod = await loadIconModule();
  return mod.getIcon(name, options);
}

/**
 * 同步获取图标（需确保分包已加载，否则返回空字符串）
 * 适用于分包已预加载完成的场景
 */
export function getIcon(name: IconName, options: IconOptions = {}): string {
  if (!_module) {
    console.warn('[icons] Module not loaded yet, use getIconAsync or call loadIconModule first');
    return '';
  }
  return _module.getIcon(name, options);
}

/**
 * 批量异步获取图标
 */
export async function getIcons(
  items: Array<{ name: IconName; options?: IconOptions }>
): Promise<string[]> {
  const mod = await loadIconModule();
  return items.map(({ name, options }) => mod.getIcon(name, options ?? {}));
}
