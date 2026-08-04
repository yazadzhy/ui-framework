import {useRef} from 'react'
import isEqual from 'react-fast-compare'
import {parseQuery, stringifyQuery} from '../navigation/query'
import {navigation} from '../navigation/navigation'
import {useStellarNetwork} from '../state/stellar-network-hooks'
import {useDependantState} from '../state/state-hooks'
import {fetchExplorerApi} from './explorer-api-call'
import apiCache from './api-cache'

function inverseOrder(order) {
    return order === 'desc' ? 'asc' : 'desc'
}

class PaginatedListViewModel {
    /**
     * Create new instance of PaginatedListViewModel
     * @param {string} endpoint - API endpoint
     * @param {Object} [props] - Extra model params
     * @param {number} [props.ttl] - Cache time-to-live period
     * @param {number} [props.limit] - Rows limit
     * @param {boolean} [props.autoReverseRecordsOrder] - Reverse order to match default grid order
     * @param {boolean} [props.autoLoadLastPage] - Whether to load last page flag
     * @param {'asc'|'desc'} [props.defaultSortOrder] - Results sorting order
     * @param {Object} [props.defaultQueryParams] - Default query values - query params not set if default
     * @param {function} [props.dataProcessingCallback] - Callback called for the fetched data
     * @param {boolean|function} [props.updateLocation] - Whether to update browser location
     */
    constructor(endpoint, props = {limit: 20}) {
        this.endpoint = endpoint
        this.data = []
        this.defaultQueryParams = {}
        this.limit = props.limit
        this.ttl = props.ttl
        this.query = props.query
        this.dataProcessingCallback = props.dataProcessingCallback
        this.defaultSortOrder = props.defaultSortOrder
        this.updateLocation = props.updateLocation
        if (props.autoReverseRecordsOrder !== undefined) {
            this.autoReverseRecordsOrder = props.autoReverseRecordsOrder
        }
        if (props.autoLoadLastPage !== undefined) {
            this.autoLoadLastPage = props.autoLoadLastPage
        }
        //reconstruct state from query
        if (navigation.query.cursor) {
            const {cursor, sort, order} = navigation.query
            this.nextCursor = stringifyQuery({cursor, sort, order})
        }
        if (props.defaultQueryParams) {
            this.defaultQueryParams = props.defaultQueryParams
        }
    }

    /**
     * API endpoint
     * @type {string}
     * @readonly
     */
    endpoint = ''

    /**
     * Batch size
     * @type {number}
     */
    limit = 20

    /**
     * Time-to-live cache period (in seconds)
     * @type {number}
     */
    ttl = 30

    /**
     *
     * @type {function|Object}
     */
    query = null

    /**
     * Automatically reverse records order
     * @type {boolean}
     */
    autoReverseRecordsOrder = false

    /**
     * Sorting order
     * @type {string}
     */
    defaultSortOrder = 'desc'

    /**
     * Load last meaningful page if now results returned from the server
     * @type {boolean}
     */
    autoLoadLastPage = true

    /**
     * Function used to process data retrieved from the server
     * @type {function}
     */
    dataProcessingCallback = null

    /**
     * @type {function}
     */
    onError = null

    /**
     * Data received from server
     * @type {Object}
     */
    data

    /**
     * Response loaded flag
     * @type {boolean}
     */
    loaded = false

    /**
     * Fetch-in-progress flag
     * @type {boolean}
     */
    loading = false

    /**
     * Whether the next page is available
     * @type {boolean}
     */
    canLoadNextPage = false

    /**
     * Whether the prev page is available
     * @type {boolean}
     */
    canLoadPrevPage = false

    /**
     * Next page cursor
     * @type {string}
     */
    nextCursor

    /**
     * Previous page cursor
     * @type {string}
     */
    prevCursor

    /**
     * @private
     * @type {function}
     */
    updateApiResponseData = null

    /**
     * Load portion of data from the server
     * @param {1|-1} page
     * @return {Promise<ExplorerApiListResponse>}
     */
    load(page) {
        const paginationParams = {skip: undefined},
            navCursor = page < 0 ? this.prevCursor : this.nextCursor

        if (navCursor) {
            parseQuery(navCursor.split('?')[1] || '', paginationParams)
        } else {
            this.nextCursor = stringifyQuery({
                cursor: navigation.query.cursor,
                sort: navigation.query.sort,
                order: navigation.query.order
            })
        }
        //const externalQueryParams = typeof this.query === 'function' ? this.query() : this.query
        //prepare query params
        const queryParams = Object.assign({}, this.defaultQueryParams, this.query, paginationParams, {limit: this.limit})
        return this.loadPage(queryParams)
    }

