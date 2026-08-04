const compiledCache = new Map()

/**
 * Escape regex-special characters in a static path fragment
 * @param {string} str
 * @return {string}
 * @private
 */
function escapeRegExp(str) {
    return str.replace(/[.+*?^$()[\]{}|\\]/g, '\\$&')
}

/**
 * Compile a route pattern into a cached matcher regexp
 * @param {string} pattern - Route pattern, e.g. `/explorer/:network/asset/:asset`
 * @param {boolean} [exact] - Match the whole pathname rather than a prefix
 * @return {{regexp: RegExp, paramNames: string[]}}
 */
export function compilePath(pattern, exact = false) {
    const cacheKey = `${pattern}|${exact}`
    const cached = compiledCache.get(cacheKey)
    if (cached)
        return cached
    //strip a single trailing slash so it becomes optional (react-router strict:false); root `/` collapses to ''
    let normalized = pattern
    if (normalized.endsWith('/'))
        normalized = normalized.slice(0, -1)
    //substitute `:param` tokens with capture groups, escaping the static runs in between
    const paramNames = []
    const paramRegex = /:([A-Za-z0-9_]+)/g
    let source = '',
        lastIndex = 0,
        token
    while ((token = paramRegex.exec(normalized)) !== null) {
        source += escapeRegExp(normalized.slice(lastIndex, token.index)) + '([^/]+)'
        paramNames.push(token[1])
        lastIndex = token.index + token[0].length
    }
    source += escapeRegExp(normalized.slice(lastIndex))
    //exact anchors the end (with optional trailing slash); prefix mode requires a segment boundary via lookahead
    const suffix = exact ? '\\/?$' : '(?=\\/|$)'
    const compiled = {regexp: new RegExp('^' + source + suffix, 'i'), paramNames}
    compiledCache.set(cacheKey, compiled)
    return compiled
}

/**
 * Match a pathname against a route pattern
 * @param {string} pathname - Current location pathname
 * @param {{path?: string, exact?: boolean}} [options] - Matching options
 * @return {RouteMatch|null} Match descriptor, or null when the pattern doesn't match
 */
export function matchPath(pathname, options = {}) {
    const {path = '/', exact = false} = options
    const {regexp, paramNames} = compilePath(path, exact)
    const match = regexp.exec(pathname)
    if (!match)
        return null
    const [rawUrl, ...values] = match
    //empty match (root prefix) represents the site root
    const url = rawUrl === '' ? '/' : rawUrl
    const params = {}
    for (let i = 0; i < paramNames.length; i++) {
        //do not decode params - preserves case-sensitive values verbatim (matches react-router v5)
        params[paramNames[i]] = values[i]
    }
    return {path, url, params, isExact: pathname === url}
}

/**
 * Build the implicit root match used as the default router context match
 * @param {string} pathname - Current location pathname
 * @return {RouteMatch}
 */
export function computeRootMatch(pathname) {
    return {path: '/', url: '/', params: {}, isExact: pathname === '/'}
}

/**
 * @typedef {import('./router-context.js').RouteMatch} RouteMatch
 */
