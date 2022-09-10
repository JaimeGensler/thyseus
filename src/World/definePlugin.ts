import type WorldBuilder from './WorldBuilder';

export type Plugin = (worldBuilder: WorldBuilder) => void;
export default function definePlugin<T extends Plugin>(plugin: T): T {
	return plugin;
}
