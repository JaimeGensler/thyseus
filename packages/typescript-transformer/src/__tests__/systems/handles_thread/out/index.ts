import { Thread } from 'thyseus';
function threadSystem(thread: Thread<typeof import('./thread')>) {}
threadSystem.getSystemArguments = (__w: any) => [
	Thread.intoArgument(__w, [() => import('./thread'), './thread']),
];
