import { WorldBuilder } from './WorldBuilder';

export type Plugin = (worldBuilder: WorldBuilder) => void;
