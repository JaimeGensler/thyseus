import type { Res, SystemRes, Mut, struct } from 'thyseus';

class Local {}

@struct
class Time {}
export function mySystem1(time: Res<Time>, _: Res<Local>) {
	console.log(time);
}
export function mySystem2(time: Res<Mut<Time>>, _: Res<Mut<Local>>) {
	console.log(time);
}
export function mySystem3(time: SystemRes<Time>, _: SystemRes<Local>) {
	console.log(time);
}
