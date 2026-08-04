import React from 'react';

// ============================================================================
// Shared Types
// ============================================================================

export type StellarNetwork = 'public' | 'testnet';

// ============================================================================
// Modules
// ============================================================================

export interface DynamicModuleProps {
    /** Dynamic import function, e.g. () => import('./module') */
    load: () => Promise<any>;
    /** Unique module name for caching */
    module?: string;
    [key: string]: any;
}

export const DynamicModule: React.FC<DynamicModuleProps>;

// ============================================================================
// State Management
// ============================================================================

/**
 * React hook that auto-reinitializes state when dependencies change (deep comparison)
 */
export function useDependantState<T>(
    stateInitializer: ((dependencies: any[], prevState?: T) => T) | T,
    dependencies: any[],
    finalizer?: () => void
): [T, (newState: T | ((prev: T) => T)) => void];

/** Simple force-update hook */
export function useForceUpdate(): () => void;

/** useEffect with deep comparison on dependencies */
export function useDeepEffect(effect: React.EffectCallback, dependencies: any[]): void;

/** Hook that tracks element visibility using IntersectionObserver */
export function useOnScreen(root: React.RefObject<Element>, rootMargin?: string): boolean;

/** Get current Stellar network */
export function getCurrentStellarNetwork(): StellarNetwork;

/** Set current Stellar network and notify all subscribers */
export function setStellarNetwork(network: StellarNetwork): void;

/** Subscribe to Stellar network change events */
export function subscribeToStellarNetworkChange(onChange: (network: StellarNetwork) => void): void;

/** React hook that returns current Stellar network and re-renders on change */
export function useStellarNetwork(): StellarNetwork;

/** React hook that tracks screen orientation */
export function useScreenOrientation(): OrientationType;

/** Whether the Page Visibility API is supported */
export const isDocumentVisibilitySupported: boolean;

/** Check if the document tab is currently visible */
export function isDocumentVisible(): boolean;

/** Register a listener for document visibility changes; returns unsubscribe function */
export function addVisibilityChangeListener(listener: (visible: boolean) => void): () => void;

/** React hook for managing day/night theme */
export function useTheme(): [string, (theme: string | ((current: string) => string)) => void];

// ============================================================================
// Page Meta Tags
// ============================================================================

export interface PageMeta {
    /** Page title */
    title: string;
    /** Page description */
    description: string;
    /** Page image URL */
    image?: string;
    /** Custom metadata tags */
    customMeta?: MetaTagReplacement;
}

export interface MetaTagReplacement {
    /** HTML tag name to search for (defaults to "meta") */
    tag?: string;
    /** Tag attribute used to locate existing tags */
    locator: string;
    /** Tag properties to set */
    tags: Array<{ name: string; content: string; attribute?: string }>;
}

/** Initialize default meta properties for the application */
export function initMeta(appMetaProps: {
    serviceTitle: string;
    description: string;
    origin: string;
    image?: string;
    imageEndpoint?: string;
}): void;

/** Set or remove the robots noindex meta tag */
export function setPageNoIndex(noIndex: boolean): void;

/** React hook for setting page metadata (title, description, image) */
export function usePageMetadata(meta: PageMeta): void;

// ============================================================================
// Explorer API
// ============================================================================

export interface APIEndpointParams {
    path: string;
    query?: Record<string, any>;
}

export class ExplorerApiResult {
    constructor(apiEndpoint: string, data?: any, ts?: number);
    /** Relative API URL */
    apiEndpoint: string;
    /** API response data */
    data: any;
    /** Response error message */
    error?: string;
    /** HTTP status code */
    status: number;
    /** Response timestamp */
    fetchedAt: number;
    /** Whether data or error has been received */
    readonly loaded: boolean;
}

/** Fetch data from Explorer API with caching */
export function fetchData(
    url: string,
    ttl?: number,
    processResult?: (data: any) => any
): Promise<{ data: any; ts: number }>;

export interface UseExplorerApiOptions {
    /** Auto-refresh interval in seconds */
    refreshInterval?: number;
    /** Cache time-to-live in seconds */
    ttl?: number;
    /** Callback to transform the response */
    processResult?: (data: any) => any;
    /** Allow stale data during URL transitions */
    allowStaleDataTransition?: boolean;
}

/** React hook for fetching data from the Explorer API */
export function useExplorerApi(
    apiEndpoint: string | APIEndpointParams,
    options?: UseExplorerApiOptions
): ExplorerApiResult;

export interface ExplorerApiListResponse {
    /** Data retrieved from the server */
    data: any[];
    /** Whether response has loaded */
    loaded: boolean;
    /** Whether a request is in progress */
    loading: boolean;
    /** Load page function (1 for next, -1 for previous) */
    load: (page?: 1 | -1) => Promise<ExplorerApiListResponse>;
    /** Reset to initial state */
    reset: () => void;
    /** Whether a previous page is available */
    canLoadPrevPage: boolean;
    /** Whether a next page is available */
    canLoadNextPage: boolean;
}