    /**
     * Reverse order and load the page
     * @param queryParams
     * @return {Promise<ExplorerApiListResponse>}
     * @private
     */
    async loadLastPage(queryParams) {
        const {order} = queryParams,
            overrides = {
                order: inverseOrder(order),
                cursor: undefined
            }

        return this.loadPage(Object.assign({}, queryParams, overrides))
    }

    /**
     * Load data page from the server
     * @param {{}} queryParams
     * @private
     */
    async loadPage(queryParams) {
        this.loaded = false
        this.loading = true
        this.updateQuery(queryParams)
        this.updateApiResponseData(this.toJSON())
        const [path] = this.endpoint.split('?')
        const endpointWithQuery = path + stringifyQuery(queryParams)

        //try to retrieve data from the browser cache
        const fromCache = this.ttl && apiCache.get(endpointWithQuery)
        //fetch from the server only if there is no data or it is expired
        if (!fromCache || fromCache.isExpired) {
            const data = await fetchExplorerApi(endpointWithQuery)
            return this.processResponseData(endpointWithQuery, data, queryParams)
        }

        if (fromCache && !fromCache.isStale) {
            //if the cached data is up to date - proceed with it
            return this.processResponseData(endpointWithQuery, fromCache.data, queryParams)
        }
    }

    /**
     * Retrieve and convert data from the API response
     * @param {string} endpointWithQuery
     * @param {{}} data
     * @param {{}} queryParams
     * @private
     */
    processResponseData(endpointWithQuery, data, queryParams) {
        if (data.error) {
            console.error(data.error)
            this.loaded = true
            this.loading = false
            this.error = data
        } else {
            const {_links, _embedded} = data
            let records = _embedded.records.slice()
            //we reached the end of the query
            if (!records.length && this.autoLoadLastPage && this.data && this.data.length) {
                //load first/last meaningful page
                setTimeout(() => this.loadLastPage(queryParams), 500)
                return
            }
            if (this.autoReverseRecordsOrder && _links.self.href.includes('order=' + inverseOrder(this.defaultSortOrder))) {
                records.reverse()
            }
            if (this.dataProcessingCallback) {
                records = this.dataProcessingCallback(records)
            }
            this.data = records
            this.loaded = true
            this.loading = false
            this.updateNav(_links)
        }
        //in case of error set small ttl in order to try re-fetching in 4 seconds
        if (this.ttl >= 0) {
            apiCache.set(endpointWithQuery, data, data.error ? 4 : this.ttl)
        }
        //update response data
        const res = this.toJSON()
        this.updateApiResponseData(res)
        return res
    }

    /**
     * Update navigation links retrieved from the response
     * @param {string} self
     * @param {string} next
     * @param {string} prev
     * @private
     */
    updateNav({self, next, prev}) {
        this.canLoadNextPage = true //this.nextCursor && this.nextCursor !== self.href && records.length >= this.limit
        this.canLoadPrevPage = true //this.prevCursor && this.prevCursor !== self.href
        const selfQuery = parseQuery(self.href.split('?')[1])
        if ((selfQuery.order === inverseOrder(this.defaultSortOrder))) {
            this.prevCursor = next ? next.href : null
            this.nextCursor = prev ? prev.href : null
            if (!selfQuery.cursor) {
                this.canLoadNextPage = false
            }
            if (this.data.length < this.limit) {
                this.canLoadPrevPage = false
            }
        } else {
            this.nextCursor = next ? next.href : null
            this.prevCursor = prev ? prev.href : null
            if (!selfQuery.cursor) {
                this.canLoadPrevPage = false
            }
            if (this.data.length < this.limit) {
                this.canLoadNextPage = false
            }
        }

        if (selfQuery.cursor === '0') {
            this.canLoadPrevPage = false
        }
    }

    /**
     * Update location query string
     * @param {{}} queryParams
     * @private
     */
    updateQuery(queryParams) {
        const {updateLocation} = this
        if (!updateLocation)
            return
        let paramsToSet = {}
        for (let key in queryParams)
            if (queryParams.hasOwnProperty(key)) {
                if (key === 'limit') continue
                let value = queryParams[key]
                //ignore default params
                if (this.defaultQueryParams[key] === value) {
                    value = undefined
                }
                paramsToSet[key] = value
            }
        if (typeof updateLocation === 'function') {
            paramsToSet = updateLocation(paramsToSet)
        }
        navigation.updateQuery(paramsToSet)
    }

