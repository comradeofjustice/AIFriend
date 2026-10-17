import type Dexie from 'dexie';
import type { EntityTable } from 'dexie';
import type { CharacterState } from '$lib/types/character';
import type { Fact, SessionSummary, ConversationTurn, Reminder } from '$lib/types/memory';
import type { CompletedEventRecord } from '$lib/types/events';

// Database types with IndexedDB-friendly id handling
export interface DBCharacterState extends Omit<CharacterState, 'id'> {
	id?: number;
}

export interface DBFact extends Omit<Fact, 'id'> {
	id?: number;
}

export interface DBSessionSummary extends Omit<SessionSummary, 'id'> {
	id?: number;
}

export interface DBConversationTurn extends Omit<ConversationTurn, 'id'> {
	id?: number;
}

export interface DBCompletedEvent extends Omit<CompletedEventRecord, 'id'> {
	id?: number;
}

export interface DBReminder extends Omit<Reminder, 'id'> {
	id?: number;
}

type UtsuwaDatabase = Dexie & {
 characterStates: EntityTable<DBCharacterState,'id'>;
 facts: EntityTable<DBFact,'id'>;
 sessions: EntityTable<DBSessionSummary,'id'>;
 conversationTurns: EntityTable<DBConversationTurn,'id'>;
 completedEvents: EntityTable<DBCompletedEvent,'id'>;
 reminders: EntityTable<DBReminder,'id'>;
};
import { remoteDatabase } from './remote';
export const db = remoteDatabase as unknown as UtsuwaDatabase;
