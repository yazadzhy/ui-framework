import {pick, isNumber} from '../core/utilities'

//cubic-bezier smoothing for spline/areaspline series.
const SPLINE_SMOOTHING = 1.5
const SPLINE_DENOM = SPLINE_SMOOTHING + 1

//control points on either side of pts[i], as {left, right} pairs (endpoints have none — the segment
//touching them is controlled by the point itself, giving a straight run into the edge)
function splineControlPoints(pts) {
    const left = []
    const right = []
    for (let i = 0; i < pts.length; i++) {
        const {plotX, plotY} = pts[i]
        const prev = pts[i - 1]
        const next = pts[i + 1]
        if (!prev || !next) {
            left[i] = right[i] = {x: plotX, y: plotY}
            continue
        }
        const lastY = prev.plotY
        const nextY = next.plotY
        const lx = (SPLINE_SMOOTHING * plotX + prev.plotX) / SPLINE_DENOM
        const rx = (SPLINE_SMOOTHING * plotX + next.plotX) / SPLINE_DENOM
        let ly = (SPLINE_SMOOTHING * plotY + lastY) / SPLINE_DENOM
        let ry = (SPLINE_SMOOTHING * plotY + nextY) / SPLINE_DENOM
        if (rx !== lx) {
            const correction = (ry - ly) * (rx - plotX) / (rx - lx) + plotY - ry
            ly += correction
            ry += correction
        }
        if (ly > lastY && ly > plotY) {
            ly = Math.max(lastY, plotY)
            ry = 2 * plotY - ly
        } else if (ly < lastY && ly < plotY) {
            ly = Math.min(lastY, plotY)
            ry = 2 * plotY - ly
        }
        if (ry > nextY && ry > plotY) {
            ry = Math.max(nextY, plotY)
            ly = 2 * plotY - ry
        } else if (ry < nextY && ry < plotY) {
            ry = Math.min(nextY, plotY)
            ly = 2 * plotY - ry
        }
        left[i] = {x: lx, y: ly}
        right[i] = {x: rx, y: ry}
    }
    return {left, right}
}

//the run of cubic-bezier commands from pts[0] to the last point, without a leading moveto — the area
//fill traces the very same curve as the line drawn on top of it, just starting from the baseline
export function smoothSegmentCurves(pts) {
    const {left, right} = splineControlPoints(pts)
    let d = ''
    for (let i = 1; i < pts.length; i++) {
        const c1 = right[i - 1]
        const c2 = left[i]
        d += `C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${pts[i].plotX} ${pts[i].plotY} `
    }
    return d
}

function smoothSegmentPath(pts) {
    return `M ${pts[0].plotX} ${pts[0].plotY} ` + smoothSegmentCurves(pts)
}

export class Series {
    constructor(chart, options) {
        this.chart = chart
        this.options = options
        this.type = options.type || 'line'
        this.name = options.name
        this.visible = options.visible !== false
        this.index = 0 //creation order, assigned by chart
        //area/column rest on a zero baseline by default (the series `threshold`), pulling the axis to 0
        this.threshold = options.threshold !== undefined ? options.threshold
            : (/^(area|areaspline|column|bar)$/.test(this.type) ? 0 : null)
        this.setData(options.data || [])
    }

    setData(data) {
        this.xData = []
        this.yData = []
        this.points = []
        for (const p of data) {
            let x, y, point
            if (Array.isArray(p)) {
                if (p.length >= 5) {
                    //OHLC tuple [x, open, high, low, close]
                    x = p[0]
                    y = p[4]
                    point = {x, y, open: p[1], high: p[2], low: p[3], close: p[4]}
                } else {
                    x = p[0]
                    y = p[1]
                    point = {x, y}
                }
            } else if (p && typeof p === 'object') {
                x = pick(p.x, this.points.length)
                y = p.y
                point = {...p, x, y}
            } else {
                x = this.points.length
                y = p
                point = {x, y}
            }
            this.xData.push(x)
            this.yData.push(y)
            point.series = this
            this.points.push(point)
        }
        //points actually drawn — replaced by the grouped set when data grouping is active
        this.plotPoints = this.points
        //live data update (e.g. lazy-loaded finer candles on zoom) — repaint. Skipped during the initial
        //series construction, when the chart hasn't rendered yet.
        if (this.chart && this.chart.hasRendered)
            this.chart.redraw()
    }

    bindAxes() {
        this.xAxis = this.chart.xAxis[0]
        const yIdx = isNumber(this.options.yAxis) ? this.options.yAxis : 0
        this.yAxis = this.chart.yAxis[yIdx] || this.chart.yAxis[0]
        this.xAxis.series.push(this)
        this.yAxis.series.push(this)
    }

    get colorIndex() {
        return pick(this.options.colorIndex, this.index)
    }

    get zIndex() {
        return pick(this.options.index, this.index)
    }

    //resolve a plot option through the option cascade: per-series → plotOptions[type] → plotOptions.series
    //(e.g. `step`/`connectNulls` are commonly set once on plotOptions.series and inherited by every series)
    resolveOption(name, fallback) {
        const po = this.chart.options.plotOptions || {}
        return pick(this.options[name], (po[this.type] || {})[name], (po.series || {})[name], fallback)
    }

    getColor() {
        if (this.options.color)
            return this.options.color
        const colors = this.chart.options.colors || []
        return colors[this.colorIndex % colors.length] || '#08B5E5'
    }

    translate() {
        for (const pt of this.plotPoints) {
            pt.plotX = this.xAxis.toPixels(pt.x)
            pt.plotY = isNumber(pt.y) ? this.yAxis.toPixels(isNumber(pt.stackY) ? pt.stackY : pt.y) : null
            pt.plotBottom = isNumber(pt.stackLow) ? this.yAxis.toPixels(pt.stackLow) : null
        }
    }

    isSmoothSegment(seg) {
        return (this.type === 'spline' || this.type === 'areaspline') && seg.length > 1
    }

    //build an SVG path "d" from plotted points (M/L), breaking on nulls unless connectNulls
    linePath(closePathToBaseline) {
        const connectNulls = this.resolveOption('connectNulls', false)
        const step = this.resolveOption('step')
        const segments = []
        let current = []
        for (const pt of this.plotPoints) {
            if (pt.plotY === null) {
                if (!connectNulls) {
                    if (current.length) segments.push(current)
                    current = []
                    continue
                }
                continue
            }
            current.push(pt)
        }
        if (current.length) segments.push(current)
        this.segments = segments

        let d = ''
        for (const seg of segments) {
            if (this.isSmoothSegment(seg)) {
                d += smoothSegmentPath(seg)
            } else {
                seg.forEach((pt, i) => {
                    if (i === 0) {
                        d += `M ${pt.plotX} ${pt.plotY} `
                    } else if (step === 'left') {
                        d += `L ${pt.plotX} ${seg[i - 1].plotY} L ${pt.plotX} ${pt.plotY} `
                    } else if (step === 'right') {
                        d += `L ${seg[i - 1].plotX} ${pt.plotY} L ${pt.plotX} ${pt.plotY} `
                    } else {
                        d += `L ${pt.plotX} ${pt.plotY} `
                    }
                })
            }
        }
        return d.trim()
    }

    render() {
        //overridden by subclasses
    }

    destroy() {
        if (this.group)
            this.group.destroy()
    }
}
