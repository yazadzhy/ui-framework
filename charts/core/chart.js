import {Axis} from '../axis/axis'
import {niceAlignedTicks} from '../axis/tick-positioner'
import {createSeries} from '../series'
import {Legend} from '../interaction/legend'
import {Tooltip} from '../interaction/tooltip'
import {ZoomSelection} from '../interaction/zoom'
import {groupSeriesData, defaultGroupPixelWidth} from '../stock/data-grouping'
import {RangeSelector} from '../stock/range-selector'
import {renderPolar} from '../polar/polar-chart'
import {renderPie} from '../pie/pie-chart'
import {Navigator} from '../stock/navigator'
import {merge, resolveContainer, pick, relativeLength, uniqueId, defined, isNumber} from './utilities'
import {getOptions} from './options'
import {SvgRenderer} from './svg-renderer'

const X_LABEL_HEIGHT = 22

export class Chart {
    constructor(renderTo, userOptions, chartType) {
        this.userOptions = userOptions || {}
        this.options = merge(getOptions(), this.userOptions)
        this.chartType = chartType || 'Chart'
        this.container = resolveContainer(renderTo)
        if (!this.container)
            return
        this.legend = new Legend(this)
        this.tooltip = new Tooltip(this)
        this.zoomSelection = new ZoomSelection(this)
        this.init()
    }

    init() {
        this.getChartSize()
        this.container.style.position = 'relative'
        this.renderer = new SvgRenderer(this.container, this.chartWidth, this.chartHeight)
        this.createAxes()
        this.createSeries()
        this.normalizeCategories()
        if (this.navigatorEnabled)
            this.navigator = new Navigator(this)
        this.render()
        this.hasRendered = true
        //range selector persists across redraws (lives in the container as HTML, not SVG)
        if (this.options.rangeSelector && this.chartType === 'StockChart')
            this.rangeSelector = new RangeSelector(this)
        this.bindResize()
        //lifecycle events, fired once the chart is fully built. Views use these to lazy-load
        //finer-resolution data for the visible window (e.g. candlestick price history on zoom).
        const chartEvents = this.options.chart && this.options.chart.events
        if (chartEvents && typeof chartEvents.load === 'function')
            chartEvents.load.call(this, {target: this})
        //notify any afterSetExtremes handler of the initial visible window, so views that fetch data for the
        //current extremes load it for the initial range too
        const xa = this.xAxis && this.xAxis[0]
        if (xa)
            xa.fireSetExtremes('load')
    }

    get navigatorEnabled() {
        return !!(this.options.navigator && this.options.navigator.enabled)
    }

    showLoading(text) {
        this.hideLoading()
        const el = document.createElement('div')
        el.className = 'ix-chart-loading'
        if (text)
            el.textContent = text
        Object.assign(el.style, {
            position: 'absolute',
            left: (this.plotLeft || 0) + 'px',
            top: (this.plotTop || 0) + 'px',
            width: (this.plotWidth || 0) + 'px',
            height: (this.plotHeight || 0) + 'px',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: 'rgba(0,0,0,0.25)', color: 'var(--color-text)', zIndex: 15
        })
        this.container.appendChild(el)
        this.loadingEl = el
    }

    hideLoading() {
        if (this.loadingEl && this.loadingEl.parentNode)
            this.loadingEl.parentNode.removeChild(this.loadingEl)
        this.loadingEl = null
    }

    getChartSize() {
        const opt = this.options.chart
        const containerWidth = this.container.clientWidth || this.container.offsetWidth || 600
        this.chartWidth = pick(opt.width, containerWidth) || 600
        this.chartHeight = defined(opt.height) ? relativeLength(opt.height, this.chartWidth) : 400
        this.spacing = opt.spacing || [10, 10, 15, 10]
    }

    createAxes() {
        const toArray = v => (Array.isArray(v) ? v : [v || {}])
        const xDefaults = this.options.xAxis
        const yDefaults = this.options.yAxis
        //merge each axis options with the theme-level xAxis/yAxis defaults
        this.xAxis = toArray(this.userOptions.xAxis).map((o, i) =>
            new Axis(this, merge(xDefaults, o), 'xAxis', i))
        if (!this.userOptions.xAxis)
            this.xAxis = [new Axis(this, merge(xDefaults), 'xAxis', 0)]
        this.yAxis = toArray(this.userOptions.yAxis).map((o, i) =>
            new Axis(this, merge(yDefaults, o), 'yAxis', i))
        if (!this.userOptions.yAxis)
            this.yAxis = [new Axis(this, merge(yDefaults), 'yAxis', 0)]
        //default axis type for x: datetime unless overridden (the explorer theme sets datetime)
        for (const ax of this.xAxis) {
            if (!ax.options.type)
                ax.type = 'linear'
        }
        this.axes = [...this.xAxis, ...this.yAxis]
    }