export interface UseExplorerPaginatedApiOptions {
    /** Cache time-to-live in seconds */
    ttl?: number;
    /** Rows per page */
    limit?: number;
    /** Reverse records order to match default grid order */
    autoReverseRecordsOrder?: boolean;
    /** Default sort order */
    defaultSortOrder?: 'asc' | 'desc';
    /** Load last meaningful page if no results returned */
    autoLoadLastPage?: boolean;
    /** Include network prefix in the endpoint */
    includeNetwork?: boolean;
    /** Default query parameter values */
    defaultQueryParams?: Record<string, any>;
    /** Callback for post-processing fetched data */
    dataProcessingCallback?: (records: any[]) => any[];
    /** Auto-load on mount */
    autoLoad?: boolean;
    /** Update browser query string on navigation */
    updateLocation?: boolean | ((params: Record<string, any>) => Record<string, any>);
}

/** React hook for fetching paginated data from the Explorer API */
export function useExplorerPaginatedApi(
    apiEndpoint: string | APIEndpointParams,
    options?: UseExplorerPaginatedApiOptions,
    dependencies?: any[]
): ExplorerApiListResponse;

/** Load a single transaction by hash or ID */
export function loadTransaction(txHashOrId: string): Promise<any>;

/** Load all transactions for a given ledger sequence */
export function loadLedgerTransactions(sequence: number): Promise<any[]>;

/** Batches multiple load requests into single API calls */
export class ExplorerBatchInfoLoader {
    constructor(
        fetchCallback: (keys: string[]) => Promise<any>,
        processResponseCallback: (entry: any) => { key: string; info: any }
    );
    /** Load a single entry by key (batched with other pending requests) */
    loadEntry(key: string): Promise<any>;
}

/** Singleton ledger stream for subscribing to new ledger notifications */
export const ledgerStream: {
    /** Subscribe to new ledger events */
    on(listener: (ledger: number) => void): void;
    /** Unsubscribe from ledger events */
    off(listener: (ledger: number) => void): void;
    /** Fetch the most recent ledger info */
    getLast(): Promise<any>;
    /** Fetch the sequence number of the most recent ledger */
    getLastSequence(): Promise<number>;
};

// ============================================================================
// Horizon API
// ============================================================================

export interface ParsedStellarId {
    type: 'unknown' | 'ledger' | 'transaction' | 'operation';
    id?: string;
    ledger?: number;
    tx?: string;
    operationOrder?: number;
}

/** Parse a Stellar generic ID into its components */
export function parseStellarGenericId(id: string): ParsedStellarId;

export interface ListQueryParams {
    cursor?: string;
    order?: 'asc' | 'desc';
    limit?: number;
}

/** Initialize a Horizon server instance */
export function initHorizon(): any;

/** Load all records from a Horizon query using pagination */
export function loadAllHorizonRecords(query: any): Promise<{ records: any[] }>;

/** Apply cursor, order, and limit to a Horizon query builder */
export function applyListQueryParameters(query: any, queryParameters?: ListQueryParams): any;

/** Load ledgers from Horizon */
export function loadLedgers(queryParams?: ListQueryParams): Promise<any[]>;

/** Load a single ledger by sequence number */
export function loadLedger(sequence: number): Promise<any>;

/** Stream new ledgers from Horizon */
export function streamLedgers(cursor: string, onNewLedger: (ledger: any) => void): () => void;

/** Load transactions from Horizon */
export function loadTransactions(queryParams?: ListQueryParams): Promise<any[]>;

/** Stream new transactions from Horizon */
export function streamTransactions(cursor: string, onNewTx: (tx: any) => void, includeFailed?: boolean): () => void;

/** Submit a transaction to the Stellar network */
export function submitTransaction(tx: any): Promise<any>;

/** Load account details from Horizon */
export function loadAccount(accountAddress: string): Promise<any>;

/** Load assets issued by an account */
export function loadIssuedAssets(account: string, queryParams?: ListQueryParams): Promise<any[]>;

/** Load active offers for an account */
export function loadAccountOffers(account: string, queryParams?: ListQueryParams): Promise<any[]>;

/** Load claimable balances for an account */
export function loadAccountClaimableBalances(account: string): Promise<any[]>;

/** Get the lock status of an account */
export function getAccountLockStatus(account: any): 'unlocked' | 'locked' | 'partially locked';

/** Get balance details for an account */
export function getAccountBalance(account: any, asset?: { code: string; issuer?: string }): {
    total: string;
    available: string;
    asset: any;
};

/** Load orderbook from Horizon */
export function loadOrderbook(selling: any, buying: any, queryParams?: ListQueryParams): Promise<any[]>;

/** Load recent trades for a market pair */
export function loadMarketTrades(baseAsset: any, counterAsset: any, queryParams?: ListQueryParams): Promise<any[]>;

/** Stream new trades for a market pair */
export function streamMarketTrades(cursor: string, baseAsset: any, counterAsset: any, onNewTrade: (trade: any) => void): () => void;

/** Stream all trades */
export function streamTrades(cursor: string, onNewTrade: (trade: any) => void): () => void;

