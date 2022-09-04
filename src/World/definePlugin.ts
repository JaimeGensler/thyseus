import type WorldBuilder from './WorldBuilder';

export type Plugin = (world: WorldBuilder) => void;
export default function definePlugin(plugin: Plugin) {
	return plugin;
}
