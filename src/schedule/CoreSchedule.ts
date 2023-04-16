const Main = Symbol('MainSchedule');
const FixedUpdate = Symbol('FixedUpdateSchedule');
const Startup = Symbol('StartupSchedule');
const Outer = Symbol('OuterSchedule');

export const CoreSchedule = {
	Main,
	FixedUpdate,
	Startup,
	Outer,
} as const;
