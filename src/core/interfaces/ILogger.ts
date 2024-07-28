export interface ILogger {
	info(message: string, meta?: object): void;
	error(message: string, data?: object, error?: any): void;
	warn(message: string, meta?: object): void;
	debug(message: string, meta?: object): void;
	child(meta?: object): ILogger;
}