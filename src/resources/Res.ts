import { Mut } from '../queries';

export type Res<T extends object> = T extends Mut<T> ? T : Readonly<T>;
export type SystemRes<T extends object> = T;