    createSeries() {
        const defaultType = this.options.chart && this.options.chart.type
        this.series = (this.userOptions.series || []).map((o, i) => {
            const opts = (!o.type && defaultType) ? {...o, type: defaultType} : o
            const s = createSeries(this, opts)
            s.index = i
            return s
        })
        for (const s of this.series)
            s.bindAxes()
    }

    //build category list from string x-values when xAxis.type === 'category' and no categories given
    normalizeCategories() {
        const xa = this.xAxis[0]
        if (!xa || xa.type !== 'category' || xa.categories)
            return
        const cats = []
        for (const s of this.series) {
            s.points.forEach((p, i) => {
                if (typeof p.x === 'string') {
                    let idx = cats.indexOf(p.x)
                    if (idx === -1) {
                        idx = cats.length
                        cats.push(p.x)
                    }
                    p.x = idx
                    s.xData[i] = idx
                }
            })
            s.plotPoints = s.points
        }
        xa.categories = cats
    }

    setPlotBox(leftW, rightW, xLabelH, legendH) {
        const [spTop, spRight, spBottom, spLeft] = this.spacing
        this.plotLeft = spLeft + leftW
        this.plotTop = spTop
        this.plotWidth = Math.max(50, this.chartWidth - this.plotLeft - spRight - rightW)
        this.plotHeight = Math.max(50, this.chartHeight - this.plotTop - spBottom - xLabelH - legendH)
    }

    sideWidth(axes) {
        return axes.reduce((m, a) => {
            //labels float inside the plot → reserve only a tiny constant margin, so range/zoom changes
            //(which alter the label text width) never reflow the plot horizontally
            if (a.labelsInside)
                return Math.max(m, 10)
            const hasTitle = !!(a.options.title && a.options.title.text)
            const offset = a.options.offset || 0
            const labelExtent = a.estimateLabelWidth() + 8
            //when offset>0 the (rotated) title sits at the offset distance, parallel to the labels — not
            //beyond them — so the margin is offset + title thickness, NOT labelWidth + title + offset
            const titleExtent = offset > 0
                ? offset + (hasTitle ? 24 : 0)
                : a.estimateLabelWidth() + (hasTitle ? 18 : 0) + 8
            return Math.max(m, labelExtent, titleExtent)
        }, 0)
    }

    layout() {
        //fixed margins (sparklines): chart.margin = [top, right, bottom, left] overrides auto-layout
        const margin = this.options.chart && this.options.chart.margin
        if (margin) {
            const [mt, mr, mb, ml] = margin
            this.plotTop = mt
            this.plotLeft = ml
            this.plotWidth = Math.max(1, this.chartWidth - ml - mr)
            this.plotHeight = Math.max(1, this.chartHeight - mt - mb)
            for (const ax of this.axes) {
                ax.setAxisSize()
                ax.setScale()
                ax.setAxisSize()
            }
            this.processData()
            for (const ax of this.yAxis)
                ax.setScale()
            return
        }
        //navigator occupies a strip below the x-axis labels
        const bottomExtra = this.legend.getHeight() + (this.navigatorEnabled ? 60 : 0)
        const leftAxes = this.yAxis.filter(a => !a.opposite)
        const rightAxes = this.yAxis.filter(a => a.opposite)

        //pass 1 — rough geometry, then group/stack so y-extremes reflect the drawn data
        this.setPlotBox(50, rightAxes.length ? 50 : 10, X_LABEL_HEIGHT, bottomExtra)
        for (const ax of this.axes) {
            ax.setAxisSize()
            ax.setScale()
        }
        this.processData()
        for (const ax of this.yAxis)
            ax.setScale()

        //rotated x-axis labels (long categories) need more vertical room
        const xLabelH = this.xAxis[0].needsRotation() ? 56 : X_LABEL_HEIGHT
        this.xLabelHeight = xLabelH

        //pass 2 — real margins from grouped y-labels
        this.setPlotBox(this.sideWidth(leftAxes), this.sideWidth(rightAxes), xLabelH, bottomExtra)
        for (const ax of this.axes) {
            ax.setAxisSize()
            ax.setScale()
        }
        this.processData()
        for (const ax of this.axes) {
            ax.setAxisSize()
            ax.setScale()
            ax.setAxisSize()
        }
        this.alignYAxes()
        this.adjustXAxisPadding()
    }

