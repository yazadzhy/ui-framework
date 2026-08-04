import React, {useState} from 'react'
import {throttle} from 'throttle-debounce'
import equal from 'react-fast-compare'
import {stringifyQuery} from '../navigation/query'
import {fetchExplorerApi} from '../api/explorer-api-call'
import {useDeepEffect} from '../state/state-hooks'
import {getCurrentStellarNetwork} from '../state/stellar-network-hooks'

const defaults = {
    limit: 20,
    order: 'desc',
    sort: 'rating'
}

function getCurrentCursor(data) {
    if (!data || !data.length) return undefined
    return data[data.length - 1].paging_token
}

/**
 *
 * @param {Object} params
 * @return {{assets: Array<Object>, loadPage: function, loading: boolean}}
 */
export function useAssetList(params) {
    const [loading, setLoading] = useState(false),
        [assets, setAssets] = useState({data: [], params}),
        loadPage = throttle(1000, function () {
            if (loading) return
            const requestParams = {
                ...defaults, ...params
            }
            if (equal(params, assets.params)) {
                requestParams.cursor = getCurrentCursor(assets.data)
            }
            const endpoint = getCurrentStellarNetwork() + '/asset' + stringifyQuery(requestParams)
            setLoading(true)
            fetchExplorerApi(endpoint)
                .then(res => {
                    const {records} = res._embedded
                    setAssets(existing => {
                        let data = records
                        if (equal(params, existing.params)) {
                            data = [...existing.data, ...records]
                        }
                        return {data, params}
                    })
                    setLoading(false)
                })
                .catch(e => console.error(e))
                .finally(() => {
                    setLoading(false)
                })
        })
    useDeepEffect(() => {
        loadPage()
    }, [params])

    return {assets: assets.data, loadPage, loading}
}