import { addToRegistry, getRegistryData, isInRegistry } from './registry';
import { createVisitor, getParentDeclaration } from ':transform-utils';
import {
	isAlignmentProperty,
	isDropProperty,
	isHandwrittenStruct,
	isSizeProperty,
} from './rules';

export const registerHandwrittenStructs = createVisitor(
	isHandwrittenStruct,
	function registerIfHandwritten(node) {
		const size = node.members.find(isSizeProperty);
		const alignment = node.members.find(isAlignmentProperty);
		const hasDrop = node.members.some(isDropProperty as any);
		if (size && alignment) {
			addToRegistry(node, {
				size: Number(size.initializer!.getText()),
				alignment: Number(alignment.initializer!.getText()),
				hasDrop: node.members.some(isDropProperty as any),
			});
		} else {
			const parentDeclaration = getParentDeclaration(node);

			if (parentDeclaration) {
				registerIfHandwritten(parentDeclaration);
				if (isInRegistry(parentDeclaration)) {
					const {
						size,
						alignment,
						hasDrop: parentHasDrop,
					} = getRegistryData(parentDeclaration)!;
					addToRegistry(node, {
						size,
						alignment,
						hasDrop: hasDrop || parentHasDrop,
					});
				}
			}
		}

		return node;
	},
);
