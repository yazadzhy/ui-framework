import React, {useState, useEffect, useLayoutEffect, useContext} from 'react'
import PropTypes from 'prop-types'
import {createPath} from 'history'
import {history as defaultHistory} from './history'
import {RouterContext} from './router-context'
import {matchPath, computeRootMatch} from './route-matcher'

/**
 * Top-level router. Subscribes to a shared history instance and propagates the current location via context.
 * @param {Object} props
 * @param {import('history').History} [props.history] - History instance
 * @param {*} props.children
 */
export function Router({history = defaultHistory, children}) {
    const [location, setLocation] = useState(history.location)

    useLayoutEffect(() => {
        const unlisten = history.listen(({location}) => setLocation(location))
        //reconcile if the location changed between the initial render and this effect commit
        if (history.location !== location)
            setLocation(history.location)
        return unlisten
    }, [history])

    return <RouterContext.Provider value={{history, location, match: computeRootMatch(location.pathname)}}>
        {children}
    </RouterContext.Provider>
}

Router.propTypes = {
    history: PropTypes.object,
    children: PropTypes.node
}

/**
 * Renders UI component when the current location matches `path`.
 * @param {Object} props
 * @param {string} [props.path] - Route pattern; when omitted the route always matches (fallback)
 * @param {boolean} [props.exact] - Require an exact pathname match
 * @param {React.ComponentType} [props.component] - Component to render with `{history, location, match}` props
 * @param {*} [props.children] - Elements to render (alternative to `component`)
 * @param {RouteMatch} [props.computedMatch] - Pre-computed match injected by `RouterSwitch`
 * @param {import('history').Location} [props.location] - Location override injected by `RouterSwitch`
 */
export function Route({path, exact = false, component, children, computedMatch, location: locationProp}) {
    const context = useContext(RouterContext)
    const location = locationProp || context.location
    const match = computedMatch || (path ? matchPath(location.pathname, {path, exact}) : context.match)
    if (!match)
        return null
    const props = {history: context.history, location, match}
    const content = component ? React.createElement(component, props) : (children || null)
    return <RouterContext.Provider value={{history: context.history, location, match}}>
        {content}
    </RouterContext.Provider>
}

Route.propTypes = {
    path: PropTypes.string,
    exact: PropTypes.bool,
    component: PropTypes.elementType,
    children: PropTypes.node
}

/**
 * Renders the first child `Route`/`Redirect` with path matching the current location.
 * @param {Object} props
 * @param {*} props.children
 * @param {import('history').Location} [props.location] - Location override
 */
export function RouterSwitch({children, location: locationProp}) {
    const context = useContext(RouterContext)
    const location = locationProp || context.location
    let element = null,
        match = null
    React.Children.forEach(children, child => {
        if (match == null && React.isValidElement(child)) {
            const path = child.props.path ?? child.props.from
            const childMatch = path == null ? context.match : matchPath(location.pathname, {path, exact: child.props.exact})
            if (childMatch) {
                element = child
                match = childMatch
            }
        }
    })
    return match ? React.cloneElement(element, {location, computedMatch: match}) : null
}

RouterSwitch.propTypes = {
    children: PropTypes.node
}

/**
 * redirects to another location.
 * @param {Object} props
 * @param {string} props.to - Target URL
 * @param {boolean} [props.push] - Push a new history entry instead of replacing the current one
 * @param {string} [props.from] - Source pattern (used by `Switch` for matching)
 */
export function Redirect({to, push = false}) {
    const {history} = useContext(RouterContext)
    useEffect(() => {
        //skip when already at the target to avoid redirect loops
        if (createPath(history.location) === to)
            return
        if (push) {
            history.push(to)
        } else {
            history.replace(to)
        }
    }, [to, push])
    return null
}

Redirect.propTypes = {
    to: PropTypes.string.isRequired,
    push: PropTypes.bool,
    from: PropTypes.string,
    exact: PropTypes.bool
}

/**
 * @typedef {import('./router-context.js').RouteMatch} RouteMatch
 */
