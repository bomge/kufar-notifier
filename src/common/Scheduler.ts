import { EventEmitter } from "node:events";
import  type { BaseAdFetcher } from "../core/base/BaseAdFetcher";
import  type { BaseUrlProcessor } from "../core/base/BaseUrlProcessor";
import type { IConfig, UrlConfig } from "../core/interfaces/IConfig";
import type { IDatabase } from "../core/interfaces/IDatabase";
import type { ILogger } from "../core/interfaces/ILogger";
import { Queue, type QueueOptions } from "./Queue";
import type { TelegramService } from "./Telegram";

// Define the types for the fetcher and processor classes
type ConstructorFetcherType = new (...args: ConstructorParameters<typeof BaseAdFetcher>) => BaseAdFetcher;
type ConstructorProcessorType = new (...args: any[]) => BaseUrlProcessor<BaseAdFetcher>

class Scheduler extends EventEmitter {
	private jobs: Map<string, NodeJS.Timeout> = new Map();
	private fetchers: Map<string, BaseAdFetcher> = new Map();
	private processors: Map<string, BaseUrlProcessor<BaseAdFetcher>> = new Map();
	private queues: Map<string, Queue> = new Map();
  
	constructor(
	  private config: IConfig,
	  private logger: ILogger,
	  private db: IDatabase,
	  private telegramService: TelegramService,
	  private fetcherClasses: { [key: string]: ConstructorFetcherType },
	  private processorClasses: { [key: string]: ConstructorProcessorType },
	  private queueConfigs: { [key: string]: Partial<QueueOptions> }
	) {
	  super();
	  this.logger = logger.child({name:"Scheduler"})
	  this.initializeQueues();
	  this.initializeFetchers();
	  this.initializeProcessors();
	}
  
	private initializeQueues(): void {
	  // Initialize site queues
	  for (const siteName of Object.keys(this.config.sites)) {
		const queueConfig = this.queueConfigs[siteName] || this.queueConfigs.default;
		this.queues.set(siteName, new Queue({
		  ...queueConfig,
		  logger: this.logger.child({ name: `${siteName}Queue` }),
		}));
	  }
  
	  // Initialize Telegram queue
	  const telegramQueueConfig = this.queueConfigs.telegram || this.queueConfigs.default;
	  this.queues.set('telegram', new Queue({
		...telegramQueueConfig,
		logger: this.logger.child({ name: 'TelegramQueue' }),
	  }));
	}
  
	private initializeFetchers(): void {
	  for (const [siteName, siteConfig] of Object.entries(this.config.sites)) {
		const uniqueTypes = new Set(siteConfig.urls.map(url => url.type));
		for (const type of uniqueTypes) {
		  const fetcherKey = `${siteName}_${type}`;
		  const FetcherClass = this.fetcherClasses[fetcherKey];
		  if (!FetcherClass) {
			this.logger.error(`No fetcher found for ${fetcherKey}`);
			continue;
		  }
		  const queue = this.queues.get(siteName);
		  if (!queue) {
			this.logger.error(`No queue found for ${siteName}`);
			continue;
		  }
		  const fetcher = new FetcherClass(
			this.logger.child({ name: `${fetcherKey}Fetcher` }),
			queue
		  );
		  this.fetchers.set(fetcherKey, fetcher);
		}
	  }
	}
  
	private initializeProcessors(): void {
	  for (const [siteName, siteConfig] of Object.entries(this.config.sites)) {
		for (const urlConfig of siteConfig.urls) {
		  const fetcherKey = `${siteName}_${urlConfig.type}`;
		  const processorKey = `${siteName}_${urlConfig.type}_${urlConfig.url}`;
		  const ProcessorClass = this.processorClasses[fetcherKey];
		  if (!ProcessorClass) {
			this.logger.error(`No processor found for ${fetcherKey}`);
			continue;
		  }
		  const fetcher = this.fetchers.get(fetcherKey);
		  if (!fetcher) {
			this.logger.error(`No fetcher found for ${fetcherKey}`);
			continue;
		  }
		  const processor = new ProcessorClass(
			fetcher,
			this.telegramService,
			this.logger.child({ name: `${processorKey}Processor` }),
			this.db,
			urlConfig
		  );
		  this.processors.set(processorKey, processor);
		}
	  }
	}
  
	start(): void {
	  for (const [siteName, siteConfig] of Object.entries(this.config.sites)) {
		if (!siteConfig.enabled) continue;
		
		for (const urlConfig of siteConfig.urls) {
		  if (!urlConfig.enabled) continue;
		  
		  const processorKey = `${siteName}_${urlConfig.type}_${urlConfig.url}`;
		  this.scheduleJob(processorKey, urlConfig);
		}
	  }
	}
  
	private scheduleJob(processorKey: string, urlConfig: UrlConfig): void {
	  const processor = this.processors.get(processorKey);
	  const urlName = urlConfig.prefix
	  if (!processor) {
		this.logger.error(`No processor found for ${processorKey}`);
		return;
	  }
  
	  const run = async () => {
		this.logger.info(`Running ${urlName}`)
		try {
		  await processor.processAds();
		  this.emit('jobCompleted', urlName);
		} catch (error) {
		  this.logger.error(`Error processing ads for ${urlName}`, { error });
		  this.emit('jobError', urlName, error);
		}
  
		const interval = this.getRandomInterval(urlConfig.checkInterval || this.config.defaultCheckInterval);
		this.logger.info(`Next run for ${urlName} in ${(interval/1000).toFixed(1)} s`);
		
		const timeout = setTimeout(() => run(), interval);
		this.jobs.set(processorKey, timeout);
	  };
  
	  this.emit('jobStarted', processorKey);
	  run();
	}
  
	private getRandomInterval(intervalString: string): number {
	  const [min, max] = intervalString.split('-').map(Number);
	  return ((Math.random() * (max - min + 1)) + min) * 60 * 1000; // Convert to milliseconds
	}
  
	stop(): void {
	  for (const [key, timeout] of this.jobs.entries()) {
		clearTimeout(timeout);
		this.logger.info(`Stopped job for ${key}`);
	  }
	  this.jobs.clear();
	  this.emit('allJobsStopped');
	}
  }
  
  export { Scheduler };