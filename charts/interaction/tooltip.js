import {dateFormat} from '../core/time'
import {isNumber, addThousandsSep} from '../core/utilities'

function formatValue(v, tooltipOpts) {
    if (!isNumber(v))
        return '—'
    let s
    if (tooltipOpts && isNumber(tooltipOpts.valueDecimals)) {
        s = v.toFixed(tooltipOpts.valueDecimals)
    } else {
        s = String(Math.round(v * 1000) / 1000)
    }
    s = addThousandsSep(s)
    if (tooltipOpts && tooltipOpts.valuePrefix)
        s = tooltipOpts.valuePrefix + s
    if (tooltipOpts && tooltipOpts.valueSuffix)
        s += tooltipOpts.valueSuffix
    return s
}

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY

const GROUP_UNIT_MS = {millisecond: 1, second: SECOND, minute: MINUTE, hour: HOUR, day: DAY, week: WEEK}

/**
 * Point holds a value to report — axis-stretching markers like [now, null…] don't
 * @param {{}} point
 * @return {boolean}
 */
export function hasValue(point) {
    return !!point && (isNumber(point.y) || isNumber(point.close))
}

/**
 * Nearest point of a series that actually has a value.
 * @param {Series} series
 * @param {number} xVal
 * @return {{}|null}
 */
export function nearestPoint(series, xVal) {
    let best = null
    let bestDistance = Infinity
    for (const p of series.plotPoints) {
        if (!hasValue(p))
            continue
        const distance = Math.abs(p.x - xVal)
        if (distance < bestDistance) {
            bestDistance = distance
            best = p
        }
    }
    return best
}

/**
 * How much time a single plotted point covers — the data-grouping bucket when grouping is active
 * (authoritative even where the data is sparse), otherwise the measured spacing of the drawn points.
 * @param {{}} point - hovered point
 * @param {Chart} chart
 * @return {number} bucket length in ms (Infinity when a day or coarser)
 */
export function pointResolution(point, chart) {
    const unit = point && point.groupUnit
    if (unit) {
        //month/year buckets are always coarser than a day, so they need no time component
        const unitMs = GROUP_UNIT_MS[unit]
        return unitMs === undefined ? Infinity : unitMs * (point.groupMult || 1)
    }
    return isNumber(chart.dataResolution) ? chart.dataResolution : Infinity
}

//Header for a hovered point: a single instant, or the grouped bucket range ("September-October 2021")
//when data grouping carries a unit/multiple on the point.
export function pointHeader(point, key, xAxis, resolution) {
    if (xAxis.type !== 'datetime')
        return xAxis.categories ? xAxis.categories[key] : key
    const unit = point && point.groupUnit
    const mult = (point && point.groupMult) || 1
    const d = new Date(key)
    if (unit === 'year')
        return mult > 1 ? `${d.getUTCFullYear()}-${d.getUTCFullYear() + mult - 1}` : `${d.getUTCFullYear()}`
    if (unit === 'month') {
        if (mult <= 1)
            return dateFormat('%B %Y', key)
        const end = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + mult - 1, 1)
        return `${dateFormat('%B', key)}-${dateFormat('%B', end)} ${new Date(end).getUTCFullYear()}`
    }
    if ((unit === 'week' || unit === 'day') && mult * (unit === 'week' ? 7 : 1) > 1) {
        const span = (unit === 'week' ? 7 : 1) * mult
        return `${dateFormat('%b %e', key)} - ${dateFormat('%b %e, %Y', key + (span - 1) * DAY)}`
    }
    if (resolution < MINUTE)
        return dateFormat('%b %e, %Y %H:%M:%S', key)
    if (resolution < DAY)
        return dateFormat('%b %e, %Y %H:%M', key)
    //a whole day or coarser — the date identifies the point on its own
    return dateFormat('%b %e, %Y', key)
}

export class Tooltip {
    constructor(chart) {
        this.chart = chart
    }

    bind() {
        const chart = this.chart
        if (!chart.options.tooltip.enabled)
            return
        this.overlay = chart.renderer.group('ix-tooltip-overlay').add(chart.renderer.root)
        this.box = document.createElement('div')
        Object.assign(this.box.style, {
            position: 'absolute',
            pointerEvents: 'none',
            zIndex: 20,
            display: 'none',
            background: 'rgba(247,247,247,0.85)',
            border: '1px solid var(--color-border-shadow)',
            borderRadius: '3px',
            padding: '5px 8px',
            font: '12px Roboto Condensed,sans-serif',
            color: '#15171a',
            whiteSpace: 'nowrap',
            boxShadow: '0 1px 6px rgba(0,0,0,0.3)'
        })
        chart.container.appendChild(this.box)
        this.svg = chart.renderer.root.element
        this.moveHandler = e => this.onMove(e)
        this.leaveHandler = () => this.hide()
        this.svg.addEventListener('mousemove', this.moveHandler)
        this.svg.addEventListener('mouseleave', this.leaveHandler)
    }

