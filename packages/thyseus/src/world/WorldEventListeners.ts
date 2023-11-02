import { Table } from '../components';

export type WorldEventListeners = {
	createTable: ((table: Table) => void)[];
};