    //share gridlines between y-axes that occupy the same pane (aligned ticks): same tick count
    alignYAxes() {
        const groups = new Map()
        for (const a of this.yAxis) {
            if (a.isLog || a.categories || !a.tickPositions || a.tickPositions.length < 2)
                continue
            const key = Math.round(a.top) + '|' + Math.round(a.len)
            if (!groups.has(key))
                groups.set(key, [])
            groups.get(key).push(a)
        }
        for (const list of groups.values()) {
            if (list.length < 2)
                continue
            //zero-based axes already share the fixed 0/20/…/100% grid (6 lines spanning 0..5·interval), so
            //their i-th gridlines coincide by construction — no reconciliation needed (e.g. left 0..400 and
            //right 0..40M both at 0/20/…/100%). Only mixed/non-zero panes need the shared-count pass below.
            if (list.every(a => a.zeroBased))
                continue
            //Shared gridline count AND a common headroom factor, so every axis's i-th tick lands on the
            //exact same pixel line — e.g. left 0,6,12,18,24,30 and right 0,2M,…,10M with 30G and 10M on the
            //same top gridline. Each axis gets a pretty round interval (niceAlignedTicks) for its own count
            //of ticks; then we scale all axes' max by one factor so the top ticks coincide.
            const count = Math.max(3, Math.round((list[0].len || 300) / 72)) + 1
            const specs = list.map(a => {
                const lo = a.options.min !== undefined ? a.options.min : a.dataMin
                const r = niceAlignedTicks(lo, a.dataMax, count)
                return {a, positions: r.positions, interval: r.interval, base: r.min, dataMax: a.dataMax}
            })
            //hide the topmost tick row only when it is pure headroom on EVERY axis (the data sits below it
            //on all of them) — that's the row that crowds the zoom controls. If any axis's data reaches its
            //top tick, keep the row so that gridline still shows (e.g. supply 30G with data at 33G).
            const dropTop = specs.every(s => s.positions[s.positions.length - 1] > s.dataMax * (1 + 1e-9))
            for (const s of specs)
                s.drawn = dropTop ? s.positions.slice(0, -1) : s.positions
            //Express every axis' top edge as the SAME number of tick-steps above its base (M), so the i-th
            //gridline lands on the same pixel line on all of them. M reserves STEP_HEAD of a step of empty
            //space above the topmost drawn tick (so the top value isn't flush against the zoom controls), and
            //is widened if any axis' data pokes above that, so nothing ever clips.
            const STEP_HEAD = 0.7
            let M = 0
            for (const s of specs) {
                const nIntervals = s.drawn.length - 1
                const dataSteps = s.interval > 0 ? (s.dataMax - s.base) / s.interval : nIntervals
                M = Math.max(M, nIntervals + STEP_HEAD, dataSteps + 0.15)
                //keep the data top below the reserved zoom-controls band (see Axis.reservedTopPixels)
                const reserve = s.a.reservedTopPixels()
                if (reserve && s.a.len > reserve * 2)
                    M = Math.max(M, dataSteps / (1 - reserve / s.a.len))
            }
            for (const s of specs) {
                s.a.tickInterval = s.interval
                s.a.tickPositions = s.drawn
                s.a.min = s.base
                s.a.max = s.base + M * s.interval
            }
        }
    }

    //data grouping + column metrics + stacking
    processData() {
        this.applyDataGrouping()
        this.assignColumnMetrics()
        this.computeDataResolution()
        this.applyStacking()
    }

    //tooltip reads it to decide whether a date needs a time component —
    //sub-day candles would otherwise all carry the same header.
    computeDataResolution() {
        let resolution = Infinity
        for (const s of this.series) {
            if (!s.visible)
                continue
            let prevX = null
            for (const pt of s.plotPoints) {
                //skip null markers (e.g. the trailing [now, null…] the price view appends) — they carry
                //no data and would report a gap the series doesn't actually resolve
                if (!isNumber(pt.y) && !isNumber(pt.close))
                    continue
                if (prevX !== null) {
                    const gap = pt.x - prevX
                    if (gap > 0 && gap < resolution) {
                        resolution = gap
                    }
                }
                prevX = pt.x
            }
        }
        this.dataResolution = resolution === Infinity ? null : resolution
    }

