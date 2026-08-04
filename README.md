# @stellar-expert/ui-framework

> Shared UI components library for StellarExpert apps.

## Installation

```bash
pnpm add @stellar-expert/ui-framework
```

Peer dependencies must be installed separately — see `peerDependencies` in `package.json`.

## Quick Start

```js
import {
    setStellarNetwork,
    createToastNotificationsContainer,
    initMeta
} from '@stellar-expert/ui-framework'

// Set the active Stellar network
setStellarNetwork('public')

// Initialize page meta tags
initMeta({
    serviceTitle: '| StellarExpert',
    origin: 'https://stellar.expert',
    description: 'Stellar blockchain explorer',
    image: 'https://stellar.expert/img/og-image.png'
})

// Initialize toast notifications (call once at app startup)
createToastNotificationsContainer()
```

## Configuration

Global variables:

| Global | Default | Description |
|--------|---------|-------------|
| `window.explorerFrontendOrigin` | `https://stellar.expert` | StellarExpert frontend URL |
| `window.explorerApiOrigin` | `https://api.stellar.expert` | StellarExpert API URL |
| `window.horizonOrigin` | `https://horizon.stellar.org` | Stellar Horizon API URL |

Override them before importing components if needed.

---

## API Reference

### Modules

#### `DynamicModule`

Dynamically loadable module with error boundary wrapping and caching.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `load` | `() => Promise` | Yes | Dynamic import function |
| `module` | `string` | No | Unique module name for caching |

```jsx
import {DynamicModule} from '@stellar-expert/ui-framework'

<DynamicModule module="docs" load={() => import('./docs/docs-view')}/>
```

---

### State Management

#### `useDependantState(stateInitializer, dependencies, finalizer?)`

React hook that auto-reinitializes state when dependencies change using deep comparison.

| Param | Type | Description |
|-------|------|-------------|
| `stateInitializer` | `function\|any` | Initial state or initializer function receiving `(dependencies, prevState)` |
| `dependencies` | `any[]` | Dependencies array (deep compared) |
| `finalizer` | `function` | Optional cleanup function |

Returns `[state, setState]` — setState also uses deep comparison.

```jsx
import {useDependantState} from '@stellar-expert/ui-framework'

const [transfer] = useDependantState(
    () => new TransferSettings(network),
    [network, accountLedgerData.address]
)

const [result, setResult] = useDependantState(() => {
    loadIssuedAssets(address)
        .then(data => setResult({loaded: true, data}))
    return {loaded: false, data: []}
}, [address])
```

#### `useForceUpdate()`

Returns a function that forces a component re-render.

```jsx
const forceUpdate = useForceUpdate()
```

#### `useDeepEffect(effect, dependencies)`

Like `useEffect` but uses deep comparison for dependencies.

```jsx
import {useDeepEffect} from '@stellar-expert/ui-framework'

useDeepEffect(() => {
    // runs when options deeply change
}, [options, modules, type])
```

#### `useOnScreen(root, rootMargin?)`

Hook for determining element visibility using IntersectionObserver.

| Param | Type | Description |
|-------|------|-------------|
| `root` | `RefObject<Element>` | Scroll parent ref |
| `rootMargin` | `string` | Visibility margin (e.g., `"100px"`) |

Returns `boolean`.

#### `getCurrentStellarNetwork()`

Returns the current Stellar network (`'public'` or `'testnet'`).

#### `setStellarNetwork(network)`

Sets the active Stellar network and notifies all subscribers.

```jsx
import {setStellarNetwork} from '@stellar-expert/ui-framework'

setStellarNetwork('testnet')
```

#### `subscribeToStellarNetworkChange(onChange)`

Subscribes to network change events.

```jsx
import {subscribeToStellarNetworkChange} from '@stellar-expert/ui-framework'

subscribeToStellarNetworkChange(network => {
    window.horizonOrigin = appSettings.horizonUrl
})
```

#### `useStellarNetwork()`

React hook that returns the current network and re-renders on change.

```jsx
const network = useStellarNetwork()
```

#### `useScreenOrientation()`

Returns the current screen orientation type (e.g., `"portrait-primary"`).

#### `isDocumentVisibilitySupported`

Boolean indicating Page Visibility API support.

#### `isDocumentVisible()`

Returns `true` if the document tab is currently visible.

#### `addVisibilityChangeListener(listener)`

Registers a visibility change listener. Returns an unsubscribe function.

#### `useTheme()`

Returns `[theme, setTheme]` for managing `'day'`/`'night'` theme.

---

### Meta Tags

#### `initMeta(appMetaProps)`

Initialize default page meta properties. Call once at app startup.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `appMetaProps.serviceTitle` | `string` | Yes | Service title suffix |
| `appMetaProps.description` | `string` | Yes | Default description |
| `appMetaProps.origin` | `string` | Yes | Site origin URL |
| `appMetaProps.image` | `string` | No | Default OG image |
| `appMetaProps.imageEndpoint` | `string` | No | Thumbnail generation endpoint |

