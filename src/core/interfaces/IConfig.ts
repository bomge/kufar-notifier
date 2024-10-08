import type { QueueOptions } from "../../common/Queue";

interface AdSite {
	enabled: boolean;
	urls: UrlConfig[];
}

export interface UrlConfig {
	url: string;
	enabled: boolean | 0 | 1;
	checkInterval?: string; // in minutes example '1-10' (from 1 to 10 minutes random)
	prefix: string,
	imgСount?: number,
	onlyWithPhoto?: boolean
	type: 're' | 'car' | 'other' | 'phone'
	tgId?: string
}

export interface TelegramServiceConfig {
	botToken: string;
	defaultChatId: string;
	errorChatId: string;
	maxRetries?: number;
	retryDelay?: number;
}

export type queueConfigsType = { [key: string]: Omit<QueueOptions, 'logger'> }


export interface IConfig {
	telegram: TelegramServiceConfig,
	database: {
		type: 'file' | 'mongo' | 'sql';
		connection: string;
	},
	logger: {
		filePath?: string,
		remoteUrl?: string
		level: 'info' | 'error' | 'warn' | 'debug';
	},
	defaultCheckInterval: string; // in minutes, default  (10 minutes) example '1-10' (from 1 to 10 minutes random)
	defaultImgCount: number; // how many by default send img in msg (default 3)
	sites: {
		[siteName: string]: AdSite
	}
	//maxRetries and retryDelay
	server: {
		enabled: boolean | 0 | 1;
		port: number;
	};
	queues: queueConfigsType
}


