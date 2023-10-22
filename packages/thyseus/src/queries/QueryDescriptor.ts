import type { Class } from '../components';
import type { SystemParameter } from '../systems';
import type { World } from '../world';

import { createArchetypeFilter, type Filter } from './filters';
import { ReadModifier } from './modifiers';
import { Query } from './Query';

export class QueryDescriptor implements SystemParameter {
	components: Class[] = [];
	reads: boolean[] = [];
	filter: Filter | undefined;
	isIndividual: boolean;

	constructor(accessors: (Class | ReadModifier)[], filter?: Filter) {
		this.isIndividual = !Array.isArray(accessors);
		const iter: (Class | ReadModifier)[] = Array.isArray(accessors)
			? accessors
			: [accessors];

		for (const accessor of iter) {
			const isReadonly = accessor instanceof ReadModifier;
			this.reads.push(isReadonly);
			const component: Class = isReadonly ? accessor.value : accessor;
			this.components.push(component);
		}
		this.filter = filter;
	}

	intoArgument(world: World): Query<any, any> {
		const initial = world.getArchetype(...this.components);
		const filters = this.filter
			? createArchetypeFilter(
					this.filter,
					[initial, 0n],
					(...components) => world.getArchetype(...components),
			  )
			: [initial, 0n];
		const query = new Query(filters, this.isIndividual, this.components);
		world.queries.push(query);
		return query as any;
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, describe } = import.meta.vitest;
	const { World } = await import('../world');

	class Comp {
		static size = 1;
		static alignment = 1;
	}
	class A extends Comp {}
	class B extends Comp {}

	describe('intoArgument', () => {
		it('returns a query', async () => {
			const descriptor = new QueryDescriptor([A, B]);
			const world: any = await World.new().build();

			const result = descriptor.intoArgument(world);
			expect(result).toBeInstanceOf(Query);
			expect(world.queries).toContain(result);
		});
	});
}
