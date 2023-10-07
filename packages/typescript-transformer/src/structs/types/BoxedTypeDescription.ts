import ts from 'typescript';
import { TypeDescription } from './TypeDescription';
import { createRead, createWrite } from './createReadWrite';

export class BoxedTypeDescription extends TypeDescription {
	static test = () => true;

	size = 0;
	alignment = 1;
	boxedSize = 1;

	constructor(node: ts.PropertyDeclaration) {
		super(node);
	}
	deserialize() {
		return createRead('Boxed', this.createThisPropertyAccess());
	}
	serialize() {
		return createWrite('Boxed', this.createThisPropertyAccess());
	}
}
