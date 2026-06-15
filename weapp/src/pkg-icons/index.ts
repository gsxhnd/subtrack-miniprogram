/**
 * 分包 pkg-icons：图标核心逻辑
 *
 * 图标节点数据直接内联（来源 lucide），不依赖外部 npm 包
 * 主包通过 require.async 异步加载本模块
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconNode = [string, Record<string, any>, ...any[]];

export interface IconOptions {
  color?: string;
  size?: number;
  strokeWidth?: number;
}

// ---------- 内联图标节点数据 ----------

const icons: Record<string, IconNode[]> = {
  house: [["path",{"d":"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"}],["path",{"d":"M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"}]],
  list: [["path",{"d":"M3 5h.01"}],["path",{"d":"M3 12h.01"}],["path",{"d":"M3 19h.01"}],["path",{"d":"M8 5h13"}],["path",{"d":"M8 12h13"}],["path",{"d":"M8 19h13"}]],
  chartColumn: [["path",{"d":"M3 3v16a2 2 0 0 0 2 2h16"}],["path",{"d":"M18 17V9"}],["path",{"d":"M13 17V5"}],["path",{"d":"M8 17v-3"}]],
  user: [["path",{"d":"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"}],["circle",{"cx":"12","cy":"7","r":"4"}]],
  plus: [["path",{"d":"M5 12h14"}],["path",{"d":"M12 5v14"}]],
  arrowUpDown: [["path",{"d":"m21 16-4 4-4-4"}],["path",{"d":"M17 20V4"}],["path",{"d":"m3 8 4-4 4 4"}],["path",{"d":"M7 4v16"}]],
  arrowUp: [["path",{"d":"m5 12 7-7 7 7"}],["path",{"d":"M12 19V5"}]],
  arrowDown: [["path",{"d":"M12 5v14"}],["path",{"d":"m19 12-7 7-7-7"}]],
  listFilter: [["path",{"d":"M2 5h20"}],["path",{"d":"M6 12h12"}],["path",{"d":"M9 19h6"}]],
  x: [["path",{"d":"M18 6 6 18"}],["path",{"d":"m6 6 12 12"}]],
  check: [["path",{"d":"M20 6 9 17l-5-5"}]],
  chevronRight: [["path",{"d":"m9 18 6-6-6-6"}]],
  chevronDown: [["path",{"d":"m6 9 6 6 6-6"}]],
  chevronUp: [["path",{"d":"m18 15-6-6-6 6"}]],
  triangleAlert: [["path",{"d":"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"}],["path",{"d":"M12 9v4"}],["path",{"d":"M12 17h.01"}]],
  lightbulb: [["path",{"d":"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"}],["path",{"d":"M9 18h6"}],["path",{"d":"M10 22h4"}]],
  arrowLeftRight: [["path",{"d":"M8 3 4 7l4 4"}],["path",{"d":"M4 7h16"}],["path",{"d":"m16 21 4-4-4-4"}],["path",{"d":"M20 17H4"}]],
  chartColumnIncreasing: [["path",{"d":"M13 17V9"}],["path",{"d":"M18 17V5"}],["path",{"d":"M3 3v16a2 2 0 0 0 2 2h16"}],["path",{"d":"M8 17v-3"}]],
};

export type IconName = keyof typeof icons;

// ---------- 渲染函数 ----------

function renderNode(node: IconNode): string {
  const [tag, attrs, ...children] = node;
  const attrStr = Object.entries(attrs)
    .map(([k, v]) => `${k}="${String(v)}"`)
    .join(" ");

  const voidTags = new Set(["path", "circle", "rect", "line", "polyline", "polygon"]);
  if (voidTags.has(tag)) {
    return `<${tag} ${attrStr} />`;
  }
  const childrenStr = children.map(renderNode).join("");
  return `<${tag} ${attrStr}>${childrenStr}</${tag}>`;
}

export function iconToSvg(
  iconNodes: IconNode[],
  options: IconOptions = {},
): string {
  const { color = "currentColor", size = 24, strokeWidth = 2 } = options;

  const attrs = {
    xmlns: "http://www.w3.org/2000/svg",
    width: String(size),
    height: String(size),
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    "stroke-width": String(strokeWidth),
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  };

  const attrStr = Object.entries(attrs)
    .map(([k, v]) => `${k}="${v}"`)
    .join(" ");

  const inner = iconNodes.map(renderNode).join("");
  return `<svg ${attrStr}>${inner}</svg>`;
}

export function svgToDataUri(svg: string): string {
  return (
    "data:image/svg+xml;base64," +
    wx.arrayBufferToBase64(
      new Uint8Array(Array.from(svg).map((c) => c.charCodeAt(0))).buffer,
    )
  );
}

export function getIconSvg(name: IconName, options: IconOptions = {}): string {
  const nodes = icons[name];
  if (!nodes) {
    console.warn("[icons] Unknown icon:", name);
    return "";
  }
  return iconToSvg(nodes, options);
}

export function getIconDataUri(
  name: IconName,
  options: IconOptions = {},
): string {
  return svgToDataUri(getIconSvg(name, options));
}

// ---------- 带缓存的获取 ----------

const cache = new Map<string, string>();

function cacheKey(name: IconName, options: IconOptions): string {
  return `${name}|${options.color ?? "currentColor"}|${options.size ?? 24}|${options.strokeWidth ?? 2}`;
}

export function getIcon(name: IconName, options: IconOptions = {}): string {
  const key = cacheKey(name, options);
  if (cache.has(key)) return cache.get(key)!;
  const uri = getIconDataUri(name, options);
  cache.set(key, uri);
  return uri;
}
