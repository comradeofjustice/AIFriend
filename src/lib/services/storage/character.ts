import { cloudRequest, changed } from '$lib/db/cloud-client';
import { db, type DBCharacterState } from '$lib/db';
import type { CharacterState } from '$lib/types/character';
import { createDefaultCharacterState } from '$lib/engine/character-defaults';
import { mergeCharacterStates } from './character-merge';

/**
 * Get the single character state from IndexedDB.
 * Returns the first (and only) record, or creates a default if none exists.
 */
export async function getCharacterState(): Promise<CharacterState> {
	const state = await db.characterStates.toCollection().first();

	if (state) {
		return deserializeCharacterState(state);
	}

	// Return default state (not saved until explicitly saved)
	return createDefaultCharacterState() as CharacterState;
}

/**
 * Save the character state to IndexedDB (single record model).
 * Merges into the existing record rather than blindly overwriting it, so a
 * window holding a stale snapshot can't erase progress another window already
 * persisted. The rw transaction makes read-merge-write atomic across windows.
 */
export async function saveCharacterState(state: CharacterState): Promise<number> {
	const id=await cloudRequest({op:'characterSave',value:serializeCharacterState(state)});
	changed();return id;
}

/**
 * Delete all character state data (used for reset).
 */
export async function deleteCharacterState(): Promise<void> {
	await db.characterStates.clear();
}

// Serialize dates for storage
function serializeCharacterState(state: CharacterState): Omit<DBCharacterState, 'id'> {
	return {
		...state,
		lastInteraction: state.lastInteraction ? new Date(state.lastInteraction) : null,
		lastDecayAt: state.lastDecayAt ? new Date(state.lastDecayAt) : null,
		firstMet: new Date(state.firstMet),
		createdAt: new Date(state.createdAt),
		updatedAt: new Date()
	};
}

// Deserialize dates from storage
function deserializeCharacterState(state: DBCharacterState): CharacterState {
	return {
		...state,
		lastInteraction: state.lastInteraction ? new Date(state.lastInteraction) : null,
		lastDecayAt: state.lastDecayAt ? new Date(state.lastDecayAt) : null,
		firstMet: new Date(state.firstMet),
		createdAt: new Date(state.createdAt),
		updatedAt: new Date(state.updatedAt)
	} as CharacterState;
}