    onMove(e) {
        const chart = this.chart
        const rect = this.svg.getBoundingClientRect()
        const scaleX = chart.chartWidth / rect.width
        const mx = (e.clientX - rect.left) * scaleX
        const my = (e.clientY - rect.top) * (chart.chartHeight / rect.height)
        if (mx < chart.plotLeft || mx > chart.plotLeft + chart.plotWidth ||
            my < chart.plotTop || my > chart.plotTop + chart.plotHeight) {
            this.hide()
            return
        }
        const xAxis = chart.xAxis[0]
        const span = (xAxis.max - xAxis.min) || 1
        const xVal = xAxis.min + ((mx - xAxis.left) / xAxis.len) * span

        //snap to the nearest DRAWN point (grouped buckets / columns), so the crosshair jumps column-to-column
        //and the tooltip reports the group value — not the raw ungrouped sample
        let key = null
        for (const s of chart.series) {
            if (!s.visible || !s.plotPoints.length) continue
            const best = nearestPoint(s, xVal)
            if (best) { key = best.x; break }
        }
        if (key === null) { this.hide(); return }

        const rows = []
        const markers = []
        for (const s of chart.series) {
            if (!s.visible) continue
            const best = nearestPoint(s, key)
            if (best && isNumber(best.y)) {
                //series-level tooltip wins; fall back to the chart-level tooltip (e.g. OHLC pointFormatter)
                const tOpts = s.options.tooltip || chart.options.tooltip
                if (tOpts && typeof tOpts.pointFormatter === 'function') {
                    rows.push(`<div><span style="color:${s.getColor()}">●</span> ${tOpts.pointFormatter.call(best)}</div>`)
                } else {
                    rows.push(`<div><span style="color:${s.getColor()}">●</span> ${s.name || ''}: <b>${formatValue(best.y, tOpts)}</b></div>`)
                }
                markers.push({s, p: best})
            }
        }
        if (!rows.length) { this.hide(); return }

        //crosshair
        const cx = xAxis.toPixels(key)
        this.overlay.element.innerHTML = ''
        if (chart.options.tooltip.crosshairs !== false && xAxis.options.crosshair !== false) {
            chart.renderer.line(cx, chart.plotTop, cx, chart.plotTop + chart.plotHeight, {'stroke-width': 1})
                .css({stroke: 'var(--color-text)', 'stroke-opacity': 0.55}).add(this.overlay)
        }
        //highlight the hovered point — only on line/area series (columns show via the crosshair),
        //a single point marker
        for (const {s, p} of markers) {
            if (/^(column|bar)$/.test(s.type))
                continue
            if (!isNumber(p.plotX) || !isNumber(p.plotY))
                continue
            const color = s.getColor()
            //translucent halo behind the point
            chart.renderer.circle(p.plotX, p.plotY, 8, {})
                .css({fill: color, 'fill-opacity': 0.25, stroke: 'none'})
                .add(this.overlay)
            //the point marker: series-color fill with a white ring
            chart.renderer.circle(p.plotX, p.plotY, 4, {})
                .css({fill: color, stroke: '#fff', 'stroke-width': 2})
                .add(this.overlay)
        }

        const headerPoint = markers[0] && markers[0].p
        const header = pointHeader(headerPoint, key, xAxis, pointResolution(headerPoint, chart))
        this.box.innerHTML = `<div style="opacity:.7;margin-bottom:2px">${header}</div>` + rows.join('')
        this.box.style.display = 'block'

        //position relative to container, flip side past mid-plot
        const boxRect = this.box.getBoundingClientRect()
        const pxCss = cx / scaleX
        const left = pxCss > rect.width / 2 ? pxCss - boxRect.width - 14 : pxCss + 14
        const top = Math.max(4, (e.clientY - rect.top) - boxRect.height / 2)
        this.box.style.left = left + 'px'
        this.box.style.top = top + 'px'
    }

    hide() {
        if (this.box)
            this.box.style.display = 'none'
        if (this.overlay)
            this.overlay.element.innerHTML = ''
    }

    destroy() {
        if (this.svg) {
            this.svg.removeEventListener('mousemove', this.moveHandler)
            this.svg.removeEventListener('mouseleave', this.leaveHandler)
        }
        if (this.box && this.box.parentNode)
            this.box.parentNode.removeChild(this.box)
        this.box = null
    }
}
