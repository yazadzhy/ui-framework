import React from 'react'
import PropTypes from 'prop-types'
import {navigation as nav} from '../navigation/navigation'
import {BlockSelect} from '../interaction/block-select'

/**
 * React error boundary that catches rendering errors and displays a fallback UI
 * @extends React.Component
 */
export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = {lastError: null, url: null}
    }

    componentDidCatch(e, errorInfo) {
        e.componentStack = errorInfo?.componentStack
        console.error(e)
        this.setState({lastError: e, url: window.location.href}, () => {
            const stopListening = nav.history.listen(() => {
                if (this.state.url !== window.location.href) {
                    stopListening()
                    this.setState({lastError: null, url: null})
                }
            })
        })
    }

    renderError() {
        const {errorBoundarySendErrors = true} = this.props
        return <>
            {this.renderErrorDetails()}
            {errorBoundarySendErrors && this.renderSendErrorBlock()}
        </>
    }

    renderSendErrorBlock() {
        const {lastError, url} = this.state
        const {message, stack, componentStack} = lastError
        const compiledText = `Error details:
"${message}" at ${url}
${stack}
${componentStack ? 'Components stack: ' + componentStack : ''}
${navigator.userAgent}`
        return <div className="space dimmed text-small text-right">
            If this error persists please{' '}
            <a href={'mailto:support@stellar.expert?subject=Exception&body=' + encodeURIComponent(compiledText)}
               target="_blank">contact our support</a>.
        </div>
    }

    renderErrorDetails() {
        const {lastError, url} = this.state
        const {message, stack, componentStack} = lastError
        const text = `"${message}" at ${url}`
        const {errorBoundaryErrorDetails = true} = this.props
        if (errorBoundaryErrorDetails === false)
            return null
        if (errorBoundaryErrorDetails === true) {
            return <div className="error space text-small" style={{overflow: 'auto', maxWidth: '100%', padding: '1rem 2rem'}}>
                <BlockSelect as="div">
                    <div className="micro-space">{text}</div>
                    <div className="text-tiny">
                        <pre style={{whiteSpace: 'pre-wrap'}}>{stack}</pre>
                        <div>{navigator.userAgent}</div>
                    </div>
                </BlockSelect>
            </div>
        }
        return <>{errorBoundaryErrorDetails}</>
    }

    render() {
        if (!this.state.lastError)
            return this.props.children
        const {title = 'Unhandled error occurred', wrapper, ...otherProps} = this.props
        if (wrapper)
            return React.createElement(wrapper, {...otherProps}, this.renderError())
        return <div className="segment blank">
            <h3 className="color-danger">{title}</h3>
            <hr className="flare"/>
            {this.renderError()}
        </div>
    }

    static propTypes = {
        errorBoundaryTitle: PropTypes.string,
        errorBoundarySendErrors: PropTypes.bool,
        errorBoundaryErrorDetails: PropTypes.oneOfType([PropTypes.bool, PropTypes.any])
    }
}

/**
 * Higher-order component that wraps a component with an ErrorBoundary
 * @param {function} wrapped - React component to wrap
 * @param {Object} [options]
 * @param {string} [options.errorBoundaryTitle] - Title displayed in the error UI
 * @param {boolean} [options.errorBoundarySendErrors] - Show "contact support" link
 * @param {boolean|*} [options.errorBoundaryErrorDetails] - Show error details (true), hide (false), or provide custom content
 * @return {function} Wrapped component with error boundary
 */
export function withErrorBoundary(wrapped, {errorBoundaryTitle, errorBoundarySendErrors, errorBoundaryErrorDetails} = {}) {
    function ErrorBoundaryWrapper(props) {
        const nested = /*#__PURE__*/React.createElement(wrapped, props)
        return <ErrorBoundary {...{errorBoundaryTitle, errorBoundarySendErrors, errorBoundaryErrorDetails}}>{nested}</ErrorBoundary>
    }

    ErrorBoundaryWrapper.displayName = `withErrorBoundary(${wrapped.displayName || wrapped.name})`
    ErrorBoundaryWrapper.WrappedComponent = wrapped
    return ErrorBoundaryWrapper
}