    /**
     * Convert model to a plain object representation
     * @return {{loaded: boolean, data: ({}[]), load: function, reset: function loading: boolean, canLoadNextPage: boolean, canLoadPrevPage: boolean}}
     */
    toJSON() {
        return {
            data: this.data || [],
            loaded: this.loaded,
            loading: this.loading,
            canLoadPrevPage: this.canLoadPrevPage,
            canLoadNextPage: this.canLoadNextPage,
            load: this.load.bind(this),
            reset: this.reset.bind(this)
        }
    }

    /**
     * Reset model to the initial state
     */
    reset() {
        this.data = []
        this.loaded = false
        this.loading = false
        this.canLoadNextPage = false
        this.canLoadPrevPage = false
        this.nextCursor = undefined
        this.prevCursor = undefined
        this.currentQueryParams = undefined
        this.updateQuery({cursor: undefined, sort: undefined, order: undefined})
    }
}


/**
 * @typedef {Object} ExplorerApiListResponse
 * @property {Object[]} data - Data retrieved from the server
 * @property {boolean} loaded - Response result loaded flag
 * @property {function} load - Load page function
 * @property {boolean} canLoadPrevPage - Whether the prev page is available
 * @property {boolean} canLoadNextPage - Whether the next page is available
 */

/**
 *
 * @param {string|APIEndpointParams} apiEndpoint - Server API endpoint to use as a data source.
 * @param {number} [ttl] - Cache time-to-live in seconds.
 * @param {number} [limit] - Rows per batch limit.
 * @param {boolean} [autoReverseRecordsOrder] - Reverse order to match default grid order.
 * @param {'asc'|'desc'} [defaultSortOrder] - Reverse order to match default grid order.
 * @param {boolean} [autoLoadLastPage] - Load last meaningful page if now results returned from the server.
 * @param {boolean} [includeNetwork] - Whether to include network prefix in the endpoint path.
 * @param {function} [dataProcessingCallback] - Callback called for the fetched data.
 * @param {Object} [defaultQueryParams] - Default query values - query params not set if default.
 * @param {boolean} [autoLoad] - Default query values - query params not set if default.
 * @param {boolean} [updateLocation] - Automatically update browser query string on navigation.
 * @param {Array} [dependencies] - Additional dependencies to track for state updates.
 * @return {ExplorerApiListResponse}
 */
export function useExplorerPaginatedApi(apiEndpoint,
                                        {
                                            ttl = 30,
                                            limit = 20,
                                            autoReverseRecordsOrder = false,
                                            defaultSortOrder = 'desc',
                                            autoLoadLastPage = true,
                                            includeNetwork = true,
                                            defaultQueryParams = {},
                                            dataProcessingCallback,
                                            autoLoad = true,
                                            updateLocation = true
                                        } = {},
                                        dependencies = []) {
    if (!apiEndpoint)
        throw new Error(`Invalid API endpoint: ${apiEndpoint}`)
    const network = useStellarNetwork()
    const pinRef = useRef(null)
    if (typeof apiEndpoint === 'string') {
        const [path, query] = apiEndpoint.split('?')
        apiEndpoint = {
            path,
            query: parseQuery(query)
        }
    }
    if (defaultQueryParams.order) {
        defaultSortOrder = defaultQueryParams.order
    }
    const endpoint = includeNetwork ? `${network}/${apiEndpoint.path}` : apiEndpoint.path

    const [apiResponseData, updateApiResponseData] = useDependantState(() => {
        const res = new PaginatedListViewModel(endpoint, {
            ttl,
            limit,
            query: apiEndpoint.query,
            dataProcessingCallback,
            autoLoadLastPage,
            autoReverseRecordsOrder,
            defaultSortOrder,
            defaultQueryParams,
            updateLocation
        })
        pinRef.current = res
        if (autoLoad) {
            setTimeout(() => {
                res.load()
            }, 100)
        }
        return res.toJSON()
    }, [JSON.stringify(apiEndpoint), limit, ttl, autoReverseRecordsOrder, autoLoadLastPage, autoLoad, ...dependencies])

    pinRef.current.updateApiResponseData = function (newData) {
        updateApiResponseData(prevListData => isEqual(prevListData, newData) ? prevListData : newData)
    }

    return apiResponseData
}