```jsx
initMeta({
    serviceTitle: '| StellarExpert',
    origin: metaOrigin,
    description: 'StellarExpert - Stellar blockchain explorer',
    image: metaOrigin + '/img/og-image.png',
    imageEndpoint: metaOrigin + '/thumbnail'
})
```

#### `usePageMetadata(meta)`

React hook for setting page title, description, and image.

```jsx
import {usePageMetadata} from '@stellar-expert/ui-framework'

usePageMetadata({
    title: `Account ${address}`,
    description: `Explore properties of account ${address}`
})
```

#### `setPageNoIndex(noIndex)`

Add or remove the `robots` noindex meta tag.

---

### Explorer API

#### `ExplorerApiResult`

Class representing an API response.

| Property | Type | Description |
|----------|------|-------------|
| `data` | `any` | Response data |
| `error` | `string` | Error message if any |
| `status` | `number` | HTTP status code |
| `loaded` | `boolean` | Whether response has been received |
| `fetchedAt` | `number` | Response timestamp |

#### `useExplorerApi(apiEndpoint, options?)`

React hook for fetching data from the StellarExpert API with caching and auto-refresh.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `refreshInterval` | `number` | — | Auto-refresh interval in seconds |
| `ttl` | `number` | `60` | Cache TTL in seconds |
| `processResult` | `function` | — | Transform the response data |
| `allowStaleDataTransition` | `boolean` | `false` | Show stale data during URL transitions |

```jsx
import {useExplorerApi} from '@stellar-expert/ui-framework'

const {data, loaded, error} = useExplorerApi('account/' + address)

const {data: valueInfo} = useExplorerApi(`account/${address}/value`)

const accountInfo = useExplorerApi('account/' + address, {
    processResult(data) { /* transform */ return data }
})
```

#### `fetchData(url, ttl?, processResult?)`

Low-level function to fetch from the Explorer API with caching.

#### `useExplorerPaginatedApi(apiEndpoint, options?, dependencies?)`

React hook for paginated API data with cursor-based navigation.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ttl` | `number` | `30` | Cache TTL |
| `limit` | `number` | `20` | Rows per page |
| `autoReverseRecordsOrder` | `boolean` | `false` | Reverse order for grid display |
| `defaultSortOrder` | `'asc'\|'desc'` | `'desc'` | Default sort order |
| `autoLoadLastPage` | `boolean` | `true` | Load last page if empty |
| `includeNetwork` | `boolean` | `true` | Prefix endpoint with network |
| `dataProcessingCallback` | `function` | — | Post-process records |
| `autoLoad` | `boolean` | `true` | Auto-load on mount |
| `updateLocation` | `boolean\|function` | `true` | Update browser query string |

Returns `ExplorerApiListResponse` with `data`, `loaded`, `loading`, `load(page)`, `reset()`, `canLoadNextPage`, `canLoadPrevPage`.

```jsx
import {useExplorerPaginatedApi} from '@stellar-expert/ui-framework'

const assets = useExplorerPaginatedApi(
    {path: 'asset/', query: {sort, search: navigation.query.search}},
    {autoReverseRecordsOrder: true, defaultSortOrder: order, limit: 20}
)
```

#### `loadTransaction(txHashOrId)`

Load a single transaction by hash or ID. Returns a Promise.

#### `loadLedgerTransactions(sequence)`

Load all transactions for a given ledger sequence.

#### `ExplorerBatchInfoLoader`

Batches multiple individual load requests into single API calls.

```jsx
const loader = new ExplorerBatchInfoLoader(
    batch => fetchExplorerApi('directory' + stringifyQuery({address: batch})),
    entry => ({key: entry.address, info: entry})
)
const result = await loader.loadEntry(address)
```

#### `ledgerStream`

Singleton for subscribing to new ledger notifications via long-polling.

| Method | Description |
|--------|-------------|
| `on(listener)` | Subscribe to new ledgers |
| `off(listener)` | Unsubscribe |
| `getLast()` | Fetch most recent ledger |
| `getLastSequence()` | Fetch most recent ledger sequence |

---

### Horizon API

#### `initHorizon()`

Create a new Horizon.Server instance using `window.horizonOrigin`.

#### `loadAllHorizonRecords(query)`

Load all records from a Horizon query using cursor-based pagination.

#### `applyListQueryParameters(query, params?)`

Apply `cursor`, `order`, and `limit` to a Horizon query builder.

#### `loadLedgers(queryParams?)`, `loadLedger(sequence)`, `streamLedgers(cursor, onNewLedger)`

Ledger-related Horizon API helpers.

#### `loadTransactions(queryParams?)`, `streamTransactions(cursor, onNewTx, includeFailed?)`, `submitTransaction(tx)`

Transaction-related Horizon API helpers.

#### `loadAccount(address)`, `loadIssuedAssets(account, queryParams?)`, `loadAccountOffers(account, queryParams?)`, `loadAccountClaimableBalances(account)`

Account-related Horizon API helpers.

#### `getAccountLockStatus(account)`

Returns `'unlocked'`, `'locked'`, or `'partially locked'`.

#### `getAccountBalance(account, asset?)`

Returns `{total, available, asset}` for a given balance.

#### `loadOrderbook(selling, buying, queryParams?)`

Load orderbook from Horizon.

#### `loadMarketTrades(baseAsset, counterAsset, queryParams?)`, `streamMarketTrades(cursor, baseAsset, counterAsset, onNewTrade)`, `streamTrades(cursor, onNewTrade)`, `loadTradesAggregation(params)`

DEX trades Horizon API helpers.

---

### UI Controls

#### `Button`

Versatile button rendered as `<button>` or `<a>`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `href` | `string` | — | Renders as `<a>` tag |
| `onClick` | `function` | — | Click handler |
| `block` | `boolean` | `false` | Block-level |
| `outline` | `boolean` | `false` | Outline style |
| `clear` | `boolean` | `false` | Text only |
| `small` | `boolean` | `false` | Small size |
| `disabled` | `boolean` | `false` | Disabled state |
| `loading` | `boolean` | `false` | Loading animation |
| `className` | `string` | — | CSS classes |
| `children` | `ReactNode` | — | Button content |

```jsx
import {Button} from '@stellar-expert/ui-framework'

