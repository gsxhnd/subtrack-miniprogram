/**
 * 统计分析页面 - 使用 Chart.js + Canvas 2D
 */

import {
    Chart,
    DoughnutController,
    BarController,
    ArcElement,
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
} from 'chart.js'

import { eventBus, EVENTS } from '../../store/event-bus'
import { calculateMonthlyAmount, calculateYearlyAmount, getMonthlySpendingByYear } from '../../utils/billing'
import { convertCurrency, type Currency } from '../../utils/currency'
import { CURRENCY_SYMBOLS } from '../../models'

// 注册 Chart.js 组件
Chart.register(
    DoughnutController,
    BarController,
    ArcElement,
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
)

/**
 * 适配微信小程序 Canvas 节点，使其兼容 Chart.js 的 DOM 访问
 */
function adaptCanvas(canvas: any, width: number, height: number) {
    if (!canvas.style) {
        canvas.style = {}
    }
    canvas.style.width = width + 'px'
    canvas.style.height = height + 'px'
    canvas.style.display = 'block'
    canvas.clientWidth = width
    canvas.clientHeight = height
    if (!canvas.addEventListener) {
        canvas.addEventListener = () => { }
    }
    if (!canvas.removeEventListener) {
        canvas.removeEventListener = () => { }
    }
    if (!canvas.parentNode) {
        canvas.parentNode = { clientWidth: width, clientHeight: height }
    }
    if (!canvas.getBoundingClientRect) {
        canvas.getBoundingClientRect = () => ({
            x: 0, y: 0, width, height, top: 0, left: 0, right: width, bottom: height,
        })
    }
}

interface StatisticsData {
    baseCurrency: Currency
    currencySymbol: string
    activeCount: number
    monthlyTotal: number
    yearlyTotal: number
    monthlyTotalDisplay: string
    yearlyTotalDisplay: string
    categoryData: Array<{ name: string; value: number; percentage: string; color: string }>
    currencyData: Array<{ currency: Currency; monthly: number; yearly: number; count: number; monthlyDisplay: string; yearlyDisplay: string }>
    currentYear: number
    selectedTab: 'category' | 'currency' | 'trend'
}

// 用 Page 外部变量存储 Chart 实例（避免 setData 序列化问题）
let pieChartInstance: Chart | null = null
let trendChartInstance: Chart | null = null

