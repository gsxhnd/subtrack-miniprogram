/**
 * 统计分析页面
 */

import * as echarts from 'echarts/core'
import { PieChart, LineChart, BarChart } from 'echarts/charts'
import {
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

import { eventBus, EVENTS } from '../../../store/event-bus'
import { calculateMonthlyAmount, calculateYearlyAmount, getMonthlySpendingByYear } from '../../../utils/billing'
import { convertCurrency, type Currency } from '../../../utils/currency'
import { CURRENCY_SYMBOLS } from '../../../models'

// 注册 ECharts 组件
echarts.use([
    PieChart,
    LineChart,
    BarChart,
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent,
    CanvasRenderer,
])

interface StatisticsData {
    baseCurrency: Currency
    currencySymbol: string
    activeCount: number
    monthlyTotal: number
    yearlyTotal: number
    monthlyTotalDisplay: string
    yearlyTotalDisplay: string
    categoryData: Array<{ name: string; value: number; percentage: string }>
    currencyData: Array<{ currency: Currency; monthly: number; yearly: number; count: number }>
    currentYear: number
    selectedTab: 'category' | 'currency' | 'trend'
    pieChart: any
    trendChart: any
}

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
        pieChart: null,
        trendChart: null,
    },

    onLoad() {
        this.refreshData()
        eventBus.on(EVENTS.SUBSCRIPTION_CHANGED, this.refreshData.bind(this))
        eventBus.on(EVENTS.SETTINGS_CHANGED, this.refreshData.bind(this))
    },

    onUnload() {
        eventBus.off(EVENTS.SUBSCRIPTION_CHANGED, this.refreshData.bind(this))
        eventBus.off(EVENTS.SETTINGS_CHANGED, this.refreshData.bind(this))
    },

    onShow() {
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
            .map(([name, value]) => ({
                name,
                value: Math.round(value / 100),
                percentage: monthlyTotal > 0 ? ((value / monthlyTotal) * 100).toFixed(1) : '0',
            }))
            .sort((a, b) => b.value - a.value)

        // 生成货币数据
        const currencyData = Array.from(currencyMap.entries()).map(([currency, data]) => ({
            currency,
            monthly: data.monthly,
            yearly: data.yearly,
            count: data.count,
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

        // 更新图表
        this.updatePieChart()
        this.updateTrendChart()
    },

    switchTab(e: any) {
        const { tab } = e.currentTarget.dataset
        this.setData({ selectedTab: tab })
        if (tab === 'category') {
            this.updatePieChart()
        } else if (tab === 'trend') {
            this.updateTrendChart()
        }
    },

    initPieChart(e: any) {
        const { canvas, width, height, dpr } = e.detail
        const chart = echarts.init(canvas, null, {
            width,
            height,
            devicePixelRatio: dpr,
        })
        this.setData({ pieChart: chart })
        canvas.setChart(chart)
        this.updatePieChart()
    },

    initTrendChart(e: any) {
        const { canvas, width, height, dpr } = e.detail
        const chart = echarts.init(canvas, null, {
            width,
            height,
            devicePixelRatio: dpr,
        })
        this.setData({ trendChart: chart })
        canvas.setChart(chart)
        this.updateTrendChart()
    },

    updatePieChart() {
        const chart = this.data.pieChart
        if (!chart || this.data.categoryData.length === 0) return

        const option = {
            tooltip: {
                trigger: 'item',
                formatter: '{b}: {c} ({d}%)',
            },
            legend: {
                orient: 'vertical',
                right: 10,
                top: 'center',
                textStyle: {
                    fontSize: 12,
                },
            },
            series: [
                {
                    type: 'pie',
                    radius: ['40%', '70%'],
                    center: ['35%', '50%'],
                    avoidLabelOverlap: false,
                    itemStyle: {
                        borderRadius: 8,
                        borderColor: '#fff',
                        borderWidth: 2,
                    },
                    label: {
                        show: false,
                    },
                    emphasis: {
                        label: {
                            show: true,
                            fontSize: 14,
                            fontWeight: 'bold',
                        },
                    },
                    data: this.data.categoryData.map((item, index) => ({
                        name: item.name,
                        value: item.value,
                        itemStyle: {
                            color: this.getColor(index),
                        },
                    })),
                },
            ],
        }

        chart.setOption(option)
    },

    updateTrendChart() {
        const chart = this.data.trendChart
        if (!chart) return

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

        const option = {
            tooltip: {
                trigger: 'axis',
                formatter: (params: any) => {
                    const data = params[0]
                    return `${data.name}<br/>支出: ${this.data.currencySymbol}${data.value.toFixed(2)}`
                },
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                top: '10%',
                containLabel: true,
            },
            xAxis: {
                type: 'category',
                data: months,
                axisLabel: {
                    fontSize: 10,
                },
            },
            yAxis: {
                type: 'value',
                axisLabel: {
                    fontSize: 10,
                    formatter: `{value}`,
                },
            },
            series: [
                {
                    type: 'bar',
                    data: convertedData.map((d) => d.amount),
                    itemStyle: {
                        color: '#3b82f6',
                        borderRadius: [4, 4, 0, 0],
                    },
                    barWidth: '60%',
                },
            ],
        }

        chart.setOption(option)
    },

    getColor(index: number): string {
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
    },
})
