//minimal window/document stub so history's createBrowserHistory() can load in the node test env (no jsdom).
const win = {
    history: {state: null, pushState() {}, replaceState() {}, go() {}},
    location: {pathname: '/', search: '', hash: '', href: 'http://localhost/'},
    addEventListener() {},
    removeEventListener() {}
}
global.window = win
global.document = {defaultView: win}
