import { BaseEntity } from '../utils';
import type { Commands } from './Commands';

export class EntityCommands extends BaseEntity {
	#id: bigint;
	constructor(commands: Commands, id: bigint) {
		super(commands);
		this.#id = id;
	}

	get id() {
		return this.#id;
	}
}

export class EntityBatchCommands extends EntityCommands {}