<Button block outline href="/signup">Create new account</Button>
<Button block disabled={disabled} loading={inProgress} onClick={proceed}>Submit</Button>
```

#### `ButtonGroup`

Groups buttons with consistent spacing.

| Prop | Type | Description |
|------|------|-------------|
| `inline` | `boolean` | Render as `<span>` |
| `children` | `ReactNode` | Nested buttons |

#### `Dropdown`

Customizable dropdown select component.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `options` | `Array<DropdownOption\|string>` | — | Available options |
| `value` | `string\|number` | — | Selected value |
| `onChange` | `function` | — | Change handler |
| `title` | `any` | — | Display title |
| `disabled` | `boolean` | `false` | Disabled state |
| `showToggle` | `boolean` | `true` | Toggle arrow |
| `solo` | `boolean` | `false` | Centered dialog mode |
| `maxHeight` | `string` | `'35em'` | Max list height |

```jsx
import {Dropdown} from '@stellar-expert/ui-framework'

<Dropdown options={orderOptions} onChange={setSort} value={sort}/>
<Dropdown options={networks} value={network} onChange={updateNetwork}/>
```

#### `Tabs`

Tabbed interface with optional URL query parameter sync.

| Prop | Type | Description |
|------|------|-------------|
| `tabs` | `TabDescriptor[]` | Tab definitions (`{name, title, render?, isDefault?}`) |
| `selectedTab` | `string` | Controlled selected tab |
| `onChange` | `function` | Tab change handler |
| `queryParam` | `string` | Query parameter for URL sync |
| `right` | `boolean` | Right-align tabs |

```jsx
import {Tabs} from '@stellar-expert/ui-framework'

<Tabs right queryParam="type"
      tabs={[
          {name: 'all', title: 'All', isDefault: true},
          {name: 'trade', title: 'Trades'}
      ]}
      selectedTab={type}
      onChange={tabName => setType(tabName)}/>
```

#### `Tooltip`

Tooltip with automatic positioning.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `trigger` | `ReactElement` | — | Element that triggers the tooltip |
| `desiredPlace` | `'top'\|'bottom'\|'left'\|'right'` | `'top'` | Preferred position |
| `activation` | `'hover'\|'click'` | `'hover'` | Activation mode |
| `maxWidth` | `string` | — | Max tooltip width |
| `children` | `ReactNode` | — | Tooltip content |

#### `InfoTooltip`

Help icon with tooltip and optional "Read more" link.

| Prop | Type | Description |
|------|------|-------------|
| `children` | `ReactNode` | Tooltip content |
| `link` | `string` | "Read more" URL |
| `icon` | `string` | Icon CSS class |

```jsx
import {InfoTooltip} from '@stellar-expert/ui-framework'

<InfoTooltip link="https://example.com/docs">
    Explanation text shown on hover.
</InfoTooltip>
```

#### `CodeBlock`

Syntax-highlighted code block.

| Prop | Type | Description |
|------|------|-------------|
| `children` | `string` | Source code |
| `lang` | `'js'\|'json'\|'html'\|'xml'\|'toml'\|'rust'\|'plain'` | Language |

```jsx
import {CodeBlock} from '@stellar-expert/ui-framework'

