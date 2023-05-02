import { Mut } from '../queries';

export type Res<T extends object> = T extends Mut<infer X> ? X : Readonly<T>;
export type SystemRes<T extends object> = T;
