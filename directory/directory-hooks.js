import {useEffect, useState} from 'react'
import {StrKey} from '@stellar/stellar-sdk'
import {InMemoryClientCache} from '@stellar-expert/client-cache'
import {stringifyQuery} from '../navigation/query'
import {fetchExplorerApi} from '../api/explorer-api-call'
import {ExplorerBatchInfoLoader} from '../api/explorer-batch-info-loader'

const cache = new InMemoryClientCache({})

function isValidAddress(address) {
    if (!address)
        return false
    if (!StrKey.isValidEd25519PublicKey(address) && !StrKey.isValidContract(address))
        return false
    return true
}

const loader = new ExplorerBatchInfoLoader(batch => {
    return fetchExplorerApi('directory' + stringifyQuery({address: batch}))
}, entry => {
    cache.set(entry.address, entry)
    return {key: entry.address, info: entry}
})

/**
 * Fetch a directory entry for a Stellar address
 * @param {string} address - Stellar account or contract address
 * @param {Object} [options]
 * @param {boolean} [options.forceRefresh=false] - Bypass cache and fetch fresh data
 * @param {boolean} [options.extended=false] - Fetch extended directory information
 * @return {Promise<Object|null>} Directory entry or null if not found
 */
export async function getDirectoryEntry(address, options) {
    const {forceRefresh = false, extended = false} = options || {}
    //ignore invalid addresses
    if (!isValidAddress(address))
        return null
    if (extended) {
        return fetchExplorerApi(`directory/${address}` + stringifyQuery({
            extended: true,
            s: Math.random().toString(36).substr(2)
        }))
            .catch(err => {
                console.error(err)
                return null
            })
    }
    //try to load from the shared cache
    if (forceRefresh) {
        const cachedEntry = cache.get(address)
        if (cachedEntry && !cachedEntry.isExpired) return cachedEntry.data
    }
    //load from the server
    return loader.loadEntry(address)
}

/**
 *
 * @param {string} address
 * @param {{[forceRefresh]: boolean}} [options]
 * @return {string|null}
 */
export function useDirectory(address, options) {
    const {forceRefresh = false} = options || {}
    const [directoryInfo, setDirectoryInfo] = useState(null)
    let unloaded = false
    useEffect(function () {
        if (!isValidAddress(address))
            return
        if (!forceRefresh) {
            const cachedEntry = cache.get(address)
            if (cachedEntry && !cachedEntry.isStale) {
                if (!cachedEntry.isExpired)
                    return setDirectoryInfo(cachedEntry.data) //everything is up to date - no need to re-fetch
            }
        }
        //load from the server
        loader.loadEntry(address)
            .then(di => {
                if (!unloaded) {
                    setDirectoryInfo(di)
                }
            })
        return () => {
            unloaded = true
        }
    }, [address, forceRefresh])
    return directoryInfo
}

/**
 * React hook that fetches and returns all available directory tags
 * @return {Array<Object>} Array of directory tag objects
 */
export function useDirectoryTags() {
    const [tags, setTags] = useState(() => {
        const cachedEntry = cache.get('tags')
        if (cachedEntry && !cachedEntry.isExpired) {
            return cachedEntry.data
        }
        fetchExplorerApi('directory/tags')
            .then(data => {
                cache.set('tags', data, 10 * 60) //10 minutes
                setTags(data)
            })
            .catch(err => console.error(err))
        return []
    })
    return tags
}