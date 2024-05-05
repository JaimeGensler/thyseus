export function degreesToRadians(degrees: number): number {
	// Pi / 180
	return degrees * 0.017453292519943295;
}

export function radiansToDegrees(radians: number): number {
	// 180 / Pi
	return radians * 57.29577951308232;
}