<CodeBlock lang="rust">{contractSourceCode}</CodeBlock>
```

#### `UpdateHighlighter`

Briefly highlights content with animation when children change.

```jsx
<UpdateHighlighter>{formatPrice(1 / market.price, 4)}</UpdateHighlighter>
```

#### `Slider`

Range input slider with optional category labels.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | `min` | Current value |
| `onChange` | `function` | — | Change handler (throttled) |
| `min` | `number` | `0` | Minimum |
| `max` | `number` | `100` | Maximum |
| `step` | `number` | `1` | Step |

#### `ExternalLink`

Link opening in a new tab with `rel="noreferrer noopener"`.

```jsx
<ExternalLink href="https://example.com">Read more</ExternalLink>
```

---

### Interaction

#### `BlockSelect`

Block that auto-selects all its text content on focus.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `as` | `string` | `'span'` | HTML tag |
| `wrap` | `boolean` | — | Enable/disable text wrapping |
| `inline` | `boolean` | — | Inline display |

```jsx
import {BlockSelect} from '@stellar-expert/ui-framework'

<BlockSelect>{originalAddress}</BlockSelect>
<BlockSelect inline className="condensed">{transaction.sequence}</BlockSelect>
```

#### `CopyToClipboard`

Copy-to-clipboard wrapper with default copy icon.

| Prop | Type | Description |
|------|------|-------------|
| `text` | `string` | Text to copy |
| `children` | `ReactNode` | Custom trigger (defaults to copy icon) |
| `title` | `string` | Tooltip text |

```jsx
import {CopyToClipboard} from '@stellar-expert/ui-framework'

<CopyToClipboard text={publicKey}>
    <a href="#" className="icon-copy active-icon" title="Copy account address"/>
</CopyToClipboard>
```

#### `Spoiler`

Expandable/collapsible content toggle.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `expanded` | `boolean` | `false` | Initial state |
| `showMore` | `string` | `'Show more'` | Expand label |
| `showLess` | `string` | `'Show less'` | Collapse label |
| `onChange` | `function` | — | Toggle callback |
| `micro` | `boolean` | — | Icon-only mode |
| `children` | `ReactNode` | — | Hidden content |

```jsx
import {Spoiler} from '@stellar-expert/ui-framework'

<Spoiler expanded={extended}
         onChange={e => setExtended(e.expanded)}
         showMore="Show extended info"
         showLess="Hide extended info"/>
```

#### `Accordion`

Collapsible panel group (one panel open at a time).

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `options` | `AccordionOption[]` | — | Panel definitions (`{key, title, content}`) |
| `collapsedSymbol` | `string` | `'+'` | Collapsed prefix |
| `expandedSymbol` | `string` | `'-'` | Expanded prefix |

```jsx
import {Accordion} from '@stellar-expert/ui-framework'

<Accordion options={[
    {key: 'overview', title: 'Overview', content: <OverviewPanel/>},
    {key: 'details', title: 'Details', content: <DetailsPanel/>}
]}/>
```

#### `ThemeSelector`

Theme toggle button switching between day (light) and night (dark) themes.

```jsx
<ThemeSelector/>
```

#### `InlineProgress`

Animated dots progress indicator.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dots` | `number` | `5` | Max dots |

#### `useWindowWidth()`

React hook that tracks window width (throttled).

```jsx
const width = useWindowWidth()
```

#### `QrCode`

QR code renderer with optional embedded logo.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | — | Value to encode |
| `size` | `number` | `320` | QR code size |
| `caption` | `string` | — | Caption below QR |
| `embeddedImage` | `string` | — | Logo URL |
| `embeddedSize` | `number` | 10% of size | Logo size |

```jsx
import {QrCode} from '@stellar-expert/ui-framework'

<QrCode value={accountAddress} size={240}
        embeddedImage="/img/logo-square.svg" embeddedSize={36}/>
```

#### `Dialog`

Modal dialog overlay.

| Prop | Type | Description |
|------|------|-------------|
| `dialogOpen` | `boolean` | Whether dialog is visible |
| `children` | `ReactNode` | Dialog content |

```jsx
<Dialog dialogOpen={isOpen}><AuthRequestView/></Dialog>
```

#### `SystemDialog`

Replaces built-in `alert()` and `confirm()` with styled dialog versions.

```jsx
<SystemDialog/>
```

#### `useAutoFocusRef`

Ref callback that auto-focuses an element after a short delay.

```jsx
const inputRef = useAutoFocusRef()
return <input ref={inputRef} />
```

---

### Date Components

#### `UtcTimestamp`

Displays a formatted UTC timestamp.

| Prop | Type | Description |
|------|------|-------------|
| `date` | `string\|number\|Date` | Timestamp to format |
| `dateOnly` | `boolean` | Show date without time |

```jsx
import {UtcTimestamp} from '@stellar-expert/ui-framework'

<UtcTimestamp date={created} dateOnly/>
<UtcTimestamp date={offer.created}/>
```

