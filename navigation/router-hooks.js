import React, {useContext, forwardRef} from 'react'
import {RouterContext} from './router-context'

/**
 * Access the current location. Re-renders the caller on every navigation.
 * @return {import('history').Location}
 */
export function useLocation() {
    return useContext(RouterContext).location
}

/**
 * Access the params of the closest matched route.
 * @return {Object<string,string>}
 */
export function useParams() {
    const context = useContext(RouterContext)
    return context.match ? context.match.params : {}
}

/**
 * Access the closest ancestor route match (`{path, url, params, isExact}`).
 * @return {RouteMatch}
 */
export function useRouteMatch() {
    return useContext(RouterContext).match
}

//static keys that must not be copied onto the withRouter wrapper
const nonHoistedStatics = {
    length: 1, name: 1, prototype: 1, caller: 1, callee: 1, arguments: 1, arity: 1,
    propTypes: 1, defaultProps: 1, displayName: 1, WrappedComponent: 1
}

/**
 * Copy custom static members from the wrapped component
 * @param {Object} target
 * @param {Object} source
 * @return {Object} target
 * @private
 */
function hoistStatics(target, source) {
    for (const key of Object.getOwnPropertyNames(source)) {
        if (nonHoistedStatics[key])
            continue
        const descriptor = Object.getOwnPropertyDescriptor(source, key)
        if (descriptor && descriptor.configurable) {
            Object.defineProperty(target, key, descriptor)
        }
    }
    return target
}

/**
 * Higher-order component injecting `{history, location, match}` from the router context.
 * @param {React.ComponentType} Component - Component to wrap
 * @return {React.ComponentType}
 */
export function withRouter(Component) {
    const Wrapper = forwardRef(function (props, ref) {
        const {history, location, match} = useContext(RouterContext)
        return React.createElement(Component, {...props, history, location, match, ref})
    })
    Wrapper.displayName = `withRouter(${Component.displayName || Component.name || 'Component'})`
    Wrapper.WrappedComponent = Component
    return hoistStatics(Wrapper, Component)
}

/**
 * @typedef {import('./router-context.js').RouteMatch} RouteMatch
 */
