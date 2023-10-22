/**
 * A class that marks a component as a Tag component.
 * Tag components are treated as zero-sized types (ZSTs) -
 * they are not constructed and do not take up space for storage.
 */
export class Tag {
	static readonly IS_ZST = true;
}
/**
 * The ComponentType of a Tag component.
 */
export type TagComponentType = typeof Tag;

/**
 * Determines if the provided component type is sized - that is, not zero-sized.
 * @param type The type of the component to check.
 * @returns A boolean indicating if the provided component is sized (i.e., _not_ a Tag component).
 */
export function isSizedComponent(type: any): boolean {
	return !type.IS_ZST;
}

/**
 * Determines if the provided component type is sized or zero-sized.
 * @param type The type of the component to check.
 * @returns A boolean indicating if the provided component is sized (i.e., _not_ a Tag component).
 */
export function isTagComponent(type: any): type is TagComponentType {
	return !isSizedComponent(type);
}
