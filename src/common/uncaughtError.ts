import util from 'node:util';
import type LoggerService from "./Logger";
import type { TelegramService } from './Telegram';
// import type { ErrorHandler } from "./ErrorHandler";

const inspect = (obj: any, depth = 0) => util.inspect(obj, { depth });

export const uncaughtErrorsHanler = (logger?: LoggerService,telegramService?:TelegramService, errorHandler?: any) => {
	process.on('uncaughtException', (err, origin) => {
		const errorMsg = formatErrorMessage(err);

		//msg mb change to {}type context
		logger?.fatal('uncaughtException', { origin }, err);
		telegramService?.sendError(`uncaughtException ${err} ${origin}`)
	});

	process.on('unhandledRejection', (reason: Error | any, promise: Promise<any>) => {
		let errorMsg: string;

		// console.log(reason)

		if (reason instanceof Error) {
			errorMsg = `Unhandled Rejection at: ${inspect(promise)}\nReason: ${reason.message}\nStack: ${reason.stack}`;
		} else {
			errorMsg = `Unhandled Rejection at: ${inspect(promise)}\nReason: ${String(reason)}`;
		}

		logger?.fatal('unhandledRejection', { promise }, reason);
		telegramService?.sendError(errorMsg)

		// if (NotificationService && !errorHandler) {
		//   NotificationService.notify(eNotificationType.Error, errorMsg);
		// }
		if (errorHandler) {
			errorHandler.handleError('Unhandled Rejection', reason)
		}

	});

}



function formatErrorMessage(err: Error): string {
	// biome-ignore lint/style/noUnusedTemplateLiteral: <explanation>
	let message = `Uncaught Exception:\n`;
	message += `Error Message: ${err.message}\n`;
	message += `Stack Trace:\n${err.stack}\n`;


	return message;
}