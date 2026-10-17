import { accountStorageName, getLocalIdentity } from '../services/accounts/local-accounts';
// Every place Utsuwa persists data on the device. Store modules import their
// names from here so "Clear All Data" can't miss a new one (the test scans src
// for storage names defined anywhere else).
const BASE_STORAGE_INVENTORY = {
	indexedDb: 'utsuwa-db',
	localforage: {
		vrm: { name: 'utsuwa-vrm', storeName: 'models' },
		keepsakes: { name: 'utsuwa-keepsakes', storeName: 'images' },
		backgrounds: { name: 'utsuwa-backgrounds', storeName: 'images' },
		animations: { name: 'utsuwa-animations', storeName: 'files' }
	},
	localStorage: {
		settings: 'utsuwa-settings',
		mcp: 'utsuwa-mcp-v1',
		display: 'utsuwa-display',
		animations: 'utsuwa-animations',
		overlayPosition: 'utsuwa-overlay-position',
		overlaySize: 'utsuwa-overlay-size',
		overlayLocked: 'utsuwa-overlay-locked',
		imagePrivacyAck: 'utsuwa-image-privacy-ack',
		legacyPersonaCards: 'utsuwa-persona-cards',
		legacyPersonaActiveId: 'utsuwa-persona-active-id',
		// Read before hydration by src/app.html, which can't import this
		colorMode: 'colorMode'
	},
	localStorageModulePrefix: 'utsuwa-module-',
	broadcast: {
		character: 'utsuwa-character-state',
		reminders: 'utsuwa-reminders',
		memory: 'utsuwa-memory'
	}
} as const;

// Each local account gets one shared namespace for 2D, 3D and the overlay.
export const STORAGE_INVENTORY = {
 ...BASE_STORAGE_INVENTORY,
 indexedDb: accountStorageName(BASE_STORAGE_INVENTORY.indexedDb),
 localforage: Object.fromEntries(Object.entries(BASE_STORAGE_INVENTORY.localforage).map(([key, value]) => [key, { ...value, name: accountStorageName(value.name) }])) as typeof BASE_STORAGE_INVENTORY.localforage,
 localStorage: Object.fromEntries(Object.entries(BASE_STORAGE_INVENTORY.localStorage).map(([key, value]) => [key, key === 'colorMode' ? value : accountStorageName(value)])) as typeof BASE_STORAGE_INVENTORY.localStorage,
 localStorageModulePrefix: accountStorageName('utsuwa-module-'),
 broadcast: Object.fromEntries(Object.entries(BASE_STORAGE_INVENTORY.broadcast).map(([key, value]) => [key, value + (getLocalIdentity()?.id ? `--${getLocalIdentity()!.id}` : '')])) as typeof BASE_STORAGE_INVENTORY.broadcast
};

export interface ClearTargets {
	localforage: { name: string; storeName: string }[];
	localStorage: string[];
}

// Everything under the utsuwa- prefix goes, so stray keys from older builds do too.
export function listClearTargets(localStorageKeys: Iterable<string>): ClearTargets {
	return {
		localforage: Object.values(STORAGE_INVENTORY.localforage),
		localStorage: [...localStorageKeys].filter(
			(key) => (key.startsWith('utsuwa-') && (accountStorageName('') ? key.includes(accountStorageName('')) : !key.includes('--'))) || key === STORAGE_INVENTORY.localStorage.colorMode
		)
	};
}