#### `ElapsedTime`

Displays relative time (e.g., "3m ago").

| Prop | Type | Description |
|------|------|-------------|
| `ts` | `Date\|string\|number` | Timestamp |
| `suffix` | `string` | Appended text |

```jsx
import {ElapsedTime} from '@stellar-expert/ui-framework'

<ElapsedTime ts={new Date(tx.createdAt)} suffix=" ago"/>
```

#### `DateSelector`

Date/time input selector.

| Prop | Type | Description |
|------|------|-------------|
| `value` | `string\|number\|Date` | Current date value |
| `onChange` | `function` | Returns Unix timestamp or null |
| `min` | `string` | Min date |
| `max` | `string` | Max date |

#### `trimIsoDateSeconds(date)`

Trims seconds from an ISO date string. Returns a string like `"2024-01-15T10:30"`.

---

### Ledger Components

#### `TxLink`, `OpLink`, `LedgerLink`, `OfferLink`, `PoolLink`

Links to StellarExpert ledger entries.

| Component | ID Prop | Type |
|-----------|---------|------|
| `TxLink` | `tx` | `string` |
| `OpLink` | `op` | `string` |
| `LedgerLink` | `sequence` | `number` |
| `OfferLink` | `offer` | `string` |
| `PoolLink` | `pool` | `string` |

All accept optional `network` and `children` props.

```jsx
import {TxLink, OfferLink} from '@stellar-expert/ui-framework'

<TxLink tx={tx.txHash}>
    <ElapsedTime ts={new Date(tx.createdAt)} suffix=" ago"/>
</TxLink>
<OfferLink offer={offer.id}/>
```

#### `formatExplorerLink(type, id, network?)`

Generate an explorer URL for a given entry type and ID.

```jsx
const url = formatExplorerLink('contract', contract.address + '/versions')
```

#### `retrieveLedgerInfo(data)`

Parse raw ledger data (including XDR header) into structured `LedgerInfo`.

---

### Account Components

#### `AccountAddress`

Explorer link for Stellar addresses with identicon and directory info.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `account` | `string` | — | StrKey-encoded address |
| `chars` | `number\|'all'` | `8` | Visible characters |
| `name` | `string\|false` | — | Display name override |
| `link` | `string\|false` | — | Link override |
| `icon` | `boolean` | `true` | Show identicon |
| `network` | `string` | — | Network override |

```jsx
import {AccountAddress} from '@stellar-expert/ui-framework'

<AccountAddress account={address} chars={12}/>
<AccountAddress account={address} name={false} network={network} chars={12}/>
<AccountAddress account={address} className="plain" link={false} chars="all"/>
```

#### `AccountIdenticon`

Renders an account-specific identicon.

| Prop | Type | Description |
|------|------|-------------|
| `address` | `string` | StrKey-encoded address |
| `size` | `number` | Display size |

#### `drawIdenticon(address, size?)`

Generate an SVG identicon string for a Stellar address.

#### `SignerKey`

Account signer key display with weight.

| Prop | Type | Description |
|------|------|-------------|
| `signer` | `Object` | Signer object (raw XDR or parsed) |
| `showWeight` | `boolean` | Show weight (default `true`) |

#### `calculateAvailableBalance(account, balance, additionalReserves?, decimals?)`

Calculate available balance for an account trustline, accounting for reserves and liabilities.

---

### Asset Components

#### `AssetLink`

Explorer link for assets with icon and issuer display.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `asset` | `string\|AssetDescriptor` | — | Asset descriptor |
| `link` | `string\|false` | — | Link override |
| `issuer` | `boolean` | `true` | Show issuer |
| `icon` | `boolean` | `true` | Show icon |

```jsx
import {AssetLink} from '@stellar-expert/ui-framework'

<AssetLink asset={descriptor}/>
<AssetLink asset={xrf} issuer={false} icon={false}/>
```

#### `AssetIssuer`

Inline asset issuer display (domain or shortened address).

#### `AssetIcon`

Asset icon from metadata or identicon fallback.

#### `AssetSelector`

Asset search and selection dropdown.

| Prop | Type | Description |
|------|------|-------------|
| `onChange` | `function` | Selection callback |
| `value` | `string` | Selected asset |
| `predefinedAssets` | `string[]` | Assets shown at top |
| `restricted` | `boolean` | Limit to predefined list |
| `title` | `string` | Dropdown title |

```jsx
import {AssetSelector} from '@stellar-expert/ui-framework'

<AssetSelector value={asset}
               onChange={select}
               title="Choose an asset"/>
```

#### `Amount`

Formatted token amount with optional asset link.

