import type { Table } from '../components';
import type { World } from './World';

export type WorldEventListeners = {
	createTable: Array<(table: Table) => void>;
	start: Array<(world: World) => void>;
	stop: Array<(world: World) => void>;
};
