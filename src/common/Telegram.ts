import TelegramBot from 'node-telegram-bot-api';
import type { ILogger } from '../core/interfaces/ILogger';
import type { Queue } from './Queue';
import { sleep } from '../utils/util';
import type { TelegramServiceConfig } from '../core/interfaces/IConfig';

interface TelegramError extends Error {
	code: string;
	response: {
		body: {
			error_code: number;
			description: string;
			parameters?: {
				retry_after?: number;
			};
		};
	};
}

export type MessageContent = {
	text: string
	imgs?: TelegramBot.InputMediaPhoto[]
} | string;

export class TelegramService {
	private bot: TelegramBot;
	private maxRetries: number;
	private retryDelay: number; //ms

	constructor(
		private config: TelegramServiceConfig,
		private logger: ILogger,
		private queue: Queue
	) {
		this.bot = new TelegramBot(config.botToken, { polling: false });

		const { maxRetries = 5, retryDelay = 100 } = config;

		this.maxRetries = maxRetries;
		this.retryDelay = retryDelay;
	}

	public async sendMessage(content: MessageContent, chatId: string = this.config.defaultChatId): Promise<void> {
		return this.queue.add(async () => {
			await this.processMessage(content, chatId);
		});
	}

	public async sendError(error: Error | string): Promise<void> {
		const errorMessage = error instanceof Error ? error.stack || error.message : error;
		return this.queue.add(async () => {
			await this.processMessage(errorMessage, this.config.errorChatId);
		});
	}



	private async processMessage(content: MessageContent, chatId: string): Promise<void> {
		const _logger = this.logger.child({ content, chatId })
		_logger.debug('sending tg message',)
		if (typeof content === 'string') {
			await this.sendTextMessage(content, chatId);
		} else if (!content.imgs?.length) {
			await this.sendTextMessage(content.text, chatId);
		} else {
			// try {
			await this.sendMediaGroup(content.imgs, chatId);
			// } catch (error) { //! todo remove only img that broken
			// 	if (error.message.includes("WEBPAGE_MEDIA_EMPTY")) {
			// 		this.logger.warn('All media invalid, sending text only', { content });
			// 		await this.sendTextMessage(content.text, chatId);
			// 	} else {
			// 		throw error;
			// 	}
			// }
			// } else {
			// 	throw new Error('Invalid message content');
		}
		_logger.debug('sent tg message successfully',)
	}

	private async sendTextMessage(message: string, chatId: string): Promise<void> {
		const chunks = this.splitLongMessage(message);
		for (let i = 0; i < chunks.length; i++) {
			const chunk = chunks[i];
			const chunkMessage = chunks.length > 1 ? `[${i + 1}/${chunks.length}]\n${chunk}` : chunk;
			await this.sendMessageWithRetry(chatId, chunkMessage);
		}
	}

	private async sendMediaGroup(media: TelegramBot.InputMedia[], chatId: string): Promise<void> {
		const chunk = media.slice(0, 10); // Telegram allows max 10 media per group
		const lastChunk = chunk[chunk.length - 1];
		// try {
			await this.sendMessageWithRetry(chatId, chunk);
		// } catch (error) { //todo add retry invalid media
		// 	//!wrong error.code. Fix somehow later
		// 	//@ts-ignore
		// 	const telegramError = error as TelegramError;
		// 	if (error.code === 'MEDIA_INVALID') {
		// 		//@ts-ignore
		// 		this.logger.warn('Invalid media detected, removing from the group', { mediaGroup: chunk });
		// 		media = media.filter(item => !chunk.includes(item));
		// 	} else {
		// 		throw error;
		// 	}
		// }
	}

	private async sendMessageWithRetry(chatId: string, content: string | TelegramBot.InputMedia[], retryCount = 0): Promise<void> {
		try {
			if (Array.isArray(content)) {
				await this.bot.sendMediaGroup(chatId, content);
			} else {
				await this.bot.sendMessage(chatId, content, { parse_mode: 'HTML' });
			}
		} catch (error) {
			const telegramError = error as TelegramError;
			const err_logger = this.logger.child({ error: telegramError, chatId, content })
			err_logger.error('Got error while sending TG message: ' + telegramError.message);

			if (Array.isArray(content) && this.isWebpageMediaEmptyError(telegramError)) {
				const updatedContent = this.removeProblematicMedia(content, telegramError);
				if (updatedContent.length > 0) {
					err_logger.warn('Removed problematic media, retrying with updated content', { updatedContent });
					return this.sendMessageWithRetry(chatId, updatedContent, retryCount);
				} else {
					throw new Error('All media items were removed due to WEBPAGE_MEDIA_EMPTY errors');
				}
			}

			if (this.shouldRetry(telegramError, retryCount)) {
				const delay = this.getRetryDelay(telegramError);
				err_logger.warn(`Rate limit hit, retrying in ${delay / 1000} seconds...`);
				await sleep(delay);
				err_logger.warn(`slept ${delay / 1000} trying to resend...`);
				return await this.sendMessageWithRetry(chatId, content, retryCount + 1);
			} else {
				throw telegramError;
			}
		}
	}

	private isWebpageMediaEmptyError(error: TelegramError): boolean {
		return error.message.includes('WEBPAGE_MEDIA_EMPTY');
	}

	private shouldRetry(error: TelegramError, retryCount: number): boolean {
		return error.response?.body?.error_code === 429 && retryCount < this.maxRetries;
	}

	private getRetryDelay(error: TelegramError): number {
		return (error.response?.body?.parameters?.retry_after || 1) * 1000 + this.retryDelay;
	}

	private splitLongMessage(message: string, maxLength: number = 4096): string[] {
		const chunks: string[] = [];
		let currentChunk = '';

		// biome-ignore lint/complexity/noForEach: <explanation>
		message.split('\n').forEach((line) => {
			if (currentChunk.length + line.length + 1 > maxLength) {
				chunks.push(currentChunk.trim());
				currentChunk = '';
			}
			currentChunk += line + '\n';
		});

		if (currentChunk) {
			chunks.push(currentChunk.trim());
		}

		return chunks;
	}


	private removeProblematicMedia(content: TelegramBot.InputMedia[], error: TelegramError): TelegramBot.InputMedia[] {
		const errorMatch = error.message.match(/failed to send message #(\d+)/);
		if (errorMatch) {
			const problematicIndex = Number.parseInt(errorMatch[1]) - 1; // Convert to 0-based index
			if (problematicIndex >= 0 && problematicIndex < content.length) {
				this.logger.warn(`Removing problematic media at index ${problematicIndex}`);

				// Store the caption of the last media if it's being removed
				const lastMediaCaption = problematicIndex === content.length - 1 ? content[problematicIndex].caption : undefined;

				// Remove the problematic media
				const updatedContent = content.filter((_, index) => index !== problematicIndex);

				// If we removed the last media and it had a caption, add it to the new last media
				if (lastMediaCaption && updatedContent.length > 0) {
					const newLastMedia = updatedContent[updatedContent.length - 1];
					newLastMedia.caption = lastMediaCaption;
					// If the media type supports parse_mode, set it to HTML
					// if ('parse_mode' in newLastMedia) {
					// 	newLastMedia.parse_mode = 'HTML';
					// }
				}

				return updatedContent;
			}
		}
		return content;
	}
}

export function createTelegramService(config: TelegramServiceConfig, logger: ILogger, queue: Queue): TelegramService {
	return new TelegramService(config, logger, queue);
}