import Kufar_RealEstateFetcher from "./src/sites/kufar/Kufar_RealEstate_fetcher"
import { Kufar_RealEstateUrlProcessor } from "./src/sites/kufar/Kufar_RealEstate_processor"
import { config } from './config'
import LoggerService from "./src/common/Logger"
import { Queue, type QueueOptions } from "./src/common/Queue"
import { uncaughtErrorsHanler } from "./src/common/uncaughtError"
import { FileDatabase } from "./src/databases/file"
import { TelegramService } from "./src/common/Telegram"
import { Scheduler } from "./src/common/Scheduler"


uncaughtErrorsHanler()

const logger = new LoggerService({ //todo prob pass only config?
	token: config.logger.remoteUrl,
	logLevel: config.logger.level,
	logFilePath: config.logger.filePath
})

const db = new FileDatabase({
	logger: logger.child({ name: 'FileDB' })
})

type queueConfigsType = {[key: string]:Omit< QueueOptions, 'logger'> }

const queueConfigs:queueConfigsType = { //add types
	default: { concurrency: 2, interval: 10, maxPerInterval: 5 },
	kufar: { concurrency: 3, interval: 15, maxPerInterval: 10 },
	telegram: { concurrency: 2, interval: 10, maxPerInterval: 3 },
	// Add other site-specific configs here
};

const tgQueue = new Queue({
	logger: logger.child({ name: 'TelegramQueue' }),
	...queueConfigs.telegram
});

const telegramService = new TelegramService(config.telegram, logger.child({ name: 'Telegram' }), tgQueue) //todo prob make not as args but as obj?

const scheduler = new Scheduler(
	config,
	logger,
	db,
	telegramService,
	{
		kufar_re: Kufar_RealEstateFetcher,
		// Add other fetcher classes here
	},
	{
		kufar_re: Kufar_RealEstateUrlProcessor,
		// Add other processor classes here
	},
	queueConfigs
);

scheduler.start();