import BigUintArray from '../utils/DataTypes/BigUintArray';
import Mutex from '../utils/DataTypes/Mutex';
import SparseSet from '../utils/DataTypes/SparseSet';
import Executor from './Executor';
import type { SendableClass } from '../utils/Thread';

export default function getDefaultSendableClasses(): SendableClass<any>[] {
	return [SparseSet, Mutex, BigUintArray, Executor];
}
