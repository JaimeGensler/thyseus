import type { System } from '../../systems';

function getSystemRelationship(left: System, right: System): 0 | 1 {
	if (!left.parameters || !right.parameters) {
		return 0; // Disjoint
	}
	return left.parameters.some(pL =>
		right.parameters!.some(
			pR => pL.intersectsWith(pR) || pR.intersectsWith(pL),
		),
	)
		? 1 //  Intersecting
		: 0; // Disjoint
}
export function getSystemIntersections(systems: System[]): bigint[] {
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
	const { QueryDescriptor, Mut } = await import('../../queries');
	const { ResourceDescriptor } = await import('../../resources');

	class AnyComponent {
		static size = 1;
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
			const s0 = { parameters: [new QueryDescriptor([new Mut(A), B])] };
			const s1 = { parameters: [new QueryDescriptor([A, D])] };
			const s2 = { parameters: [new QueryDescriptor([new Mut(B), C])] };
			const s3 = { parameters: [new QueryDescriptor([B, D])] };

			const s4 = { parameters: [new ResourceDescriptor(B)] };
			const s5 = { parameters: [new ResourceDescriptor(B)] };
			const s6 = { parameters: [new ResourceDescriptor(new Mut(B))] };

			const result = getSystemIntersections([
				s0,
				s1,
				s2,
				s3,
				s4,
				s5,
				s6,
			] as any);
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
