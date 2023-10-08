import { addToRegistry, getRegistryData, isInRegistry } from './registry';
import { createVisitor, getParentDeclaration } from ':transform-utils';
import {
	isAlignmentProperty,
	isHandwrittenStruct,
	isSizeProperty,
} from './rules';

export const registerHandwrittenStructs = createVisitor(
	isHandwrittenStruct,
	function registerIfHandwritten(node) {
		const size = node.members.find(isSizeProperty);
		const alignment = node.members.find(isAlignmentProperty);
		if (size && alignment) {
			addToRegistry(node, {
				size: Number(size.initializer!.getText()),
				alignment: Number(alignment.initializer!.getText()),
			});
		} else {
			const parentDeclaration = getParentDeclaration(node);

			if (parentDeclaration) {
				registerIfHandwritten(parentDeclaration);
				if (isInRegistry(parentDeclaration)) {
					const { size, alignment } =
						getRegistryData(parentDeclaration)!;
					addToRegistry(node, {
						size,
						alignment,
					});
				}
			}
		}

		return node;
	},
);
