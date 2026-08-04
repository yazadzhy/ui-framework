import {createPath} from 'history'
import {history} from './history'
import {parseQuery, stringifyQuery} from './query'

const observers = []
let queryString = Object.freeze(parseQuery())

function notifyChanged(nav) {
    for (const handler of observers) {
        handler(nav)
    }
}

class NavigationWrapper {
    get history() {
        return history
    }

    get query() {
        return queryString
    }

    get path() {
        return history.location.pathname
    }

    /**
     * Most recent navigation action ('PUSH'|'REPLACE'|'POP') - informational
     * @type {string}
     * @readonly
     */
    get action() {
        return history.action
    }

    get hash() {
        return history.location.hash
    }

    set hash(value) {
        if (value[0] !== '#') value = '#' + value
        history.replace({pathname: history.location.pathname, search: history.location.search, hash: value})
    }

    preventNavigationInsideIframe = false

    /**
     * Update query string of the current location (via history.replace, without adding a history entry).
     * @param {Object} paramsToSet - Query params to merge into (or replace) the current query
     * @param {boolean} [replace] - Replace the entire query state instead of merging
     */
    updateQuery(paramsToSet, replace = false) {
        const merged = Object.assign({}, replace ? null : queryString, paramsToSet)
        const newUrl = this.path + stringifyQuery(merged) + history.location.hash
        //idempotency guard - skip when the resulting URL is unchanged (breaks circular query-update loops)
        if (createPath(history.location) === newUrl)
            return
        history.replace(newUrl)
    }

    /**
     * Navigate to a new URL (adds a history entry).
     * @param {string} url - Target URL
     */
    navigate(url) {
        if (createPath(history.location) === url)
            return
        history.push(url)
    }

    /**
     * Subscribe to location changes. The handler receives the navigation object.
     * @param {LocationChangeListener} handler
     * @return {function} Unsubscribe function
     */
    listen(handler) {
        observers.push(handler)
        return this.stopListening.bind(this, handler)
    }

    /**
     * Unsubscribe a previously registered location change handler.
     * @param {LocationChangeListener} handler
     */
    stopListening(handler) {
        const i = observers.indexOf(handler)
        if (i !== -1) observers.splice(i, 1)
    }
}

export const navigation = new NavigationWrapper()

//re-derives query and notify observers on every location change
history.listen(({location}) => {
    queryString = Object.freeze(parseQuery(location.search))
    notifyChanged(navigation)
})

/**
 * @callback LocationChangeListener
 * @param {NavigationWrapper} navigation
 */
