import BigUintArray from '../DataTypes/BigUintArray';
import Mutex from '../DataTypes/Mutex';
import SparseSet from '../DataTypes/SparseSet';
import { Parameter } from '../Systems';
import { SendableClass } from '../utils/Thread';
import { MultiExecutor } from './Executor';

const defaults = [SparseSet, Mutex, BigUintArray, MultiExecutor];

export default function getSendableTypes(
	parameters: Parameter[],
): SendableClass[] {
	const sendable: SendableClass[] = [...defaults];
	for (const parameter of parameters) {
		sendable.push(...(parameter.extendSendable?.() ?? []));
	}
	return sendable;
}
