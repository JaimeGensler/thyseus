import ts from 'typescript';
import { NOT } from ':rule-engine';
import { addImport, createVisitor } from ':transform-utils';
import { assert } from ':utils';
import {
	isTransformableMember,
	isStructDecorator,
	isStructNeedingTransformation,
} from './rules';
import { createStructProperties } from './createStructProperties';
import { getType } from './getType';
import { addToRegistry } from './registry';
import { SuperTypeDescription, type TypeDescription } from './types';

export const transformStructs = createVisitor(
	isStructNeedingTransformation,
	node => {
		const properties: TypeDescription[] = [];
		if (node.heritageClauses && SuperTypeDescription.test(node)) {
			properties.push(new SuperTypeDescription(node));
		}
		for (const member of node.members) {
			if (isTransformableMember(member)) {
				assert(
					member.type,
					`Missing type in @struct class - properties of structs must always provide an explicit type, even if they have an initializer (class ${node.name?.getText()}, property ${member.name?.getText()})`,
				);
				const typeDescription = getType(member);
				assert(
					typeDescription,
					`Unrecognized type in @struct class - structs can only contain properties of specific types (class ${node.name?.getText()}, property ${member.name?.getText()})`,
				);

				for (const importDescription of typeDescription.imports) {
					const [importName, importFrom] =
						importDescription.split(' ');
					addImport(importFrom, importName);
				}
				properties.push(typeDescription);
			}
		}

		const { size, alignment, structProperties, hasDrop } =
			createStructProperties(properties);

		addToRegistry(node, { size, alignment, hasDrop });
		return ts.factory.updateClassDeclaration(
			node,
			node.modifiers?.filter(NOT(isStructDecorator)),
			node.name,
			node.typeParameters,
			node.heritageClauses,
			[...structProperties, ...node.members],
		);
	},
);
