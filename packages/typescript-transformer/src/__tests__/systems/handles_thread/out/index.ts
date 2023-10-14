import { Thread, ThreadDescriptor } from 'thyseus';
function threadSystem(thread: Thread<typeof import('./thread')>) {}
threadSystem.parameters = [
	new ThreadDescriptor([() => import('./thread'), './thread']),
];
