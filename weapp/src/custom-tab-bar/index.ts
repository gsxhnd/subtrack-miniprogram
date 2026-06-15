function svgToDataUri(svg: string): string {
  return (
    'data:image/svg+xml;base64,' +
    wx.arrayBufferToBase64(
      new Uint8Array(Array.from(svg).map((c) => c.charCodeAt(0))).buffer,
    )
  )
}

const ICONS = {
  home: (c: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,
  list: (c: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>`,
  chart: (c: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 16l4-8 4 4 4-8"/></svg>`,
  user: (c: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
}

const COLOR_DEFAULT = '#94a3b8'
const COLOR_ACTIVE = '#155eef'

Component({
  data: {
    selected: 0,
    bgImage: '',
    list: [
      { pagePath: 'pages/index/index', text: '首页', icon: '', selectedIcon: '' },
      { pagePath: 'pages/subscription/index', text: '订阅', icon: '', selectedIcon: '' },
      { pagePath: 'pages/statistics/index', text: '统计', icon: '', selectedIcon: '' },
      { pagePath: 'pages/profile/index', text: '我的', icon: '', selectedIcon: '' },
    ],
  },

  lifetimes: {
    attached() {
      const iconGens = [ICONS.home, ICONS.list, ICONS.chart, ICONS.user]
      const list = this.data.list.map((item, i) => ({
        ...item,
        icon: svgToDataUri(iconGens[i](COLOR_DEFAULT)),
        selectedIcon: svgToDataUri(iconGens[i](COLOR_ACTIVE)),
      }))
      this.setData({ list })
      this.syncSelected()
      setTimeout(() => this.generateBg(), 100)
    },
  },

  pageLifetimes: {
    show() {
      this.syncSelected()
      if (!this.data.bgImage) {
        setTimeout(() => this.generateBg(), 100)
      }
    },
  },

  methods: {
    syncSelected() {
      const pages = getCurrentPages()
      const route = pages[pages.length - 1]?.route || ''
      const idx = this.data.list.findIndex((item) => item.pagePath === route)
      if (idx !== -1) this.setData({ selected: idx })
    },

    switchTab(e: any) {
      const { index, path } = e.currentTarget.dataset
      this.setData({ selected: index })
      wx.switchTab({ url: '/' + path })
    },

    onAdd() {
      wx.navigateTo({ url: '/pages/subscription/edit/index' })
    },

    /** canvas 绘制凸起曲线 → 导出图片 */
    generateBg() {
      const query = this.createSelectorQuery()
      query
        .select('#tabBg')
        .fields({ node: true, size: true })
        .exec((res: any[]) => {
          const info = res[0]
          if (!info?.node) return

          const canvas = info.node
          const dpr = wx.getWindowInfo().pixelRatio || 2
          const W = info.width
          const H = info.height

          canvas.width = W * dpr
          canvas.height = H * dpr

          const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
          ctx.scale(dpr, dpr)
          ctx.clearRect(0, 0, W, H)

          this.drawConvexCurve(ctx, W, H)

          setTimeout(() => {
            wx.canvasToTempFilePath({
              canvas,
              destWidth: W * dpr,
              destHeight: H * dpr,
              success: (result) => {
                this.setData({ bgImage: result.tempFilePath })
              },
            } as any)
          }, 50)
        })
    },

    /**
     * 绘制中间凸起的贝塞尔曲线
     *
     * 形状示意（tabbar 顶部边缘）:
     *            ___
     *          /     \
     *         /       \
     * _______/         \_______
     *
     * 中间向上隆起，两侧平直
     */
    drawConvexCurve(ctx: CanvasRenderingContext2D, W: number, H: number) {
      const cx = W / 2
      // 曲线参数
      const humpW = 70         // 凸起半宽（px）
      const humpH = 32         // 凸起高度（px）
      const spread = 30        // 左右过渡宽度（px）
      const baseY = humpH + 4  // 平直线 Y 坐标（从顶部往下偏移，留出凸起空间）

      ctx.beginPath()
      // 左上角 → 左侧平直线
      ctx.moveTo(0, baseY)
      ctx.lineTo(cx - humpW - spread, baseY)

      // 左侧过渡：从平直向上弯曲
      ctx.bezierCurveTo(
        cx - humpW, baseY,       // cp1: 紧贴平直线
        cx - humpW * 0.6, 0,     // cp2: 拉向顶部
        cx, 0,                   // 终点: 凸起顶部中心
      )

      // 右侧过渡：从顶部向下回到平直
      ctx.bezierCurveTo(
        cx + humpW * 0.6, 0,     // cp1: 顶部右侧
        cx + humpW, baseY,       // cp2: 回到平直线
        cx + humpW + spread, baseY, // 终点: 右侧平直
      )

      // 右侧平直线 → 右下 → 左下 → 闭合
      ctx.lineTo(W, baseY)
      ctx.lineTo(W, H)
      ctx.lineTo(0, H)
      ctx.closePath()

      // 填充白色
      ctx.fillStyle = '#ffffff'
      ctx.fill()

      // 顶部曲线描边
      ctx.beginPath()
      ctx.moveTo(0, baseY)
      ctx.lineTo(cx - humpW - spread, baseY)
      ctx.bezierCurveTo(
        cx - humpW, baseY,
        cx - humpW * 0.6, 0,
        cx, 0,
      )
      ctx.bezierCurveTo(
        cx + humpW * 0.6, 0,
        cx + humpW, baseY,
        cx + humpW + spread, baseY,
      )
      ctx.lineTo(W, baseY)
      ctx.strokeStyle = 'rgba(0,0,0,0.06)'
      ctx.lineWidth = 0.5
      ctx.stroke()
    },
  },
})
