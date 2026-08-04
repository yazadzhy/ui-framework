import React, {useRef} from 'react'
import cn from 'classnames'
import PropTypes from 'prop-types'
import {useDeepEffect} from '../state/state-hooks'
import {withErrorBoundary} from '../errors/error-boundary'
import {ChartEngine} from './chart-default-options'
import {prepareChartOptions} from './chart-options-builder'
import {ChartLoader} from './chart-loader'
import './chart.scss'

export {ChartEngine, ChartLoader}

/**
 * Pure-JS SVG charting component (zero external dependencies)
 * @param {Object} props
 * @param {{}} props.options - Chart data and options
 * @param {'Chart'|'StockChart'} [props.type] - Chart type (`StockChart` adds navigator/range-selector support)
 * @param {String|JSX.Element} [props.title] - Chart title rendered above the plot
 * @param {Boolean} [props.inline] - Render the chart as inline-block (for sparkline charts)
 * @param {Boolean} [props.grouped] - Apply data grouping (downsample dense series into time buckets)
 * @param {true|false|'year'|'month'} [props.range] - Enable the range selector / initial visible window
 * @param {Boolean} [props.noLegend] - Hide the legend section
 * @param {String} [props.container] - Container CSS class (defaults to `segment blank`)
 * @param {String} [props.className] - Additional CSS classes
 * @param {{}} [props.style] - Additional inline styles
 * @param {Function[]} [props.modules] - Additional engine modules to register (`module(engine)`)
 * @param {*} [props.children] - Optional content added to the chart header
 * @constructor
 */
export function Chart({
                          options,
                          type = 'Chart',
                          title,
                          inline,
                          grouped,
                          range,
                          noLegend,
                          container = 'segment blank',
                          className,
                          style,
                          modules,
                          children
                      }) {
    const chart = useRef(null)
    const chartIdRef = useRef(`ixchart${Math.floor(Math.random() * 0x10000000000000)}`)

    //deep-compare deps so a re-render with a freshly-built (but equal) options object doesn't tear down
    //and recreate the chart — only real option/type changes rebuild it
    useDeepEffect(() => {
        if (chart.current) {
            chart.current.destroy()
            chart.current = null
        }
        if (!options)
            return
        const mergedOptions = prepareChartOptions(options, {grouped, range, noLegend, modules, inline})
        chart.current = new ChartEngine[type](chartIdRef.current, mergedOptions)
        return () => {
            if (chart.current) {
                chart.current.destroy()
                chart.current = null
            }
        }
    }, [options, modules, type, inline, title])

    if (!options)
        return <ChartLoader title={title}/>

    const containerStyle = {...style}
    if (inline) {
        containerStyle.display = 'inline-block'
        return <div id={chartIdRef.current} style={containerStyle}/>
    }
    return <div className={cn('chart', container, className)} style={containerStyle}>
        {!!title && <h3>{title}</h3>}
        {children}
        <hr className="flare"/>
        <div className="v-center-block">
            <div id={chartIdRef.current}/>
        </div>
    </div>
}

Chart.propTypes = {
    options: PropTypes.object,
    type: PropTypes.oneOf(['StockChart', 'Chart']),
    title: PropTypes.any,
    noLegend: PropTypes.bool,
    grouped: PropTypes.bool,
    range: PropTypes.oneOf([true, false, 'year', 'month']),
    inline: PropTypes.bool,
    container: PropTypes.string,
    className: PropTypes.string,
    style: PropTypes.object,
    modules: PropTypes.arrayOf(PropTypes.func)
}

Chart.Loader = ChartLoader
Chart.withErrorBoundary = withErrorBoundary
