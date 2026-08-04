import {createContext} from 'react'

/**
 * Shared router context propagated by `Router`/`Route`/`Switch` and consumed by routing hooks and `withRouter`.
 * @type {React.Context<RouterContextValue>}
 */
export const RouterContext = createContext(null)

RouterContext.displayName = 'Router'

/**
 * @typedef {Object} RouteMatch
 * @property {string} path - Route pattern that matched (e.g. `/explorer/:network/asset/:asset`)
 * @property {string} url - Portion of the pathname consumed by the match
 * @property {Object<string,string>} params - Captured route params
 * @property {boolean} isExact - Whether the pattern matched the pathname exactly
 */

/**
 * @typedef {Object} RouterContextValue
 * @property {import('history').History} history - Shared history instance
 * @property {import('history').Location} location - Current location
 * @property {RouteMatch} match - Closest ancestor route match
 */
