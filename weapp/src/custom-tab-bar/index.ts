// 生成 SVG data URI 的辅助函数
function svgToDataUri(svg: string): string {
    return 'data:image/svg+xml;base64,' + wx.arrayBufferToBase64(
        new Uint8Array(Array.from(svg).map(c => c.charCodeAt(0))).buffer
    )
}

// SVG 图标定义（Lucide 风格，24x24 viewBox）
const ICONS = {
    home: (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,
    list: (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>`,
    chart: (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 16l4-8 4 4 4-8"/></svg>`,
    user: (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
}

const DEFAULT_COLOR = '#64748b'
const SELECTED_COLOR = '#155eef'

Component({
    data: {
        selected: 0,
        addPressed: false,
        color: DEFAULT_COLOR,
        selectedColor: SELECTED_COLOR,
        list: [
            {
                pagePath: 'pages/index/index',
                text: '首页',
                icon: '',
                selectedIcon: '',
            },
            {
                pagePath: 'pages/subscription/index',
                text: '订阅',
                icon: '',
                selectedIcon: '',
            },
            {
                pagePath: 'pages/statistics/index',
                text: '统计',
                icon: '',
                selectedIcon: '',
            },
            {
                pagePath: 'pages/profile/index',
                text: '我的',
                icon: '',
                selectedIcon: '',
            },
        ],
    },

    lifetimes: {
        attached() {
            const iconGenerators = [ICONS.home, ICONS.list, ICONS.chart, ICONS.user]
            const list = this.data.list.map((item, index) => ({
                ...item,
                icon: svgToDataUri(iconGenerators[index](DEFAULT_COLOR)),
                selectedIcon: svgToDataUri(iconGenerators[index](SELECTED_COLOR)),
            }))
            this.setData({ list })
            this.updateSelected()
        },
    },

    pageLifetimes: {
        show() {
            this.updateSelected()
        },
    },

    methods: {
        switchTab(e: any) {
            const { index, path } = e.currentTarget.dataset
            wx.switchTab({ url: '/' + path })
            this.setData({ selected: index })
        },

        updateSelected() {
            const pages = getCurrentPages()
            const currentPage = pages[pages.length - 1]
            const route = currentPage?.route || ''
            const index = this.data.list.findIndex(item => item.pagePath === route)
            if (index !== -1 && index !== this.data.selected) {
                this.setData({ selected: index })
            }
        },

        onAdd() {
            this.setData({ addPressed: true })
            setTimeout(() => {
                this.setData({ addPressed: false })
                wx.navigateTo({ url: '/packageSubscription/pages/edit/index' })
            }, 150)
        },
    },
})