    applyDataGrouping() {
        const baseGrouping = this.chartType === 'StockChart' &&
            this.options.plotOptions && this.options.plotOptions.series && this.options.plotOptions.series.dataGrouping
        const xAxis = this.xAxis[0]
        const groupings = this.series.map(s => {
            const seriesGrouping = s.options.dataGrouping
            if (!baseGrouping && !seriesGrouping)
                return null
            const grouping = merge(baseGrouping || {}, seriesGrouping || {})
            if (!isNumber(grouping.groupPixelWidth))
                grouping.groupPixelWidth = defaultGroupPixelWidth(s.type)
            return grouping
        })
        //bucket density follows the VIEWPORT width rather than the (possibly column-constrained)
        //container: a chart squeezed into a half-width dashboard column keeps the same bucket size
        //it would get in a single-column layout, so side-by-side and full-width charts read alike.
        //SINGLE_COLUMN_CHROME ≈ page paddings + axis margins around a full-width plot; the cap keeps
        //very wide monitors from over-refining charts that are themselves capped by the page container
        const SINGLE_COLUMN_CHROME = 238
        const VIRTUAL_WIDTH_CAP = 1100
        const virtualWidth = typeof window === 'undefined'
            ? 0
            : Math.min(window.innerWidth - SINGLE_COLUMN_CHROME, VIRTUAL_WIDTH_CAP)
        const groupingWidth = Math.max(this.plotWidth, virtualWidth)
        let sharedPixelWidth = 0
        let doGrouping = false
        this.series.forEach((s, i) => {
            const grouping = groupings[i]
            if (!grouping || !s.visible)
                return
            sharedPixelWidth = Math.max(sharedPixelWidth, grouping.groupPixelWidth)
            if (grouping.forced || this.countVisiblePoints(s, xAxis) > groupingWidth / grouping.groupPixelWidth)
                doGrouping = true
        })
        this.series.forEach((s, i) => {
            const grouping = groupings[i]
            if (grouping && doGrouping) {
                const defApprox = /column|bar/.test(s.type) ? 'sum' : 'average'
                s.plotPoints = groupSeriesData(s.points, {...grouping, groupPixelWidth: sharedPixelWidth},
                    xAxis.min, xAxis.max, groupingWidth, defApprox)
            } else {
                s.plotPoints = s.points
            }
        })
    }

    //number of points inside the currently visible x-window (grouping density is decided on what's
    //on screen, not the full dataset — so zooming into a sparse period turns grouping off)
    countVisiblePoints(s, xAxis) {
        const {min, max} = xAxis
        if (!isNumber(min) || !isNumber(max))
            return s.points.length
        let count = 0
        for (const p of s.points)
            if (p.x >= min && p.x <= max)
                count++
        return count
    }

    getStacking(s) {
        const po = this.options.plotOptions || {}
        return s.options.stacking || (po[s.type] && po[s.type].stacking) || (po.series && po.series.stacking) || null
    }

    assignColumnMetrics() {
        const colSeries = this.series.filter(s => s.visible && /^(column|bar)$/.test(s.type))
        //group columns per y-axis (pane): columns in different panes are independent, so e.g. a lone
        //volume series fills its slot while Payments+Trades sit side-by-side in the main pane
        const byAxis = new Map()
        for (const s of colSeries) {
            const key = this.yAxis.indexOf(s.yAxis)
            if (!byAxis.has(key))
                byAxis.set(key, [])
            byAxis.get(key).push(s)
        }
        for (const list of byAxis.values()) {
            const stackingActive = list.some(s => this.getStacking(s))
            let visIdx = 0
            for (const s of list) {
                s.columnCount = stackingActive ? 1 : list.length
                s.columnIndex = stackingActive ? 0 : visIdx++
            }
        }
        //chart-wide point range = smallest gap between adjacent points of any "slotted" series
        //(columns/candles), used for bar width AND for x-axis edge padding
        const slotted = this.series.filter(s => s.visible && /^(column|bar|candlestick|ohlc)$/.test(s.type))
        let pr = Infinity
        for (const s of slotted) {
            //only count gaps between drawn points — skip null markers (e.g. the trailing [now, null…] the
            //price view appends), which would otherwise shrink the slot and thin the bars/candles
            let prevX = null
            for (const pt of s.plotPoints) {
                if (!isNumber(pt.y))
                    continue
                if (prevX !== null) {
                    const d = pt.x - prevX
                    if (d > 0 && d < pr) pr = d
                }
                prevX = pt.x
            }
        }
        this.hasSlottedSeries = slotted.length > 0
        this.pointRange = pr === Infinity ? (this.xAxis[0].max - this.xAxis[0].min) / 50 : pr
    }