| Prop | Type | Description |
|------|------|-------------|
| `amount` | `string\|number` | Token amount |
| `asset` | `string\|AssetDescriptor` | Asset descriptor |
| `decimals` | `number\|'auto'` | Decimal precision |
| `adjust` | `boolean` | Treat as raw Int64 stroops |
| `round` | `boolean\|'floor'` | Round the amount |
| `issuer` | `boolean` | Show issuer |
| `icon` | `boolean` | Show icon |

```jsx
import {Amount} from '@stellar-expert/ui-framework'

<Amount amount={supply} adjust round/>
<Amount asset={offer.selling} amount={offer.amount} adjust/>
<Amount amount={total} asset={xrf} adjust issuer={false}/>
```

#### `useAssetMeta(asset)`

React hook that fetches and caches asset metadata. Returns `AssetMeta` or null.

#### `useAssetList(params?)`

React hook for fetching a paginated, searchable asset list. Returns `{assets, loadPage, loading}`.

---

### DEX Components

#### `PriceDynamic`

Price change percentage indicator with positive/negative styling.

| Prop | Type | Description |
|------|------|-------------|
| `change` | `number` | Pre-calculated percentage |
| `current` | `number` | Current price |
| `prev` | `number` | Previous price |
| `standalone` | `boolean` | Standalone styling |
| `allowZero` | `boolean` | Show 0% |

---

### Directory

#### `getDirectoryEntry(address, options?)`

Async function to fetch a directory entry.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `forceRefresh` | `boolean` | `false` | Bypass cache |
| `extended` | `boolean` | `false` | Extended info |

#### `useDirectory(address, options?)`

React hook for directory info. Returns the directory entry or null.

```jsx
const directoryInfo = useDirectory(address)
```

#### `useDirectoryTags()`

React hook that fetches all available directory tags.

---

### Transaction & Operations

#### `TxOperationsList`

Renders a list of transaction operations with optional effects.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `parsedTx` | `ParsedTxDetails` | — | Parsed transaction |
| `filter` | `function` | — | Filter operations |
| `showFees` | `boolean` | `true` | Show fee effects |
| `compact` | `boolean` | `false` | Compact view |
| `showEffects` | `boolean` | — | Show effects toggle |

```jsx
import {TxOperationsList} from '@stellar-expert/ui-framework'

<TxOperationsList parsedTx={parsedTx}/>
<TxOperationsList parsedTx={tx} compact showFees={false}/>
```

#### `parseTxDetails(params)`

Parse transaction details from raw XDR.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `network` | `string` | Yes | Network passphrase |
| `txEnvelope` | `string` | Yes | Base64 tx envelope XDR |
| `result` | `string` | No | Base64 tx result |
| `meta` | `string` | No | Base64 tx meta |
| `context` | `TxFiltersContext` | No | Filter context |
| `createdAt` | `string` | No | Timestamp |
| `protocol` | `number` | No | Protocol version |

```jsx
import {parseTxDetails} from '@stellar-expert/ui-framework'

const parsedTx = parseTxDetails({
    network: appSettings.networkPassphrase,
    txEnvelope: txResponse.body,
    result: txResponse.result,
    meta: txResponse.meta,
    createdAt: txResponse.ts,
    context: {},
    protocol: txResponse.protocol
})
```

#### `useTxHistory(params)`

React hook for paginated transaction history.

```jsx
const historyModel = useTxHistory({
    filters: {account: [address]},
    order: 'desc',
    rows: 50,
    updateLocation: false
})
```

#### `useTxInfo(idOrHash)`

React hook for transaction details by ID or hash.

---

### Filters

#### `FilterView`

Composable filter panel for managing search filters with URL query parameter sync. Supports multiple filter types including accounts, assets, operation types, timestamps, offers, and liquidity pools.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `presetFilter` | `object` | — | Initial base filters always applied |
| `fields` | `object` | `{}` | Filter field definitions keyed by field name |
| `onChange` | `function` | — | Callback receiving merged preset + user filters |

Each entry in `fields` is a `FilterFieldDescriptor`:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `icon` | `string` | — | Icon class suffix (prepended with `icon-`) |
| `title` | `string` | — | Short title in filter condition |
| `description` | `string` | — | Tooltip / "Add filter" dropdown text |
| `multi` | `boolean` | `true` | Allow multiple values for this field |

Supported field keys: `type`, `account`, `source`, `destination`, `asset`, `src_asset`, `dest_asset`, `from`, `to`, `memo`, `offer`, `pool`, `topic`.

```jsx
import {FilterView, parseFiltersFromQuery} from '@stellar-expert/ui-framework'

<FilterView
    presetFilter={{account: [address]}}
    fields={{
        type: {icon: 'hexagon', title: 'Type', description: 'Operation type'},
        asset: {icon: 'asset', title: 'Asset', description: 'Asset involved'},
        from: {icon: 'clock', title: 'From', description: 'Start date', multi: false},
        to: {icon: 'clock', title: 'To', description: 'End date', multi: false}
    }}
    onChange={filters => setActiveFilters(filters)}/>
```

