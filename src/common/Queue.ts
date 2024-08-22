import type { ILogger } from "../core/interfaces/ILogger";

export interface QueueOptions {
    concurrency: number;
    interval: number; // in seconds
    maxPerInterval: number;
    logger: ILogger;
}

type QueueTask<R> = () => Promise<R>;

export class Queue<T = void> { //todo mb add sleep after completion task
    private queue: QueueTask<any>[] = [];
    private running: number = 0;
    private interval: NodeJS.Timeout | null = null;
    private processedInInterval: number = 0;
    private options: QueueOptions;

    constructor(options: Partial<QueueOptions> & { logger: ILogger }) {
        this.options = {
            concurrency: options.concurrency || 1,
            interval: options.interval || 60, // default to 1 minute
            maxPerInterval: options.maxPerInterval || Number.POSITIVE_INFINITY,
            logger: options.logger
        };
        this.startInterval();
    }

    private startInterval() {
		this.interval = setInterval(() => {
			this.processedInInterval = 0;
			
			// Process tasks only if there are tasks in the queue
			//todo mb add also check processedInInterval
			while (this.running < this.options.concurrency && this.queue.length > 0) {
				this.process(); // Start processing a task
			}
		}, this.options.interval * 1000);
	}

    add<R>(task: QueueTask<R>): Promise<R> {
        const taskPromise = new Promise<R>((resolve, reject) => {
            this.queue.push(async () => {
                try {
                    const result = await task();
                    resolve(result);
                    return result; // Return result for processing
                } catch (error) {
                    reject(error);
                    this.options.logger.error('Task execution failed', { error });
                    throw error; // Rethrow to maintain stack trace
                }
            });
        });

        this.process();
        return taskPromise;
    }

    private async process(): Promise<void> {
        if (this.running >= this.options.concurrency || this.processedInInterval >= this.options.maxPerInterval) {
            return;
        }

        const task = this.queue.shift();
        if (!task) {
            return;
        }

        this.running++;
        this.processedInInterval++;

        try {
            await task();
        } catch (error) {
            // Handled in the task itself
        } finally {
            this.running--;
            this.process();
        }
    }

    get size(): number {
        return this.queue.length;
    }

    clear(): void {
        this.queue = [];
    }

    pause(): void {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    resume(): void {
        if (!this.interval) {
            this.startInterval();
        }
    }

    destroy(): void {
        this.clear();
        this.pause();

        this.running = 0;
        this.processedInInterval = 0;
    }
}

// Factory function to create queues
export function createQueue<T>(options: Partial<QueueOptions> & { name: string; logger: ILogger }): Queue<T> {
    return new Queue<T>(options);
}