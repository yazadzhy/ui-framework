import {matchPath, computeRootMatch, compilePath} from '../navigation/route-matcher'

describe('matchPath', () => {
    test('root exact matches "/" only', () => {
        expect(matchPath('/', {path: '/', exact: true})).not.toBeNull()
        expect(matchPath('/explorer', {path: '/', exact: true})).toBeNull()
    })

    test('root non-exact matches everything', () => {
        expect(matchPath('/explorer/public', {path: '/'})).not.toBeNull()
        expect(matchPath('/', {path: '/'}).isExact).toBe(true)
    })

    test('non-exact prefix captures params and consumes only prefix', () => {
        const m = matchPath('/explorer/public/asset/USD', {path: '/explorer/:network'})
        expect(m.params).toEqual({network: 'public'})
        expect(m.url).toBe('/explorer/public')
        expect(m.isExact).toBe(false)
    })

    test('segment boundary is respected (no partial-segment match)', () => {
        expect(matchPath('/explorerX/public', {path: '/explorer/:network'})).toBeNull()
    })

    test('multi-param full match reports isExact', () => {
        const m = matchPath('/explorer/public/asset/USD-GABC', {path: '/explorer/:network/asset/:asset'})
        expect(m.params).toEqual({network: 'public', asset: 'USD-GABC'})
        expect(m.isExact).toBe(true)
    })

    test('captured params preserve case (i flag does not lowercase captures)', () => {
        const m = matchPath('/explorer/public/asset/UsDcoin', {path: '/explorer/:network/asset/:asset'})
        expect(m.params.asset).toBe('UsDcoin')
    })

    test('two adjacent params (market selling/buying)', () => {
        const m = matchPath('/explorer/public/market/XLM/USD', {path: '/explorer/:network/market/:selling/:buying'})
        expect(m.params).toEqual({network: 'public', selling: 'XLM', buying: 'USD'})
    })

    test('ordering-sensitive routes both prefix-match (Switch resolves order)', () => {
        expect(matchPath('/explorer/public/asset/USD', {path: '/explorer/:network/asset/:asset'})).not.toBeNull()
        expect(matchPath('/explorer/public/asset/USD', {path: '/explorer/:network/asset'})).not.toBeNull()
        expect(matchPath('/explorer/public/asset', {path: '/explorer/:network/asset'}).isExact).toBe(true)
    })

    test('slash + exact URL without slash', () => {
        expect(matchPath('/explorer/public', {path: '/explorer/public/', exact: true})).not.toBeNull()
        expect(matchPath('/explorer/public/', {path: '/explorer/public/', exact: true})).not.toBeNull()
        expect(matchPath('/explorer/public/asset', {path: '/explorer/public/', exact: true})).toBeNull()
    })

    test('explorer home: `${path}/` exact with a param', () => {
        expect(matchPath('/explorer/public', {path: '/explorer/:network/', exact: true}).params).toEqual({network: 'public'})
        expect(matchPath('/explorer/public/tx/abc', {path: '/explorer/:network/', exact: true})).toBeNull()
    })

    test('triple-segment widget route', () => {
        const m = matchPath('/widget/public/account/mini/GABC', {path: '/widget/:network/account/:snippet/:id'})
        expect(m.params).toEqual({network: 'public', snippet: 'mini', id: 'GABC'})
    })

    test('api-docs :tag/:method/:id', () => {
        const m = matchPath('/api-docs/accounts/get/single', {path: '/api-docs/:tag/:method/:id'})
        expect(m.params).toEqual({tag: 'accounts', method: 'get', id: 'single'})
    })

    test('redirect-from with param, non-exact', () => {
        expect(matchPath('/explorer/public/directory', {path: '/explorer/:network/directory'}).params).toEqual({network: 'public'})
    })

    test('literal regex-special chars in the pattern are escaped', () => {
        expect(matchPath('/aXb', {path: '/a.b', exact: true})).toBeNull()
        expect(matchPath('/a.b', {path: '/a.b', exact: true})).not.toBeNull()
    })

    test('returns null for a non-matching pattern', () => {
        expect(matchPath('/explorer/public/tx/abc', {path: '/explorer/:network/account/:id'})).toBeNull()
    })
})

describe('computeRootMatch', () => {
    test('at root', () => {
        expect(computeRootMatch('/')).toEqual({path: '/', url: '/', params: {}, isExact: true})
    })
    test('below root', () => {
        expect(computeRootMatch('/explorer')).toEqual({path: '/', url: '/', params: {}, isExact: false})
    })
})

describe('compilePath', () => {
    test('caches and returns the same compiled entry for identical inputs', () => {
        expect(compilePath('/explorer/:network', false)).toBe(compilePath('/explorer/:network', false))
    })
    test('exact vs non-exact compile to different matchers', () => {
        expect(compilePath('/x', true)).not.toBe(compilePath('/x', false))
    })
})