Page<StatisticsData, WechatMiniprogram.Page.CustomOption>({
    data: {
        baseCurrency: 'CNY',
        currencySymbol: '¥',
        activeCount: 0,
        monthlyTotal: 0,
        yearlyTotal: 0,
        monthlyTotalDisplay: '0.00',
        yearlyTotalDisplay: '0.00',
        categoryData: [],
        currencyData: [],
        currentYear: new Date().getFullYear(),
        selectedTab: 'category',
    },

    onLoad() {
        this.refreshData()
        eventBus.on(EVENTS.SUBSCRIPTION_CHANGED, this.refreshData.bind(this))
        eventBus.on(EVENTS.SETTINGS_CHANGED, this.refreshData.bind(this))
    },

    onUnload() {
        eventBus.off(EVENTS.SUBSCRIPTION_CHANGED, this.refreshData.bind(this))
        eventBus.off(EVENTS.SETTINGS_CHANGED, this.refreshData.bind(this))
        if (pieChartInstance) {
            pieChartInstance.destroy()
            pieChartInstance = null
        }
        if (trendChartInstance) {
            trendChartInstance.destroy()
            trendChartInstance = null
        }
    },

    onShow() {
        if (typeof this.getTabBar === 'function' && this.getTabBar()) {
            this.getTabBar().setData({ selected: 2 })
        }
        this.refreshData()
    },

    refreshData() {
        const app = getApp()
        const { subscriptions, settings, exchangeRates } = app.globalData

        const activeSubscriptions = subscriptions.filter((s: any) => s.status === 'active')
        const baseCurrency = settings.baseCurrency
        const currencySymbol = CURRENCY_SYMBOLS[baseCurrency] || '¥'

        // 计算总支出
        let monthlyTotal = 0
        let yearlyTotal = 0

        // 按分类统计
        const categoryMap = new Map<string, number>()

        // 按货币统计
        const currencyMap = new Map<Currency, { monthly: number; yearly: number; count: number }>()

        for (const sub of activeSubscriptions) {
            const monthly = calculateMonthlyAmount(sub)
            const yearly = calculateYearlyAmount(sub)
            const monthlyConverted = convertCurrency(monthly, sub.currency, baseCurrency, exchangeRates)
            const yearlyConverted = convertCurrency(yearly, sub.currency, baseCurrency, exchangeRates)

            monthlyTotal += monthlyConverted
            yearlyTotal += yearlyConverted

            // 分类统计
            const category = sub.category || '未分类'
            const existingCategory = categoryMap.get(category) || 0
            categoryMap.set(category, existingCategory + monthlyConverted)

            // 货币统计
            const existingCurrency = currencyMap.get(sub.currency) || { monthly: 0, yearly: 0, count: 0 }
            currencyMap.set(sub.currency, {
                monthly: existingCurrency.monthly + monthly,
                yearly: existingCurrency.yearly + yearly,
                count: existingCurrency.count + 1,
            })
        }

        // 生成分类数据
        const categoryData = Array.from(categoryMap.entries())
            .map(([name, value], index) => ({
                name,
                value: Math.round(value / 100),
                percentage: monthlyTotal > 0 ? ((value / monthlyTotal) * 100).toFixed(1) : '0',
                color: getColor(index),
            }))
            .sort((a, b) => b.value - a.value)

        // 生成货币数据
        const currencyData = Array.from(currencyMap.entries()).map(([currency, data]) => ({
            currency,
            monthly: data.monthly,
            yearly: data.yearly,
            count: data.count,
            monthlyDisplay: (data.monthly / 100).toFixed(2),
            yearlyDisplay: (data.yearly / 100).toFixed(2),
        }))

        this.setData({
            baseCurrency,
            currencySymbol,
            activeCount: activeSubscriptions.length,
            monthlyTotal,
            yearlyTotal,
            monthlyTotalDisplay: (monthlyTotal / 100).toFixed(2),
            yearlyTotalDisplay: (yearlyTotal / 100).toFixed(2),
            categoryData,
            currencyData,
        })

        // 更新图表（使用 nextTick 确保 canvas 已渲染）
        wx.nextTick(() => {
            if (this.data.selectedTab === 'category') {
                this.renderPieChart()
            } else if (this.data.selectedTab === 'trend') {
                this.renderTrendChart()
            }
        })
    },

    switchTab(e: any) {
        const { tab } = e.currentTarget.dataset
        this.setData({ selectedTab: tab })
        wx.nextTick(() => {
            if (tab === 'category') {
                this.renderPieChart()
            } else if (tab === 'trend') {
                this.renderTrendChart()
            }
        })
    },

    renderPieChart() {
        if (this.data.categoryData.length === 0) return

        const query = this.createSelectorQuery()
        query.select('#pie-chart')
            .fields({ node: true, size: true })
            .exec((res: any) => {
                if (!res[0] || !res[0].node) return

                const canvas = res[0].node
                const ctx = canvas.getContext('2d')
                const dpr = wx.getWindowInfo().pixelRatio
                const width = res[0].width
                const height = res[0].height

                canvas.width = width * dpr
                canvas.height = height * dpr
                ctx.scale(dpr, dpr)

                // 适配 canvas 以兼容 Chart.js
                adaptCanvas(canvas, width, height)

                // 销毁旧图表
                if (pieChartInstance) {
                    pieChartInstance.destroy()
                    pieChartInstance = null
                }

                pieChartInstance = new Chart(ctx as any, {
                    type: 'doughnut',
                    data: {
                        labels: this.data.categoryData.map(item => item.name),
                        datasets: [{
                            data: this.data.categoryData.map(item => item.value),
                            backgroundColor: this.data.categoryData.map(item => item.color),
                            borderColor: '#ffffff',
                            borderWidth: 2,
                        }],
                    },
                    options: {
                        responsive: false,
                        animation: false,
                        cutout: '40%',
                        layout: {
                            padding: 10,
                        },
                        plugins: {
                            tooltip: { enabled: false },
                            legend: { display: false },
                        },
                    },
                })
            })
    },

    renderTrendChart() {
        const query = this.createSelectorQuery()
        query.select('#trend-chart')
            .fields({ node: true, size: true })
            .exec((res: any) => {
                if (!res[0] || !res[0].node) return

                const canvas = res[0].node
                const ctx = canvas.getContext('2d')
                const dpr = wx.getWindowInfo().pixelRatio
                const width = res[0].width
                const height = res[0].height

                canvas.width = width * dpr
                canvas.height = height * dpr
                ctx.scale(dpr, dpr)

                adaptCanvas(canvas, width, height)

                if (trendChartInstance) {
                    trendChartInstance.destroy()
                    trendChartInstance = null
                }

                const app = getApp()
                const { subscriptions, settings, exchangeRates } = app.globalData
                const activeSubscriptions = subscriptions.filter((s: any) => s.status === 'active')

                // 获取月度支出数据
                const monthlyData = getMonthlySpendingByYear(activeSubscriptions, this.data.currentYear)

                // 转换为基准货币
                const convertedData = monthlyData.map((item) => ({
                    month: item.month,
                    amount: convertCurrency(item.amount, settings.baseCurrency, settings.baseCurrency, exchangeRates) / 100,
                    count: item.count,
                }))

                const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

                trendChartInstance = new Chart(ctx as any, {
                    type: 'bar',
                    data: {
                        labels: months,
                        datasets: [{
                            data: convertedData.map((d) => d.amount),
                            backgroundColor: '#3b82f6',
                            borderRadius: 4,
                            barPercentage: 0.6,
                        }],
                    },
                    options: {
                        responsive: false,
                        animation: false,
                        layout: {
                            padding: { left: 4, right: 4, top: 10, bottom: 4 },
                        },
                        scales: {
                            x: {
                                ticks: { font: { size: 10 } },
                                grid: { display: false },
                            },
                            y: {
                                ticks: { font: { size: 10 } },
                                beginAtZero: true,
                            },
                        },
                        plugins: {
                            tooltip: { enabled: false },
                            legend: { display: false },
                        },
                    },
                })
            })
    },
})

function getColor(index: number): string {
    const colors = [
        '#3b82f6',
        '#10b981',
        '#f59e0b',
        '#ef4444',
        '#8b5cf6',
        '#ec4899',
        '#06b6d4',
        '#84cc16',
    ]
    return colors[index % colors.length]
}
