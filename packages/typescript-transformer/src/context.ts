import ts from 'typescript';
import { SystemParameterMap, defaultSystemParameters } from './systems';

type TransformerConfigComplete = {
	systemParameters: SystemParameterMap;
};
export type TransformerConfig = Partial<TransformerConfigComplete>;

let currentConfig: TransformerConfigComplete;
export function useConfig(): void;
export function useConfig<T extends keyof TransformerConfig>(
	key: T,
): TransformerConfigComplete[T];
export function useConfig(key?: keyof TransformerConfig) {
	return key ? currentConfig[key] : currentConfig;
}
useConfig.set = function setConfig(config?: TransformerConfig) {
	currentConfig = {
		systemParameters: {
			...(config?.systemParameters ?? {}),
			...defaultSystemParameters,
		},
	};
};

let currentProgram: ts.Program;
let typechecker: ts.TypeChecker;
export function useProgram(): ts.Program {
	return currentProgram;
}
useProgram.set = function setProgram(program: ts.Program): void {
	currentProgram = program;
	typechecker = program.getTypeChecker();
};

export function useTypeChecker(): ts.TypeChecker {
	return typechecker;
}

let currentTransformationContext: ts.TransformationContext;
export function useTransformationContext(): ts.TransformationContext {
	return currentTransformationContext;
}
useTransformationContext.set = function setTransformationContext(
	transformationContext: ts.TransformationContext,
) {
	currentTransformationContext = transformationContext;
};