    //draw a white separator at the boundary between stacked y-axis panes (e.g. Total XLM over Fee Pool)
    renderPaneSeparators() {
        const tops = new Set()
        for (const ax of this.yAxis) {
            //a pane that starts below the plot top is a lower pane → its top is a boundary
            if (isNumber(ax.top) && ax.top > this.plotTop + 1)
                tops.add(Math.round(ax.top))
        }
        if (!tops.size)
            return
        for (const y of tops) {
            this.renderer.line(this.plotLeft, y, this.plotLeft + this.plotWidth, y, {'stroke-width': 1})
                .css({stroke: '#fff', 'stroke-opacity': 0.45}).add(this.axisGroup)
        }
    }

    adjustXAxisPadding() {
        const xa = this.xAxis[0]
        //remember the logical (pre-pad) extremes — the navigator/range-selector operate on THESE so the
        //display padding isn't read back and re-applied each redraw (which would creep the window on drag)
        xa.logicalMin = xa.min
        xa.logicalMax = xa.max
        if (xa.categories)
            return //category axis already pads ±0.5
        const range = xa.max - xa.min
        if (!(range > 0))
            return
        //pad only charts with slotted series (columns/candles), so their edge bars aren't clipped in half;
        //pure line/area charts render flush to the plot edges
        if (!this.hasSlottedSeries || !(this.pointRange > 0))
            return
        const pad = Math.max(this.pointRange / 2, range * 0.02)
        xa.min -= pad
        xa.max += pad
    }

    applyStacking() {
        const groups = new Map()
        for (const s of this.series) {
            const stacking = this.getStacking(s)
            //clear any prior stack values
            for (const p of s.plotPoints) {
                p.stackY = undefined
                p.stackLow = undefined
            }
            //hidden series drop out of the stack entirely, so the remaining series re-stack from 0
            //instead of leaving a floating gap where the hidden one used to be
            if (!stacking || !s.visible)
                continue
            const key = this.yAxis.indexOf(s.yAxis) + '|' + stacking
            if (!groups.has(key))
                groups.set(key, {stacking, list: []})
            groups.get(key).list.push(s)
        }
        for (const {stacking, list} of groups.values()) {
            const totals = new Map()
            if (stacking === 'percent') {
                for (const s of list)
                    for (const p of s.plotPoints)
                        if (isNumber(p.y)) totals.set(p.x, (totals.get(p.x) || 0) + p.y)
            }
            const cum = new Map()
            //stack in REVERSE series order (reversed stacks): the last declared
            //series sits at the bottom, the first on top
            for (const s of [...list].reverse()) {
                for (const p of s.plotPoints) {
                    if (!isNumber(p.y))
                        continue
                    const prev = cum.get(p.x) || 0
                    const next = prev + p.y
                    if (stacking === 'percent') {
                        const tot = totals.get(p.x) || 1
                        p.stackLow = prev / tot * 100
                        p.stackY = next / tot * 100
                    } else {
                        p.stackLow = prev
                        p.stackY = next
                    }
                    cum.set(p.x, next)
                }
            }
            //record the full column total per x so the load animation can fill each stacked column from
            //the baseline as one unit (lower segment finishes first, upper one keeps rising)
            for (const s of list)
                for (const p of s.plotPoints)
                    if (isNumber(p.y))
                        p.stackTotal = stacking === 'percent' ? 100 : cum.get(p.x)
        }
    }