#### `parseFiltersFromQuery(fields)`

Parses and validates filter parameters from the current URL query string against passed field definitions. Returns an object with matched filter key-value pairs.

---

### App Navigation

#### `navigation`

Controller wrapping the shared `history` instance.

| Property / Method | Type | Description |
|--------------------|------|-------------|
| `history` | `History` | Shared `history` instance |
| `query` | `object` | Current parsed query params (frozen) |
| `path` | `string` | Current location pathname |
| `action` | `string` | Most recent navigation action (`'PUSH'`\|`'REPLACE'`\|`'POP'`) |
| `hash` | `string` | Current location hash (get/set) |
| `preventNavigationInsideIframe` | `boolean` | When `true`, navigates the top-level window instead of routing internally while embedded in an iframe |
| `updateQuery(paramsToSet, replace?)` | `function` | Merge (or replace) query params via `history.replace`, without adding a history entry |
| `navigate(url)` | `function` | Navigate to a new URL (adds a history entry) |
| `listen(handler)` | `function` | Subscribe to location changes; returns an unsubscribe function |
| `stopListening(handler)` | `function` | Unsubscribe a previously registered handler |

```jsx
import {navigation} from '@stellar-expert/ui-framework'

navigation.navigate(`/explorer/${network}/asset/${code}`)
navigation.updateQuery({sort: 'desc'})

const unsubscribe = navigation.listen(nav => console.log(nav.path, nav.query))
```

#### `parseQuery(query?, dest?)`

