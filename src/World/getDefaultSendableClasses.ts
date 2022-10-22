import {
	BigUintArray,
	Mutex,
	SparseSet,
	IndexAllocator,
} from '../utils/DataTypes';
import { Executor } from './Executor';
import type { SendableClass } from '../utils/Threads';

export function getDefaultSendableClasses(): SendableClass<any>[] {
	return [SparseSet, Mutex, BigUintArray, Executor, IndexAllocator];
}