    render() {
        //animate only on the very first paint; redraws (zoom, legend toggle, resize) are instant.
        //honour an explicit animation:false on the chart or series options (e.g. sparklines)
        const chartAnim = this.options.chart && this.options.chart.animation
        const seriesAnim = this.options.plotOptions && this.options.plotOptions.series &&
            this.options.plotOptions.series.animation
        this.animateThisRender = this.animateOnRender !== false && chartAnim !== false && seriesAnim !== false
        this.animateOnRender = false
        //polar/radar charts use a dedicated coordinate path
        if (this.options.chart && this.options.chart.polar) {
            renderPolar(this)
            return
        }
        //pie / variable-pie use a radial sector path
        const chartType = this.options.chart && this.options.chart.type
        if (chartType === 'pie' || chartType === 'variablepie') {
            renderPie(this)
            return
        }
        this.layout()
        const renderer = this.renderer

        //plot background
        renderer.rect(this.plotLeft, this.plotTop, this.plotWidth, this.plotHeight)
            .css({fill: 'transparent'}).add(renderer.root)

        //groups (draw order: gridlines, series, axes/labels, legend)
        this.gridGroup = renderer.group('ix-grid').add(renderer.root)
        const clipId = uniqueId('plotclip')
        const clipRef = renderer.clipRect(this.plotLeft, this.plotTop - 2, this.plotWidth, this.plotHeight + 4, clipId)
        this.seriesGroup = renderer.group('ix-series').attr('clip-path', clipRef).add(renderer.root)
        this.axisGroup = renderer.group('ix-axes').add(renderer.root)
        this.legendGroup = renderer.group('ix-legend').add(renderer.root)

        //axes (y first for gridlines under, then x)
        for (const ax of this.yAxis)
            ax.render(this.gridGroup, this.axisGroup)
        for (const ax of this.xAxis)
            ax.render(this.gridGroup, this.axisGroup)

        //white separator line between stacked y-axis panes (multi-pane / dual charts)
        this.renderPaneSeparators()

        //series sorted by z-index
        const ordered = this.series.slice().sort((a, b) => a.zIndex - b.zIndex)
        for (const s of ordered) {
            if (!s.visible)
                continue
            s.translate()
            const g = renderer.group('ix-series-' + s.index).add(this.seriesGroup)
            s.render(g)
        }

        this.legend.render(this.legendGroup)
        if (this.navigator) {
            const navGroup = renderer.group('ix-navigator').add(renderer.root)
            const navTop = this.plotTop + this.plotHeight + (this.xLabelHeight || X_LABEL_HEIGHT) + 6
            this.navigator.render(navGroup, navTop, 32)
        }
        this.tooltip.bind()
        this.zoomSelection.bind()
        if (this.rangeSelector)
            this.rangeSelector.reposition()
    }

    redraw() {
        //clear and re-render into the same container
        this.tooltip.destroy()
        this.zoomSelection.destroy()
        this.renderer.destroy()
        this.renderer = new SvgRenderer(this.container, this.chartWidth, this.chartHeight)
        this.render()
    }

    bindResize() {
        if (typeof ResizeObserver !== 'undefined') {
            let raf
            this.resizeObserver = new ResizeObserver(() => {
                cancelAnimationFrame(raf)
                raf = requestAnimationFrame(() => this.reflow())
            })
            this.resizeObserver.observe(this.container)
        }
        //mobile rotation (portrait↔landscape) often settles a frame or two AFTER the event fires, so the
        //ResizeObserver may read a transient size — reflow again on the next frame to catch the final layout
        if (typeof window !== 'undefined') {
            this.onOrientation = () => requestAnimationFrame(() => this.reflow())
            window.addEventListener('orientationchange', this.onOrientation)
        }
    }

    reflow() {
        if (!this.container)
            return
        const prevWidth = this.chartWidth
        const prevHeight = this.chartHeight
        this.getChartSize()
        //redraw when EITHER dimension changed meaningfully (height matters for %-height/orientation charts);
        //the 2px deadband absorbs sub-pixel ResizeObserver noise that would otherwise cause a redraw storm
        if (Math.abs(this.chartWidth - prevWidth) < 2 && Math.abs(this.chartHeight - prevHeight) < 2)
            return
        this.redraw()
    }

    destroy() {
        for (const ax of (this.axes || []))
            if (ax.extremesTimer)
                clearTimeout(ax.extremesTimer)
        if (this.resizeObserver)
            this.resizeObserver.disconnect()
        if (this.onOrientation && typeof window !== 'undefined')
            window.removeEventListener('orientationchange', this.onOrientation)
        if (this.rangeSelector)
            this.rangeSelector.destroy()
        if (this.tooltip)
            this.tooltip.destroy()
        if (this.zoomSelection)
            this.zoomSelection.destroy()
        if (this.renderer)
            this.renderer.destroy()
        this.container = null
    }
}
