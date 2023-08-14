import {
	Res,
	SystemRes,
	struct,
	ResourceDescriptor,
	Mut,
	SystemResourceDescriptor,
} from 'thyseus';
class Local {}
class Time {
	static readonly size = 0;
	static readonly alignment = 1;
	__$$b = 0;
	deserialize() {}
	serialize() {}
}
export function mySystem1(time: Res<Time>, _: Res<Local>) {
	time.deserialize();
	console.log(time);
	time.serialize();
}
mySystem1.parameters = [
	new ResourceDescriptor(Time),
	new ResourceDescriptor(Local),
];
export function mySystem2(time: Res<Mut<Time>>, _: Res<Mut<Local>>) {
	time.deserialize();
	console.log(time);
	time.serialize();
}
mySystem2.parameters = [
	new ResourceDescriptor(new Mut(Time)),
	new ResourceDescriptor(new Mut(Local)),
];
export function mySystem3(time: SystemRes<Time>, _: SystemRes<Local>) {
	time.deserialize();
	console.log(time);
	time.serialize();
}
mySystem3.parameters = [
	new SystemResourceDescriptor(Time),
	new SystemResourceDescriptor(Local),
];
