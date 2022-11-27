import type { SystemDefinition } from './defineSystem';

type Intersecting = 1;
type Disjoint = 0;
function getSystemRelationship(
	left: SystemDefinition,
	right: SystemDefinition,
): Intersecting | Disjoint {
	return left.parameters.some(pL =>
		right.parameters.some(
			pR => pL.intersectsWith(pR) || pR.intersectsWith(pL),
		),
	)
		? 1
		: 0;
}

export function getSystemIntersections(systems: SystemDefinition[]): bigint[] {
	return systems.map(current =>
		systems.reduce(
			(acc, other, i) =>
				acc |
				(BigInt(getSystemRelationship(current, other)) << BigInt(i)),
			0n,
		),
	);
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { describe, it, expect, vi } = import.meta.vitest;
	const { defineSystem } = await import('./defineSystem');

	const sys = () => {};

	class AnyComponent {
		static size = 1;
		static schema = 0;
	}
	class A extends AnyComponent {}
	class B extends AnyComponent {}
	class C extends AnyComponent {}
	class D extends AnyComponent {}

	const getDescriptor = (ret: boolean = false) => ({
		intersectsWith: vi.fn().mockReturnValue(ret),
	});

	describe('getSystemRelationship', () => {
		it('returns Intersecting if any descriptor intersects', () => {
			const d1 = Array.from({ length: 3 }, getDescriptor);
			const d2 = Array.from({ length: 6 }, (_, i) =>
				getDescriptor(i === 5),
			);
			expect(
				getSystemRelationship(
					{ parameters: d1 } as any,
					{ parameters: d2 } as any,
				),
			).toBe(1);
		});
		it('returns Disjoint if no descriptors intersect', () => {
			const d1 = Array.from({ length: 7 }, getDescriptor);
			const d2 = Array.from({ length: 2 }, getDescriptor);
			expect(
				getSystemRelationship(
					{ parameters: d1 } as any,
					{ parameters: d2 } as any,
				),
			).toBe(0);
		});

		it('checks all unique descriptor pairs', () => {
			const d1 = Array.from({ length: 4 }, getDescriptor);
			const d2 = Array.from({ length: 4 }, getDescriptor);
			getSystemRelationship(
				{ parameters: d1 } as any,
				{ parameters: d2 } as any,
			);
			for (let i = 0; i < 4; i++) {
				expect(d1[i].intersectsWith).toHaveBeenCalledWith(d2[0]);
				expect(d1[i].intersectsWith).toHaveBeenCalledWith(d2[1]);
				expect(d1[i].intersectsWith).toHaveBeenCalledWith(d2[2]);
				expect(d1[i].intersectsWith).toHaveBeenCalledWith(d2[3]);
			}
		});

		it('checks both descriptors for intersection in case of asymmetric descriptor pairs', () => {
			const nonInter1 = getDescriptor(false);
			const inter1 = getDescriptor(true);
			const result1 = getSystemRelationship(
				{ parameters: [inter1] } as any,
				{ parameters: [nonInter1] } as any,
			);
			expect(inter1.intersectsWith).toHaveBeenCalledWith(nonInter1);
			expect(nonInter1.intersectsWith).not.toHaveBeenCalledWith(inter1);
			expect(result1).toBe(1);

			const nonInter2 = getDescriptor(false);
			const inter2 = getDescriptor(true);
			const result2 = getSystemRelationship(
				{ parameters: [nonInter2] } as any,
				{ parameters: [inter2] } as any,
			);
			expect(inter2.intersectsWith).toHaveBeenCalledWith(nonInter2);
			expect(nonInter2.intersectsWith).toHaveBeenCalledWith(inter2);
			expect(result2).toBe(1);
		});
	});

	describe('getSystemIntersections', () => {
		it('returns bigint bitmasks indicating system intersection', () => {
			const s0 = defineSystem(P => [P.Query([P.Mut(A), B])], sys);
			const s1 = defineSystem(P => [P.Query([A, D])], sys);
			const s2 = defineSystem(P => [P.Query([P.Mut(B), C])], sys);
			const s3 = defineSystem(P => [P.Query([B, D])], sys);

			const s4 = defineSystem(P => [P.Res(B)], sys);
			const s5 = defineSystem(P => [P.Res(B)], sys);
			const s6 = defineSystem(P => [P.Res(P.Mut(B))], sys);

			const result = getSystemIntersections([s0, s1, s2, s3, s4, s5, s6]);
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