/** Load trade aggregation data */
export function loadTradesAggregation(params: {
    base: any;
    counter: any;
    resolution: number;
    period: number;
    limit?: number;
}): Promise<any>;

// ============================================================================
// UI Controls
// ============================================================================

export interface ButtonProps {
    /** Link URL; renders as <a> tag when set */
    href?: string;
    /** Click handler */
    onClick?: React.MouseEventHandler;
    /** Render as block-level element */
    block?: boolean;
    /** Outline style instead of filled */
    outline?: boolean;
    /** Text-only, no outline */
    clear?: boolean;
    /** Stack buttons on mobile */
    stackable?: boolean;
    /** Smaller button */
    small?: boolean;
    /** Disable the button */
    disabled?: boolean;
    /** Show loading animation */
    loading?: boolean;
    /** Additional CSS classes */
    className?: string;
    /** Tooltip text */
    title?: string;
    /** Button content */
    children: React.ReactNode;
}

export const Button: React.FC<ButtonProps>;

export interface ButtonGroupProps {
    /** Render as inline element */
    inline?: boolean;
    /** Nested buttons */
    children: React.ReactNode;
}

export const ButtonGroup: React.FC<ButtonGroupProps>;

export interface InfoTooltipProps {
    /** Tooltip content */
    children: React.ReactNode;
    /** Optional "Read more" link URL */
    link?: string;
    /** Icon CSS class */
    icon?: string;
    [key: string]: any;
}

export const InfoTooltip: React.FC<InfoTooltipProps>;

