import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {createMemoryHistory} from 'history'
import {Router, Route, RouterSwitch} from '../navigation/router'
import {useParams, useRouteMatch, useLocation, withRouter} from '../navigation/router-hooks'

function renderAt(path, ui) {
    const history = createMemoryHistory({initialEntries: [path]})
    return renderToStaticMarkup(<Router history={history}>{ui}</Router>)
}

const Asset = () => <div>ASSET</div>
const Dashboard = () => <div>DASHBOARD</div>
const NotFound = () => <div>NOTFOUND</div>

describe('Switch + Route', () => {
    test('renders the matching route', () => {
        const markup = renderAt('/explorer/public/asset/USD', <RouterSwitch>
            <Route path="/explorer/:network/asset/:asset" component={Asset}/>
            <Route component={NotFound}/>
        </RouterSwitch>)
        expect(markup).toContain('ASSET')
        expect(markup).not.toContain('NOTFOUND')
    })

    test('first-match-wins ordering (specific before generic)', () => {
        const routes = <RouterSwitch>
            <Route path="/explorer/:network/asset/:asset" component={Asset}/>
            <Route path="/explorer/:network/asset" component={Dashboard}/>
        </RouterSwitch>
        expect(renderAt('/explorer/public/asset/USD', routes)).toContain('ASSET')
        expect(renderAt('/explorer/public/asset', routes)).toContain('DASHBOARD')
    })

    test('pathless route is the fallback', () => {
        const markup = renderAt('/nope', <RouterSwitch>
            <Route path="/explorer/:network" component={Asset}/>
            <Route component={NotFound}/>
        </RouterSwitch>)
        expect(markup).toContain('NOTFOUND')
    })

    test('renders nothing when no child matches and there is no fallback', () => {
        const markup = renderAt('/nope', <RouterSwitch>
            <Route path="/explorer/:network" component={Asset}/>
        </RouterSwitch>)
        expect(markup).toBe('')
    })
})

describe('route data hooks', () => {
    test('useParams exposes captured params (component form)', () => {
        function View() {
            const {network, id} = useParams()
            return <div>{`net=${network};id=${id}`}</div>
        }
        const markup = renderAt('/explorer/public/account/GABC', <RouterSwitch>
            <Route path="/explorer/:network/account/:id" component={View}/>
        </RouterSwitch>)
        expect(markup).toContain('net=public;id=GABC')
    })

    test('useRouteMatch exposes the matched pattern for nested routers (children form)', () => {
        function NestedRouter() {
            const {path, params} = useRouteMatch()
            return <div>{`path=${path};net=${params.network}`}</div>
        }
        const markup = renderAt('/explorer/public/asset/USD', <RouterSwitch>
            <Route path="/explorer/:network"><NestedRouter/></Route>
        </RouterSwitch>)
        expect(markup).toContain('path=/explorer/:network;net=public')
    })

    test('useLocation reflects the current pathname/search', () => {
        function View() {
            const {pathname, search} = useLocation()
            return <div>{`${pathname}${search}`}</div>
        }
        const markup = renderAt('/x/1?cursor=abc', <Route path="/x/:id" component={View}/>)
        expect(markup).toContain('/x/1?cursor=abc')
    })
})

describe('withRouter', () => {
    test('injects location and the closest match', () => {
        const Comp = withRouter(function ({location, match}) {
            return <div>{`loc=${location.pathname};mp=${match.path}`}</div>
        })
        const markup = renderAt('/x/5', <Route path="/x/:id" component={Comp}/>)
        expect(markup).toContain('loc=/x/5;mp=/x/:id')
    })

    test('sets WrappedComponent', () => {
        function Inner() {
            return null
        }
        expect(withRouter(Inner).WrappedComponent).toBe(Inner)
    })
})
