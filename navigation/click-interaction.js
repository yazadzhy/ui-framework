import {navigation} from './navigation'
import {history} from './history'

/** Attach a delegated click navigation handler that intercepts and routes link clicks through `navigation` */
export function bindClickNavHandler(container) {
    container.addEventListener('click', e => {
        if (e.ctrlKey) return
        let link = e.target
        while (link && !(link.tagName === 'A' && link.href)) {
            link = link.parentElement
        }
        if (link) {
            const href = link.getAttribute('href')
            if (link.target === '_blank' || !href) return
            if (href === '#') return e.preventDefault()
            if (window.parent !== window && navigation.preventNavigationInsideIframe) {
                window.top.location = /^(https?):\/\//.test(href) ? href : (window.origin + href)
                return e.preventDefault()
            }
            if (link.classList.contains('external-link')) return
            if (/^(mailto:|tel:|(https?):\/\/)/.test(href)) return

            const [pathAndQuery] = href.split('#')

            if (!pathAndQuery || (history.location.pathname + history.location.search) === pathAndQuery)
                return e.preventDefault()
            if (link.classList.contains('static-link'))
                return e.preventDefault()
            navigation.navigate(href)
            e.preventDefault()
            window.scrollTo(0, 0)
        }
    })
}