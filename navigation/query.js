import {history} from './history'

/**
 * Convert parameters object into query string
 * @param {{}} query
 * @return {string}
 */
export function stringifyQuery(query) {
    if (!query)
        return ''
    const q = [],
        entries = Object.entries(query)
    entries.sort(defaultComparator)
    for (let [key, value] of entries) {
        if (value !== undefined && value !== null && value !== '') {
            if (value instanceof Array) {
                for (let v of value) {
                    q.push(`${encodeURIComponent(key)}[]=${encodeURIComponent(v)}`)
                }
            } else {
                q.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            }
        }
    }
    return q.length ?
        '?' + q.join('&') :
        ''
}

/**
 * Parse query params into an object
 * @param {string|null} [query]
 * @param {{}|null} [dest]
 * @return {{}}
 */
export function parseQuery(query = null, dest = null) { //TODO: use built-in URL parser
    if (query === null) {
        query = history.location.search
    }
    if (query[0] === '?') {
        query = query.substring(1)
    }
    if (!dest) {
        dest = {}
    }
    for (let kv of query.split('&')) {
        let [key, value] = kv.split('=').map(v => decodeURIComponent(v))
        if (key) {
            if (/\[\]$/.test(key)) {
                key = key.substr(0, key.length - 2)
                const array = dest[key] || []
                array.push(value)
                value = array
            }
            dest[key] = value
        }
    }
    return dest
}

function defaultComparator([a], [b]) {
    if (a > b)
        return 1
    if (a < b)
        return -1
    return 0
}