Parse a URL query string (defaults to the current location's search) into a plain object. Repeated `key[]=` params are collected into arrays.

#### `stringifyQuery(query?)`

Serialize a query params object into a URL query string, including the leading `?`. Omits `undefined`/`null`/`''` values.

```jsx
import {parseQuery, stringifyQuery} from '@stellar-expert/ui-framework'

stringifyQuery({sort: 'desc', tag: ['dex', 'amm']}) // '?sort=desc&tag[]=dex&tag[]=amm'
parseQuery('?sort=desc&tag[]=dex&tag[]=amm') // {sort: 'desc', tag: ['dex', 'amm']}
```

#### `parsePath(path)`, `createPath(location)`

Re-exported from the `history` package — parse a path string into `{pathname, search, hash}`, or build a path string from a partial location object.

#### `bindClickNavHandler(container)`

Attaches a delegated click handler on `container` that intercepts same-origin, non-modified link clicks and routes them through `navigation.navigate()` instead of a full page reload. Call once at app startup.

```jsx
import {bindClickNavHandler} from '@stellar-expert/ui-framework'

bindClickNavHandler(document.body)
```

---

### App Router

Client-side router built on top of `navigation`/`history`.

#### `Router`

Top-level router. Subscribes to a shared `history` instance and propagates the current location via context.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `history` | `History` | shared singleton | History instance |
| `children` | `ReactNode` | — | Router content |

#### `Route`

Renders its content when the current location matches `path`.

| Prop | Type | Description |
|------|------|-------------|
| `path` | `string` | Route pattern (e.g. `/explorer/:network/asset/:asset`); omit for an always-matching fallback |
| `exact` | `boolean` | Require an exact pathname match |
| `component` | `ComponentType` | Rendered with `{history, location, match}` props |
| `children` | `ReactNode` | Alternative to `component` |

#### `RouterSwitch`

Renders the first child `Route`/`Redirect` whose path matches the current location (first-match-wins).

#### `Redirect`

Imperatively redirects to another location as a side effect.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `to` | `string` | — | Target URL |
| `push` | `boolean` | `false` | Push a new history entry instead of replacing the current one |

```jsx
import {Router, RouterSwitch, Route, Redirect} from '@stellar-expert/ui-framework'

<Router>
    <RouterSwitch>
        <Route path="/explorer/:network/asset/:asset" component={AssetView}/>
        <Route path="/explorer/:network/account/:id" component={AccountView}/>
        <Redirect to="/explorer/public"/>
    </RouterSwitch>
</Router>
```

#### `useLocation()`, `useParams()`, `useRouteMatch()`

Hooks for reading the current router state.

```jsx
import {useParams, useLocation, useRouteMatch} from '@stellar-expert/ui-framework'

function AssetView() {
    const {network, asset} = useParams()
    const {pathname, search} = useLocation()
    const {path, isExact} = useRouteMatch()
    //...
}
```

#### `withRouter(Component)`

Higher-order component injecting `{history, location, match}` props from the router context.

```jsx
import {withRouter} from '@stellar-expert/ui-framework'

export default withRouter(function AssetView({location, match}) {
    //...
})
```

---

### Effects

#### `EffectDescription`

Renders a human-readable description of a transaction effect.

| Prop | Type | Description |
|------|------|-------------|
| `effect` | `Object` | Parsed effect with `type` field |
| `operation` | `Object` | Parent operation context |

---

### Contract / Soroban

#### `useContractInfo(address)`

React hook for fetching contract information. Returns `ExplorerApiResult`.

#### `generateContractSourceLink(hash)`

Generate a URL to download contract WASM source.

#### `useContractSource(hash)`

React hook for fetching contract WASM binary. Returns `ArrayBuffer`, `null`, or `undefined` (loading).

#### `ScVal`

Renders Stellar smart contract values in human-readable format.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string\|xdr.ScVal\|Array` | — | ScVal (base64 XDR, parsed, or array) |
| `indent` | `boolean` | `false` | Block-level indentation |

```jsx
import {ScVal} from '@stellar-expert/ui-framework'

<ScVal value={entry.key} indent/>
<ScVal value={entry.value} indent/>
```

#### `parseScValValue(value)`

Parse a base64-encoded XDR ScVal string into an `xdr.ScVal` object.

#### `ScValStruct`

Structural wrapper for ScVal elements (handles indentation and separators).

#### `primitiveTypes`

`Set<string>` of primitive ScVal type identifiers.

---

### Stellar Utilities

#### `parseStellarGenericId(id)`

Parse a Stellar generic ID into components. Returns `{type, id, ledger, tx, operationOrder}`.

```jsx
const {tx: txid, operationOrder} = parseStellarGenericId(term)
```

#### `decodeKeyType(key)`

Decode a Stellar key into its type and components. Returns `{address, type, muxedId?, publicKey?, payload?}` or `null`.

#### `parseMuxedAccount(muxedAddress)`

Parse a multiplexed address. Returns `{address, muxedId}`.

#### `encodeMuxedAccount(address, muxedId)`

Encode an address and BigInt ID into a multiplexed address.

#### `signatureHintToMask(hint)`

Convert a signature hint Buffer to a StrKey mask string.

#### `formatSignatureHint(hint)`

Format a signature hint for display.

#### `signatureHintMatchesKey(hint, key)`

Check if a hint matches a key.

#### `findKeyBySignatureHint(hint, allKeys)`

Find a key matching a signature hint.

#### `findSignatureByKey(key, allSignatures?)`

Find a transaction signature for a given signer key.

#### `findKeysBySignatureHint(signature, keys)`

Find all keys matching a signature's hint.

```jsx
const possibleSigners = findKeysBySignatureHint(signature, potentialSigners)
```

---

### Charts

SVG charting engine with a StellarExpert theme pre-applied.

#### `Chart`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `options` | `object` | — | Chart data and options (engine format); `undefined` renders `ChartLoader` |
| `type` | `'Chart'\|'StockChart'` | `'Chart'` | `StockChart` adds navigator/range-selector support |
| `title` | `ReactNode` | — | Title rendered above the plot |
| `inline` | `boolean` | `false` | Render as inline-block (sparkline charts) |
| `grouped` | `boolean` | `false` | Downsample dense series into time buckets |
| `range` | `true\|false\|'year'\|'month'` | `false` | Enable the range selector / set the initial visible window |
| `noLegend` | `boolean` | `false` | Hide the legend section |
| `container` | `string` | `'segment blank'` | Container CSS class |
| `modules` | `function[]` | — | Additional engine modules to register, each called as `module(ChartEngine)` |
| `children` | `ReactNode` | — | Optional content added to the chart header |

```jsx
import {Chart} from '@stellar-expert/ui-framework'

<Chart type="StockChart" range="year" title="XLM price"
       options={{
           series: [{type: 'area', name: 'Price', data: priceHistory}]
       }}/>

<Chart inline options={{series: [{type: 'line', data: sparklineData}]}}/>
```

`Chart` is `null`-safe while data is loading — pass `options={undefined}` and it renders `ChartLoader` automatically. `Chart.Loader` and `Chart.withErrorBoundary` are also exposed as static properties on the component for convenience.

#### `ChartEngine`

The underlying charting engine namespace (`Chart`, `StockChart`, `setOptions`, `getOptions`, `Color`, `Axis`, `merge`), exposed for advanced use (registering custom modules, tweaking global theme options).

```jsx
import {ChartEngine} from '@stellar-expert/ui-framework'

ChartEngine.setOptions({chart: {backgroundColor: 'transparent'}})
```

#### `ChartLoader`

Placeholder shown while a chart's data is loading (or unavailable).

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `ReactNode` | — | Title rendered above the placeholder |
| `unavailable` | `boolean` | `false` | Show "Data unavailable" instead of the loading animation |
| `container` | `string` | `'segment blank'` | Container CSS class |

```jsx
import {ChartLoader} from '@stellar-expert/ui-framework'

<ChartLoader title="XLM price" unavailable={loadError}/>
```

---

## License

MIT
