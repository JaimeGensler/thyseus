import { MyCustomParameter } from ':somewhere';
export function customParameterSystem(myClass: MyCustomParameter) {}
customParameterSystem.getSystemArguments = (__w: any) => [
	MyCustomParameter.intoArgument(__w),
];