export interface TooltipProps {
    /** Element that triggers the tooltip */
    trigger: React.ReactElement;
    /** Preferred tooltip position */
    desiredPlace?: 'top' | 'bottom' | 'left' | 'right';
    /** Position offset */
    offset?: { top?: number; bottom?: number; left?: number; right?: number };
    /** Activation mode */
    activation?: 'hover' | 'click';
    /** Maximum width of the tooltip */
    maxWidth?: string;
    /** Tooltip content */
    children?: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps>;

export interface UpdateHighlighterProps {
    /** Content to highlight on change */
    children: React.ReactNode;
}

export const UpdateHighlighter: React.FC<UpdateHighlighterProps>;

export interface TabDescriptor {
    /** Unique tab identifier */
    name: string;
    /** Display title */
    title?: string;
    /** Render callback for tab content */
    render?: () => React.ReactNode;
    /** Whether this is the default tab */
    isDefault?: boolean;
}

export interface TabsProps {
    /** Tab definitions */
    tabs: TabDescriptor[];
    /** Currently selected tab name */
    selectedTab?: string;
    /** Tab change handler */
    onChange?: (tabName: string) => void;
    /** Query parameter name for URL sync */
    queryParam?: string;
    /** Additional CSS classes */
    className?: string;
    /** Align tabs to the right */
    right?: boolean;
    /** Additional header content */
    children?: React.ReactNode;
}

export function Tabs(props: TabsProps): React.ReactElement;

export interface DropdownOption {
    /** Internal value for identification */
    value?: string | number;
    /** Link URL for menu-style items */
    href?: string;
    /** Display title */
    title?: any;
    /** Additional CSS class */
    className?: string;
    /** Whether the option is disabled */
    disabled?: boolean;
    /** Whether to hide the option */
    hidden?: boolean;
}

export interface DropdownProps {
    /** Available options */
    options: Array<DropdownOption | string>;
    /** Currently selected value */
    value?: string | number;
    /** Title to display instead of the selected value */
    title?: any;
    /** Disable the dropdown */
    disabled?: boolean;
    /** Additional CSS classes */
    className?: string;
    /** Selection change handler */
    onChange?: (value: any) => void;
    /** HTML title attribute */
    hint?: string;
    /** Show toggle arrow icon */
    showToggle?: boolean;
    /** Centered dialog overlay mode */
    solo?: boolean;
    /** Hide selected item from the list */
    hideSelected?: boolean;
    /** Optional list header */
    header?: React.ReactNode;
    /** Optional list footer */
    footer?: React.ReactNode;
    /** Initially open */
    expanded?: boolean;
    /** Scroll handler for infinite scroll */
    onScroll?: (info: { position: number; rel: 'top' | 'middle' | 'bottom' }) => void;
    /** Handler when dropdown opens */
    onOpen?: () => void;
    /** Handler when dropdown closes */
    onClose?: () => void;
    /** Maximum list height */
    maxHeight?: string;
}

export const Dropdown: React.FC<DropdownProps>;

export interface CodeBlockProps {
    /** Source code text */
    children: string;
    /** Language for syntax highlighting */
    lang?: 'js' | 'json' | 'html' | 'xml' | 'toml' | 'rust' | 'plain';
    /** Additional CSS classes */
    className?: string;
    /** Inline styles */
    style?: React.CSSProperties;
}

export const CodeBlock: React.FC<CodeBlockProps>;

export interface SliderProps {
    /** Current value */
    value?: number;
    /** Category labels */
    categories?: string[];
    /** Value change handler (throttled) */
    onChange?: (value: number) => void;
    /** Minimum value */
    min?: number;
    /** Maximum value */
    max?: number;
    /** Step increment */
    step?: number;
    [key: string]: any;
}

export function Slider(props: SliderProps): React.ReactElement;

export interface ExternalLinkProps {
    /** Link URL */
    href: string;
    /** Link content */
    children?: React.ReactNode;
    [key: string]: any;
}

export const ExternalLink: React.FC<ExternalLinkProps>;

// ============================================================================
// Toast Notifications
// ============================================================================

/** Initialize toast notifications container and expose window.notify() */
export function createToastNotificationsContainer(): HTMLDivElement;

// ============================================================================
// Error Handling
// ============================================================================

export interface ErrorBoundaryProps {
    /** Title displayed in the error UI */
    errorBoundaryTitle?: string;
    /** Show "contact support" link */
    errorBoundarySendErrors?: boolean;
    /** Show error details (true), hide (false), or custom content */
    errorBoundaryErrorDetails?: boolean | React.ReactNode;
    children?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps> {}

/** Wrap a component with an ErrorBoundary */
export function withErrorBoundary<P extends object>(
    wrapped: React.ComponentType<P>,
    options?: {
        errorBoundaryTitle?: string;
        errorBoundarySendErrors?: boolean;
        errorBoundaryErrorDetails?: boolean | React.ReactNode;
    }
): React.FC<P>;

// ============================================================================
// Interaction
// ============================================================================

/** Auto-focus ref callback; focuses the element after a short delay */
export function useAutoFocusRef(inputRef: HTMLElement | null): void;

export interface BlockSelectProps {
    /** HTML tag to render */
    as?: string;
    /** Content */
    children: React.ReactNode;
    /** HTML title */
    title?: string;
    /** Additional CSS classes */
    className?: string;
    /** Enable or disable text wrapping */
    wrap?: boolean;
    /** Force inline display */
    inline?: boolean;
    /** Inline styles */
    style?: React.CSSProperties;
    [key: string]: any;
}

export const BlockSelect: React.FC<BlockSelectProps>;

export interface CopyToClipboardProps {
    /** Text to copy */
    text: string;
    /** Custom trigger element (defaults to copy icon) */
    children?: React.ReactNode;
    /** Tooltip text */
    title?: string;
}

export const CopyToClipboard: React.FC<CopyToClipboardProps>;

export interface SpoilerProps {
    /** Initially expanded */
    expanded?: boolean;
    /** Label for expand action */
    showMore?: string;
    /** Label for collapse action */
    showLess?: string;
    /** Toggle callback */
    onChange?: (state: { expanded: boolean }) => void;
    /** Additional CSS classes */
    className?: string;
    /** Icon-only mode */
    micro?: boolean;
    /** Inline styles */
    style?: React.CSSProperties;
    /** Highlight the toggle link */
    active?: boolean;
    /** Content revealed when expanded */
    children?: React.ReactNode;
}

export const Spoiler: React.FC<SpoilerProps>;

export interface AccordionOption {
    /** Unique key (falls back to title) */
    key?: string;
    /** Panel header content */
    title: string | React.ReactNode;
    /** Panel body content */
    content: React.ReactNode;
}

export interface AccordionProps {
    /** Panel definitions */
    options: AccordionOption[];
    /** Prefix for collapsed panels */
    collapsedSymbol?: string;
    /** Prefix for the expanded panel */
    expandedSymbol?: string;
    [key: string]: any;
}

export function Accordion(props: AccordionProps): React.ReactElement;

/** Theme toggle button (day/night) */
export const ThemeSelector: React.FC;

export interface InlineProgressProps {
    /** Maximum number of dots */
    dots?: number;
}

export const InlineProgress: React.FC<InlineProgressProps>;

/** React hook that measures and tracks window width */
export function useWindowWidth(): number;

export interface QrCodeProps {
    /** Value to encode */
    value: string;
    /** Caption under the QR code */
    caption?: string;
    /** QR code size in pixels */
    size?: number;
    /** Logo image URL to embed in the center */
    embeddedImage?: string;
    /** Embedded logo size */
    embeddedSize?: number;
}

export const QrCode: React.FC<QrCodeProps>;

export interface DialogProps {
    /** Whether the dialog is open */
    dialogOpen?: boolean;
    /** Dialog content */
    children?: React.ReactNode;
}

export const Dialog: React.FC<DialogProps>;

/** Replaces built-in alert() and confirm() with styled dialogs */
export const SystemDialog: React.FC;

// ============================================================================
// Date Components
// ============================================================================

export interface UtcTimestampProps {
    /** Timestamp to display */
    date: string | number | Date;
    /** Show date only without time */
    dateOnly?: boolean;
    /** Additional CSS classes */
    className?: string;
}

export const UtcTimestamp: React.FC<UtcTimestampProps>;

export interface ElapsedTimeProps {
    /** Timestamp to measure elapsed time from */
    ts: Date | string | number;
    /** Additional CSS classes */
    className?: string;
    /** Text appended after the time (e.g., " ago") */
    suffix?: string;
}

export const ElapsedTime: React.FC<ElapsedTimeProps>;

export interface DateSelectorProps {
    /** Current date value */
    value?: string | number | Date;
    /** Change handler (receives Unix timestamp or null) */
    onChange?: (value: number | null) => void;
    /** Minimum selectable date */
    min?: string;
    /** Maximum selectable date */
    max?: string;
    ref?: React.Ref<HTMLInputElement>;
    [key: string]: any;
}

export function DateSelector(props: DateSelectorProps): React.ReactElement;

/** Trim seconds from an ISO date string */
export function trimIsoDateSeconds(date: Date | number): string;

// ============================================================================
// Ledger Components
// ============================================================================

export interface TxLinkProps {
    /** Transaction hash */
    tx: string;
    /** Stellar network override */
    network?: string;
    /** Custom link content */
    children?: React.ReactNode;
}

export const TxLink: React.FC<TxLinkProps>;

export interface OpLinkProps {
    /** Operation ID */
    op: string;
    /** Stellar network override */
    network?: string;
    children?: React.ReactNode;
}

export const OpLink: React.FC<OpLinkProps>;

export interface LedgerLinkProps {
    /** Ledger sequence number */
    sequence: number;
    /** Stellar network override */
    network?: string;
    children?: React.ReactNode;
}

export const LedgerLink: React.FC<LedgerLinkProps>;

export interface OfferLinkProps {
    /** Offer ID */
    offer: string;
    /** Stellar network override */
    network?: string;
    children?: React.ReactNode;
}

export const OfferLink: React.FC<OfferLinkProps>;

export interface PoolLinkProps {
    /** Pool ID */
    pool: string;
    /** Stellar network override */
    network?: string;
    children?: React.ReactNode;
}

export const PoolLink: React.FC<PoolLinkProps>;

/** Generate an explorer link URL */
export function formatExplorerLink(
    type: 'account' | 'asset' | 'ledger' | 'tx' | 'op' | 'offer' | 'contract' | 'liquidity-pool' | 'claimable-balance',
    id: string | number,
    network?: string
): string;

export interface LedgerInfo {
    sequence: number;
    ts: number;
    protocol: number;
    operations: number;
    failedOperations: number;
    txSuccess: number;
    txFailed: number;
    xlm: bigint;
    feePool: bigint;
    baseFee: number;
    baseReserve: number;
}

/** Parse raw ledger data including XDR header */
export function retrieveLedgerInfo(data: {
    xdr: string;
    sequence: number;
    ts: number;
    protocol: number;
    successful_operations?: number;
    failed_operations?: number;
    successful_transactions?: number;
    failed_transactions?: number;
}): LedgerInfo;

// ============================================================================
// Account Components
// ============================================================================

/** Generate an SVG identicon for a Stellar address */
export function drawIdenticon(address: string, size?: number): string;

export interface AccountIdenticonProps {
    /** StrKey-encoded account address */
    address: string;
    /** Identicon display size */
    size?: number;
}

export const AccountIdenticon: React.FC<AccountIdenticonProps>;

export interface AccountAddressProps {
    /** StrKey-encoded account/contract address */
    account: string;
    /** Visible character count (number or "all") */
    chars?: number | 'all';
    /** Explicit display name; false to hide */
    name?: string | false;
    /** Explicit link URL; false to disable linking */
    link?: string | false;
    /** Inline styles */
    style?: React.CSSProperties;
    /** Additional CSS classes */
    className?: string;
    /** Show/hide identicon */
    icon?: boolean;
    /** Prefix content */
    prefix?: React.ReactNode;
    /** Suffix content */
    suffix?: React.ReactNode;
    /** Stellar network override */
    network?: string;
    [key: string]: any;
}

export const AccountAddress: React.FC<AccountAddressProps>;

export interface SignerKeyProps {
    /** Signer object (raw XDR or parsed) */
    signer: any;
    /** Explicit display name */
    name?: string;
    /** Additional CSS classes */
    className?: string;
    /** Show signer weight */
    showWeight?: boolean;
}

export const SignerKey: React.FC<SignerKeyProps>;

/** Calculate available balance for an account trustline */
export function calculateAvailableBalance(
    account: any,
    balance: any,
    additionalReserves?: number | null,
    decimals?: number
): string;

// ============================================================================
// Asset Components
// ============================================================================

export interface AssetLinkProps {
    /** Asset descriptor (string, AssetDescriptor, or Asset) */
    asset: string | any;
    /** Link URL or false to disable */
    link?: string | false;
    /** Show asset issuer */
    issuer?: boolean;
    /** Show asset icon */
    icon?: boolean;
    /** Additional CSS classes */
    className?: string;
    /** Inline styles */
    style?: React.CSSProperties;
    /** Custom inner content */
    children?: React.ReactNode;
}

export const AssetLink: React.FC<AssetLinkProps>;

export interface AssetIssuerProps {
    /** Asset descriptor */
    asset: string | any;
}

export const AssetIssuer: React.FC<AssetIssuerProps>;

export interface AssetIconProps {
    /** Asset descriptor */
    asset: string | any;
    /** Additional CSS classes */
    className?: string;
    /** Inline styles */
    style?: React.CSSProperties;
    /** Inner content */
    children?: React.ReactNode;
}

export const AssetIcon: React.FC<AssetIconProps>;

export interface AssetSelectorProps {
    /** Selection change callback */
    onChange: (value: string) => void;
    /** Currently selected asset */
    value?: string;
    /** Predefined assets shown at top of list */
    predefinedAssets?: string[];
    /** Restrict to predefined assets only */
    restricted?: boolean;
    /** Dropdown title */
    title?: string;
    /** Initially expanded */
    expanded?: boolean;
}

export function AssetSelector(props: AssetSelectorProps): React.ReactElement;

export interface AmountProps {
    /** Token amount */
    amount: string | number;
    /** Asset descriptor */
    asset?: string | any;
    /** Number of decimal places (or "auto") */
    decimals?: number | 'auto';
    /** Treat amount as raw Int64 stroops */
    adjust?: boolean;
    /** Round the amount */
    round?: boolean | 'floor';
    /** Show asset issuer */
    issuer?: boolean;
    /** Show asset icon */
    icon?: boolean;
}

export const Amount: React.FC<AmountProps>;

export interface AssetBasicTomlInfo {
    name?: string;
    orgName?: string;
    image?: string;
    decimals?: number;
}

export interface AssetMeta {
    name?: string;
    domain?: string;
    toml_info?: AssetBasicTomlInfo;
    decimals?: number;
    code?: string;
    tokenName?: string;
    unsafe?: boolean;
    [key: string]: any;
}

/** React hook that fetches and returns asset metadata */
export function useAssetMeta(asset: string | any): AssetMeta | null;

/** React hook for fetching a paginated asset list */
export function useAssetList(params?: Record<string, any>): {
    assets: any[];
    loadPage: () => void;
    loading: boolean;
};

// ============================================================================
// Claimable Balance
// ============================================================================

export interface ClaimableBalanceClaimantsProps {
    /** Array of claimant objects */
    claimants: any[];
}

export const ClaimableBalanceClaimants: React.FC<ClaimableBalanceClaimantsProps>;

// ============================================================================
// DEX
// ============================================================================

export interface PriceDynamicProps {
    /** Pre-calculated change percentage */
    change?: number;
    /** Current price */
    current?: number;
    /** Previous price */
    prev?: number;
    /** Standalone styling */
    standalone?: boolean;
    /** Show 0% instead of null */
    allowZero?: boolean;
}

export const PriceDynamic: React.FC<PriceDynamicProps>;

// ============================================================================
// Directory
// ============================================================================

/** Fetch a directory entry for a Stellar address */
export function getDirectoryEntry(
    address: string,
    options?: { forceRefresh?: boolean; extended?: boolean }
): Promise<any | null>;

/** React hook that fetches directory info for an address */
export function useDirectory(
    address: string,
    options?: { forceRefresh?: boolean }
): any | null;

/** React hook that fetches all available directory tags */
export function useDirectoryTags(): any[];

// ============================================================================
// Transaction / Operations
// ============================================================================

export interface TxOperationsListProps {
    /** Parsed transaction details */
    parsedTx: ParsedTxDetails;
    /** Filter function for operations */
    filter?: ((op: any, index: number) => boolean) | null;
    /** Show transaction fees */
    showFees?: boolean;
    /** Compact view mode */
    compact?: boolean;
    /** Show operation effects */
    showEffects?: boolean;
}

export const TxOperationsList: React.FC<TxOperationsListProps>;

export interface TxFiltersContext {
    type?: string[];
    account?: string[];
    source?: string[];
    destination?: string[];
    asset?: string[];
    src_asset?: string[];
    dest_asset?: string[];
    offer?: string[];
    pool?: string[];
}

export interface ParsedTxDetails {
    /** Parsed operation descriptors */
    operations: any[];
    /** Parsed transaction */
    tx: any;
    /** Transaction hash */
    txHash: string;
    /** Filter context */
    context: any;
    /** Resolved context type */
    contextType: string;
    /** True if transaction has not been submitted */
    isEphemeral: boolean;
    /** Whether transaction matches context */
    unmatched: boolean;
    /** Whether the transaction was successful */
    successful?: boolean;
    /** Transaction-level effects */
    effects?: any[];
    /** Ledger application timestamp */
    createdAt?: string;
}

/** Parse transaction details from raw XDR envelope, result, and meta */
export function parseTxDetails(params: {
    /** Network passphrase */
    network: string;
    /** Base64-encoded transaction envelope XDR */
    txEnvelope: string;
    /** Base64-encoded transaction result */
    result?: string;
    /** Base64-encoded transaction meta */
    meta?: string;
    /** Transaction ID */
    id?: string;
    /** Filter context */
    context?: TxFiltersContext;
    /** Ledger execution timestamp */
    createdAt?: string;
    /** Skip unrelated operations */
    skipUnrelated?: boolean;
    /** Stellar protocol version */
    protocol?: number;
}): ParsedTxDetails;

/** React hook for fetching paginated transaction history */
export function useTxHistory(params: {
    /** Query filters */
    filters: Record<string, any>;
    /** Sort order */
    order?: 'asc' | 'desc';
    /** Rows per page */
    rows?: number;
    /** Update browser query string */
    updateLocation?: boolean;
}): ExplorerApiListResponse;

/** React hook for fetching transaction details by ID or hash */
export function useTxInfo(idOrHash: string): ExplorerApiResult;

// ============================================================================
// Effects
// ============================================================================

export interface EffectDescriptionProps {
    /** Parsed transaction effect */
    effect: { type: string; [key: string]: any };
    /** Parent operation context */
    operation?: any;
}

export function EffectDescription(props: EffectDescriptionProps): React.ReactElement;

// ============================================================================
// Contract / Soroban
// ============================================================================

/** React hook for fetching contract information */
export function useContractInfo(address: string): ExplorerApiResult;

/** Generate URL to download contract WASM source */
export function generateContractSourceLink(hash: string): string;

/** React hook for fetching contract WASM binary */
export function useContractSource(hash: string): ArrayBuffer | null | undefined;

export interface ScValProps {
    /** ScVal as base64 XDR, parsed object, or array */
    value: string | any;
    /** Internal nested rendering flag */
    nested?: boolean;
    /** Block-level indentation */
    indent?: boolean;
    /** Wrap maps/arrays with brackets */
    wrapObjects?: boolean;
}

export const ScVal: React.FC<ScValProps>;

/** Parse a base64-encoded XDR ScVal string */
export function parseScValValue(value: string): any;

export interface ScValStructProps {
    /** Enable block-level indentation */
    indent?: boolean;
    /** Nested content */
    children: React.ReactNode;
    /** Show comma separator when > 1 */
    separate?: number;
}

export const ScValStruct: React.FC<ScValStructProps>;

/** Set of primitive ScVal type identifiers */
export const primitiveTypes: Set<string>;

// ============================================================================
// Filters
// ============================================================================

export interface FilterFieldDescriptor {
    /** Icon CSS class suffix (prepended with "icon-") */
    icon: string;
    /** Short title displayed in the filter condition */
    title: string;
    /** Description shown in the "Add filter" dropdown and as tooltip */
    description: string;
    /** Whether multiple values are allowed for this field (default true) */
    multi?: boolean;
}

export interface FilterViewProps {
    /** Initial base filters that are always applied */
    presetFilter?: Record<string, any>;
    /** Filter field definitions keyed by field name */
    fields?: Record<string, FilterFieldDescriptor>;
    /** Callback triggered when filters change, receives merged preset + user filters */
    onChange?: (mergedFilters: Record<string, any>) => void;
}

/** Composable filter panel for managing search filters with URL query sync */
export function FilterView(props: FilterViewProps): React.ReactElement;

/** Parse and validate filter parameters from the current URL query string */
export function parseFiltersFromQuery(fields: FilterFieldDescriptor): Record<string, any>;

// ============================================================================
// Navigation
// ============================================================================

/** Parse a path string into pathname/search/hash components (re-exported from `history`) */
export function parsePath(path: string): Partial<import('history').Path>;

/** Build a path string from a partial location object (re-exported from `history`) */
export function createPath(location: Partial<import('history').Path>): string;

/** Parse a URL query string (defaults to the current location's search) into an object */
export function parseQuery(query?: string | null, dest?: Record<string, any> | null): Record<string, any>;

/** Serialize a query params object into a URL query string (including the leading "?") */
export function stringifyQuery(query?: Record<string, any> | null): string;

export interface NavigationWrapper {
    /** Shared `history` instance */
    readonly history: import('history').History;
    /** Current parsed query params (frozen) */
    readonly query: Record<string, any>;
    /** Current location pathname */
    readonly path: string;
    /** Most recent navigation action ('PUSH'|'REPLACE'|'POP') */
    readonly action: string;
    /** Current location hash */
    hash: string;
    /** Redirect the top-level window instead of navigating internally when embedded inside an iframe */
    preventNavigationInsideIframe: boolean;
    /** Update query string of the current location (via history.replace, without adding a history entry) */
    updateQuery(paramsToSet: Record<string, any>, replace?: boolean): void;
    /** Navigate to a new URL (adds a history entry) */
    navigate(url: string): void;
    /** Subscribe to location changes; the handler receives the navigation object. Returns an unsubscribe function */
    listen(handler: (navigation: NavigationWrapper) => void): () => void;
    /** Unsubscribe a previously registered location change handler */
    stopListening(handler: (navigation: NavigationWrapper) => void): void;
}

/** Navigation controller wrapping the shared history instance */
export const navigation: NavigationWrapper;

/** Attach a delegated click navigation handler that intercepts and routes link clicks through `navigation` */
export function bindClickNavHandler(container: Element): void;

// ============================================================================
// Router
// ============================================================================

export interface RouteMatch {
    /** Route pattern that matched (e.g. `/explorer/:network/asset/:asset`) */
    path: string;
    /** Portion of the pathname consumed by the match */
    url: string;
    /** Captured route params */
    params: Record<string, string>;
    /** Whether the pattern matched the pathname exactly */
    isExact: boolean;
}

export interface RouterProps {
    /** History instance (defaults to the shared singleton) */
    history?: import('history').History;
    children?: React.ReactNode;
}

/** Top-level router; subscribes to a shared history instance and propagates the current location via context */
export function Router(props: RouterProps): React.ReactElement;

export interface RouteProps {
    /** Route pattern; when omitted the route always matches (fallback) */
    path?: string;
    /** Require an exact pathname match */
    exact?: boolean;
    /** Component to render with `{history, location, match}` props */
    component?: React.ComponentType<any>;
    /** Elements to render (alternative to `component`) */
    children?: React.ReactNode;
}

/** Render UI when the current location matches `path`. Publishes its own match to descendants via context */
export function Route(props: RouteProps): React.ReactElement | null;

export interface RouterSwitchProps {
    children?: React.ReactNode;
}

/** Render the first child `Route`/`Redirect` whose path matches the current location */
export function RouterSwitch(props: RouterSwitchProps): React.ReactElement | null;

export interface RedirectProps {
    /** Target URL */
    to: string;
    /** Push a new history entry instead of replacing the current one */
    push?: boolean;
    /** Source pattern (used by `RouterSwitch` for matching) */
    from?: string;
    exact?: boolean;
}

/** Imperatively redirect to another location */
export function Redirect(props: RedirectProps): null;

/** Access the current location. Re-renders the caller on every navigation */
export function useLocation(): import('history').Location;

/** Access the params of the closest matched route */
export function useParams(): Record<string, string>;

/** Access the closest ancestor route match */
export function useRouteMatch(): RouteMatch;

/** Higher-order component injecting `{history, location, match}` from the router context */
export function withRouter<P extends object>(
    component: React.ComponentType<P & {
        history: import('history').History;
        location: import('history').Location;
        match: RouteMatch;
    }>
): React.ForwardRefExoticComponent<P & React.RefAttributes<any>> & { WrappedComponent: React.ComponentType<any> };

// ============================================================================
// Stellar Utilities
// ============================================================================

/** Decode a Stellar key into its type and components */
export function decodeKeyType(key: string): {
    address: string;
    type: 'ed25519' | 'contract' | 'muxed' | 'hash' | 'tx' | 'signedPayload';
    muxedId?: bigint;
    publicKey?: string;
    payload?: string;
} | null;

/** Parse a multiplexed account address */
export function parseMuxedAccount(muxedAddress: string): {
    address: string;
    muxedId: bigint;
};

/** Encode an address and ID into a multiplexed address */
export function encodeMuxedAccount(address: string, muxedId: bigint): string;

/** Convert signature hint to a StrKey mask */
export function signatureHintToMask(hint: Buffer): string;

/** Format signature hint for display */
export function formatSignatureHint(hint: Buffer): string;

/** Check if a hint matches a specific key (note: function name has a typo) */
export function signatureHintMatchesKey(hint: Buffer, key: string): boolean;

/** Find a key matching a signature hint */
export function findKeyBySignatureHint(hint: Buffer, allKeys: string[]): string | null;

/** Find a transaction signature for a given signer key */
export function findSignatureByKey(key: string, allSignatures?: any[]): any;

/** Find all keys matching a signature hint */
export function findKeysBySignatureHint(signature: any, keys: string[]): string[];

// ============================================================================
// Global Declarations
// ============================================================================

declare global {
    interface Window {
        /** StellarExpert frontend origin URL */
        explorerFrontendOrigin: string;
        /** StellarExpert API origin URL */
        explorerApiOrigin: string;
        /** Stellar Horizon API origin URL */
        horizonOrigin: string;
        /** Show a toast notification (available after createToastNotificationsContainer) */
        notify: (params: { type: 'info' | 'success' | 'warning' | 'error'; message: string }) => void;
    }

    var explorerFrontendOrigin: string;
    var explorerApiOrigin: string;
    var horizonOrigin: string;
}

export interface ChartProps {
    /** Chart data and options */
    options?: Record<string, any>;
    /** Chart kind */
    type?: 'Chart' | 'StockChart';
    /** Chart title */
    title?: React.ReactNode;
    /** Render as inline-block (sparkline charts) */
    inline?: boolean;
    /** Apply data grouping */
    grouped?: boolean;
    /** Date range / range-selector */
    range?: true | false | 'year' | 'month';
    /** Hide the legend section */
    noLegend?: boolean;
    /** Container CSS class */
    container?: string;
    /** Additional CSS classes */
    className?: string;
    /** Inline styles */
    style?: React.CSSProperties;
    /** Additional engine modules */
    modules?: Function[];
    /** Optional header children */
    children?: React.ReactNode;
}

/** Chart component */
export const Chart: React.FC<ChartProps>;

/** Charting engine namespace (Chart, StockChart, setOptions, getOptions, Color, Axis, merge) */
export const ChartEngine: Record<string, any>;

/** Placeholder shown while a chart's data is loading */
export const ChartLoader: React.FC<{ title?: React.ReactNode; unavailable?: boolean; container?: string }>;
