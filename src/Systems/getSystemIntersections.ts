import SystemRelationship from './SystemRelationship';
import type Parameter from './Parameter';
import type { SystemDefinition } from './defineSystem';

function getSystemRelationship(
	left: SystemDefinition,
	right: SystemDefinition,
	parameterTypes: Parameter[],
): SystemRelationship {
	for (const pL of left.parameters) {
		for (const pR of right.parameters) {
			if (
				pL.type === pR.type &&
				parameterTypes
					.find(p => p.type === pL.type)
					?.getRelationship(pL, pR) ===
					SystemRelationship.Intersecting
			) {
				return SystemRelationship.Intersecting;
			}
		}
	}
	return SystemRelationship.Disjoint;
}

// NOTE: This may mark a system as self-intersecting,
// if that system does anything more than read.
// At present, that should be fine, and possibly desireable.
export default function getSystemIntersections(
	systems: SystemDefinition[],
	parameters: Parameter[],
): bigint[] {
	return systems.map(current =>
		systems.reduce(
			(acc, other, i) =>
				acc |
				(BigInt(getSystemRelationship(current, other, parameters)) <<
					BigInt(i)),
			0n,
		),
	);
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { describe, it, expect } = import.meta.vitest;
	const { P, defineSystem, Mut, QueryParameter, ResourceParameter } =
		await import('.');

	const sys = () => () => {};

	class AnyComponent {
		static schema = {};
	}
	class A extends AnyComponent {}
	class B extends AnyComponent {}
	class C extends AnyComponent {}
	class D extends AnyComponent {}

	describe('getSystemRelationship', () => {
		describe('queries', () => {
			const p = [new QueryParameter({} as any)];
			it('that do not overlap return Disjoint', async () => {
				const sys1 = defineSystem([P.Query([A, B])], sys());
				const sys2 = defineSystem([P.Query([C, D])], sys());
				expect(getSystemRelationship(sys1, sys2, p)).toBe(
					SystemRelationship.Disjoint,
				);
				const sys3 = defineSystem([P.Query([Mut(A), Mut(B)])], sys());
				const sys4 = defineSystem([P.Query([Mut(C), Mut(D)])], sys());
				expect(getSystemRelationship(sys3, sys4, p)).toBe(
					SystemRelationship.Disjoint,
				);
			});

			it('that readonly overlap return Disjoint', () => {
				const sys1 = defineSystem([P.Query([A, B])], sys());
				const sys2 = defineSystem([P.Query([A, B])], sys());
				expect(getSystemRelationship(sys1, sys2, p)).toBe(
					SystemRelationship.Disjoint,
				);
			});

			it('that read/write overlap return Intersecting', () => {
				const sys1 = defineSystem([P.Query([Mut(A), B])], sys());
				const sys2 = defineSystem([P.Query([A, D])], sys());
				const sys3 = defineSystem([P.Query([C, Mut(B)])], sys());

				expect(getSystemRelationship(sys1, sys2, p)).toBe(
					SystemRelationship.Intersecting,
				);
				expect(getSystemRelationship(sys1, sys3, p)).toBe(
					SystemRelationship.Intersecting,
				);
			});
		});

		describe('resources', () => {
			const p = [new ResourceParameter({} as any)];
			it('that do not overlap return Disjoint', () => {
				const sys1 = defineSystem([P.Res(A)], sys());
				const sys2 = defineSystem([P.Res(B)], sys());
				expect(getSystemRelationship(sys1, sys2, p)).toBe(
					SystemRelationship.Disjoint,
				);

				const sys3 = defineSystem([P.Res(Mut(A))], sys());
				const sys4 = defineSystem([P.Res(Mut(B))], sys());
				expect(getSystemRelationship(sys3, sys4, p)).toBe(
					SystemRelationship.Disjoint,
				);
			});

			it('that readonly overlap return Disjoint', () => {
				const sys1 = defineSystem([P.Res(A)], sys());
				const sys2 = defineSystem([P.Res(A)], sys());
				expect(getSystemRelationship(sys1, sys2, p)).toBe(
					SystemRelationship.Disjoint,
				);
			});

			it('that read/write overlap return Intersecting', () => {
				const sys1 = defineSystem([P.Res(Mut(A))], sys());
				const sys2 = defineSystem([P.Res(Mut(A))], sys());
				const sys3 = defineSystem([P.Res(A)], sys());

				expect(getSystemRelationship(sys1, sys2, p)).toBe(
					SystemRelationship.Intersecting,
				);
				expect(getSystemRelationship(sys1, sys3, p)).toBe(
					SystemRelationship.Intersecting,
				);
			});
		});
	});

	describe('getSystemIntersections', () => {
		const p = [
			new QueryParameter({} as any),
			new ResourceParameter({} as any),
		];
		it('returns bigint bitmasks indicating system intersection', () => {
			const s0 = defineSystem([P.Query([Mut(A), B])], sys());
			const s1 = defineSystem([P.Query([A, D])], sys());
			const s2 = defineSystem([P.Query([Mut(B), C])], sys());
			const s3 = defineSystem([P.Query([B, D])], sys());

			const s4 = defineSystem([P.Res(B)], sys());
			const s5 = defineSystem([P.Res(B)], sys());
			const s6 = defineSystem([P.Res(Mut(B))], sys());

			const result = getSystemIntersections(
				[s0, s1, s2, s3, s4, s5, s6],
				p,
			);
			expect(result[0]).toBe(0b0000_0111n);
			expect(result[1]).toBe(0b0000_0001n);
			expect(result[2]).toBe(0b0000_1101n);
			expect(result[3]).toBe(0b0000_0100n);
			expect(result[4]).toBe(0b0100_0000n);
			expect(result[5]).toBe(0b0100_0000n);
			expect(result[6]).toBe(0b0111_0000n);
		});
	});
}
