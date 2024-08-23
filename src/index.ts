import Kufar_Fetcher from "./sites/kufar/Kufar_fetcher"
import { Kufar_RealEstateUrlProcessor } from "./sites/kufar/Kufar_RealEstate_processor"
import { config } from '../config'
import LoggerService from "./common/Logger"
import { Queue, type QueueOptions } from "./common/Queue"
import { uncaughtErrorsHanler } from "./common/uncaughtError"
import { FileDatabase } from "./databases/file"
import { TelegramService } from "./common/Telegram"
import { Scheduler } from "./common/Scheduler"
import { Kufar_OtherUrlProcessor } from "./sites/kufar/Kufar_Other_processor"
import type { queueConfigsType } from "./core/interfaces/IConfig"
import { createServer } from "./server/server"


uncaughtErrorsHanler()

const logger = new LoggerService({ //todo prob pass only config?
	token: config.logger.remoteUrl,
	logLevel: config.logger.level,
	logFilePath: config.logger.filePath
})

const db = new FileDatabase({
	logger: logger.child({ name: 'FileDB' })
})


const queueConfigs: queueConfigsType = config.queues
// const queueConfigs: queueConfigsType = { //add types
// 	default: { concurrency: 2, interval: 10, maxPerInterval: 5 },
// 	kufar: { concurrency: 2, interval: 10, maxPerInterval: 3 },
// 	telegram: { concurrency: 2, interval: 10, maxPerInterval: 3 },
// };

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
		kufar: Kufar_Fetcher,
		//add other fetcher classes here
	},
	{
		kufar_re: Kufar_RealEstateUrlProcessor,
		kufar_other: Kufar_OtherUrlProcessor,
		//add other processor classes here
	},
	queueConfigs
);

let server: ReturnType<typeof createServer> | null = null;
if (config.server.enabled) {
	server = createServer(config, scheduler, logger);
	server.start();
}

scheduler.start();



process.on('SIGINT', async () => {
	logger.info('Received SIGINT. Shutting down gracefully...');
	
	scheduler.stop();
	logger.info('Scheduler stopped');
  
	if (server) {
	  await server.stop();
	  logger.info('Server stopped');
	}
  
	logger.info('Shutdown complete');
	process.exit(0);
  });