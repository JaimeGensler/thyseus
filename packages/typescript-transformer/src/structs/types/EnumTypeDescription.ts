import ts from 'typescript';
import { TypeDescription } from './TypeDescription';
import { useTypeChecker } from ':context';
import { Numeric, numerics } from './numerics';
import { NOT } from ':rule-engine';
import { createRead, createWrite } from './createReadWrite';

let currentType: Numeric | null;

export class EnumTypeDescription extends TypeDescription {
	static test(node: ts.TypeNode): boolean {
		if (!ts.isTypeReferenceNode(node)) {
			return false;
		}
		const checker = useTypeChecker();
		const symbol = checker.getTypeAtLocation(node).symbol;
		const declaration = symbol?.declarations?.[0] as any;
		if (!declaration || !ts.isEnumDeclaration(declaration)) {
			return false;
		}
		currentType = getNumericType(declaration);
		return currentType !== null;
	}

	#type: Numeric;

	constructor(node: ts.PropertyDeclaration) {
		super(node);
		this.#type = currentType!;

		// Enums must be representable as a u8
		this.size = 1 << numerics[this.#type];
		this.alignment = this.size;
	}

	serialize() {
		return createWrite(this.#type, this.createThisPropertyAccess());
	}
	deserialize() {
		return createRead(this.#type, this.createThisPropertyAccess());
	}
}

function getNumericType(node: ts.EnumDeclaration): Numeric | null {
	const checker = useTypeChecker();
	const memberValues = node.members.map(member =>
		checker.getConstantValue(member),
	);

	if (memberValues.some(value => typeof value !== 'number')) {
		return null;
	}
	if (memberValues.some(NOT(Number.isSafeInteger))) {
		return 'f64';
	}

	const min = Math.min(...(memberValues as number[]));
	const max = Math.max(...(memberValues as number[]));
	if (isInU8Range(min, max)) return 'u8';
	if (isInU16Range(min, max)) return 'u16';
	if (isInU32Range(min, max)) return 'u32';
	if (isInI8Range(min, max)) return 'i8';
	if (isInI16Range(min, max)) return 'i16';
	if (isInI32Range(min, max)) return 'i32';

	// All integers but too big for 32-bit range
	return 'f64';
}

// prettier-ignore
const createRangeCheck =
	(rangeMin: number, rangeMax: number) =>
	(min: number, max: number) =>
		rangeMin <= min && min <= rangeMax &&
		rangeMin <= max && max <= rangeMax

const isInU8Range = createRangeCheck(0, 255);
const isInU16Range = createRangeCheck(0, 65_535);
const isInU32Range = createRangeCheck(0, 4_294_967_295);
const isInI8Range = createRangeCheck(-128, 127);
const isInI16Range = createRangeCheck(-32_768, 32_767);
const isInI32Range = createRangeCheck(-2_147_483_648, 2_147_483_647);
