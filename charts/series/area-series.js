import {pick, uniqueId, isNumber, clamp} from '../core/utilities'
import {revealLeftToRight} from '../core/animate'
import {LineSeries} from './line-series'
import {smoothSegmentCurves} from './series'

export class AreaSeries extends LineSeries {
    resolveFill() {
        const seriesFill = this.options.fillColor
        const areaDefaults = (this.chart.options.plotOptions.area) || {}
        const fc = seriesFill !== undefined ? seriesFill : areaDefaults.fillColor
        //fillColor: null -> tint of the series color (used by stacked-percent distribution)
        if (fc === null || fc === undefined)
            return {fill: this.getColor(), opacity: 0.5}
        //gradient object {linearGradient:{x1,y1,x2,y2}, stops:[[off,col],...]}
        if (typeof fc === 'object' && fc.stops) {
            const v = fc.linearGradient || {x1: 0, y1: 0, x2: 0, y2: 1}
            const ref = this.chart.renderer.linearGradient(v, fc.stops, uniqueId('grad'))
            return {fill: ref, opacity: 1}
        }
        return {fill: fc, opacity: 1}
    }

    //fill path — the line path closed down to the axis baseline.
    areaPath() {
        const step = this.resolveOption('step')
        const tVal = isNumber(this.threshold) ? this.threshold : this.yAxis.min
        const baselineY = this.yAxis.toPixels(clamp(tVal, this.yAxis.min, this.yAxis.max))
        let d = ''
        for (const seg of this.segments) {
            const first = seg[0]
            const last = seg[seg.length - 1]
            //rise from the baseline to the first point, trace the top edge, drop back down
            d += `M ${first.plotX} ${baselineY} L ${first.plotX} ${first.plotY} `
            if (this.isSmoothSegment(seg)) {
                //areaspline: the same bezier run the line uses
                d += smoothSegmentCurves(seg)
            } else {
                for (let i = 1; i < seg.length; i++) {
                    const pt = seg[i]
                    if (step === 'left') {
                        d += `L ${pt.plotX} ${seg[i - 1].plotY} `
                    } else if (step === 'right') {
                        d += `L ${seg[i - 1].plotX} ${pt.plotY} `
                    }
                    d += `L ${pt.plotX} ${pt.plotY} `
                }
            }
            d += `L ${last.plotX} ${baselineY} Z `
        }
        return d.trim()
    }

    render(group) {
        this.group = group
        const renderer = this.chart.renderer
        const color = this.getColor()
        const lineWidth = pick(this.options.lineWidth, this.chart.options.plotOptions.series.lineWidth, 2)

        const lineD = this.linePath()
        if (lineD && this.segments.length) {
            const {fill, opacity} = this.resolveFill()
            renderer.path(this.areaPath(), {'stroke-width': 0}).css({fill, 'fill-opacity': opacity}).add(group)
            //line on top
            renderer.path(lineD, {'stroke-width': lineWidth, fill: 'none', 'stroke-linejoin': 'round'}).css({stroke: color}).add(group)
            if (this.chart.animateThisRender)
                revealLeftToRight(this.chart, group)
        }
    }
}
