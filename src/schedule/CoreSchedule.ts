const Main = Symbol('MainSchedule');
const Startup = Symbol('FixedTimeStepSchedule');
const FixedTimeStep = Symbol('StartupSchedule');
const Outer = Symbol('OuterSchedule');

export const CoreSchedule = {
	Main,
	Startup,
	FixedTimeStep,
	Outer,
} as const;
