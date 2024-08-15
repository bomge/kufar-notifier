import TelegramBot from 'node-telegram-bot-api';
import type { ILogger } from '../core/interfaces/ILogger';
import type { Queue } from './Queue';
import { sleep } from '../utils/util';
import type { TelegramServiceConfig } from '../core/interfaces/IConfig';


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

		// Use destructuring with default values
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
		this.logger.debug('sending tg message',{content,chatId})
		if (typeof content === 'string') {
			await this.sendTextMessage(content, chatId);
		} else if (!content.imgs?.length) {
			await this.sendTextMessage(content.text, chatId);
		} else {
			try {
				await this.sendMediaGroup(content.imgs, chatId);
			} catch (error) { //! todo remove only img that broken
				if (error.message.includes("WEBPAGE_MEDIA_EMPTY")) {
					this.logger.warn('All media invalid, sending text only', { content });
					await this.sendTextMessage(content.text, chatId);
				} else {
					throw error;
				}
			}
			// } else {
			// 	throw new Error('Invalid message content');
		}
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
			// lastChunk.caption = lastChunk?.caption?.slice(0, 1200)
			// console.log(lastChunk)
			try {
				await this.sendMessageWithRetry(chatId, chunk);
			} catch (error) { //todo add retry invalid media
				//@ts-ignore
				if (error.code === 'MEDIA_INVALID') {
				//@ts-ignore
				this.logger.warn('Invalid media detected, removing from the group', { mediaGroup: chunk });
					media = media.filter(item => !chunk.includes(item));
				} else {
					throw error;
				}
			}
	}

	private async sendMessageWithRetry(chatId: string, content: string | TelegramBot.InputMedia[], retryCount = 0): Promise<void> {
		try {
			if (Array.isArray(content)) {
				await this.bot.sendMediaGroup(chatId, content);
			} else {
				await this.bot.sendMessage(chatId, content, { parse_mode: 'HTML' });
			}
		} catch (error) {
			//@ts-ignore
			this.logger.error('got error while sending tg message '+ error?.message,{error,chatId,content},error)
			if (this.shouldRetry(error, retryCount)) {
				const delay = this.getRetryDelay(error);
				this.logger.warn(`Rate limit hit, retrying in ${delay / 1000} seconds...`);
				await sleep(delay);
				await this.sendMessageWithRetry(chatId, content, retryCount + 1);
			} else {
				throw error;
			}
		}
	}

	private shouldRetry(error: any, retryCount: number): boolean {
		return error.code === 429 && retryCount < this.maxRetries;
	}

	private getRetryDelay(error: any): number {
		return (error.parameters?.retry_after || 1) * 1000 + this.retryDelay;
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
}

// Factory function to create the Telegram service
export function createTelegramService(config: TelegramServiceConfig, logger: ILogger, queue: Queue): TelegramService {
	return new TelegramService(config, logger, queue);
}