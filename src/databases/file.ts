import fs from 'node:fs/promises';
import path from 'node:path';
import type { IDatabase, IDbItem } from '../core/interfaces/IDatabase';
import type { ILogger } from '../core/interfaces/ILogger';

 interface FileDbOptions {
    // path: string;
    logger: ILogger;
}

export class FileDatabase implements IDatabase {
  private filePath: string;
  private cache: Map<string, IDbItem>;
  private logger: ILogger;

  constructor(options:FileDbOptions) {
    this.filePath = path.resolve(__dirname, '../../db.json')
    this.cache = new Map();
    this.logger = options.logger;
	this.connect()
  }

  async connect(): Promise<void> {
    try {
	//   const filePath = this.filePath || path.resolve(__dirname, '../db.json');
      const fileHandle = await fs.open(this.filePath, 'a+');
      
      const data = await fileHandle.readFile('utf-8');
      
      await fileHandle.close();

      const ads: IDbItem[] = data.trim() ? JSON.parse(data) : [];

      for (const ad of ads) {
        this.cache.set(ad.id, ad);
      }
      this.logger.info(`Connected to file database at ${this.filePath}`);
    } catch (error) {
		//@ts-ignore
      this.logger.error(`Error connecting to file database: ${error.message}`,{error},error);
      throw error; // Re-throw the error to be handled by the caller
    }
  }

  async disconnect(): Promise<void> {
    // No need to do anything for file-based storage
    this.logger.info('Disconnected from file database');
  }

  async saveAd(ad: IDbItem): Promise<void> {
    this.cache.set(ad.id, ad);
    await this.persistToFile();
  }

  async getAd(id: string): Promise<IDbItem | null> {
    return this.cache.get(id) || null;
  }

  async getLatestAds(limit: number): Promise<IDbItem[]> {
    const allAds = Array.from(this.cache.values());
    return allAds.sort((a, b) => b.id.localeCompare(a.id)).slice(0, limit);
  }

  async adExistsWithSamePrice(id: string, price: string): Promise<boolean> {
    const ad = this.cache.get(id);
    return ad !== undefined && ad.price === price;
  }

  async updateAd(ad: IDbItem): Promise<void> {
    this.cache.set(ad.id, ad);
    await this.persistToFile();
  }

  private async persistToFile(): Promise<void> {
    const ads = Array.from(this.cache.values());
    await fs.writeFile(this.filePath, JSON.stringify(ads, null, 2));
  }
}

export function createFileDatabase(options:FileDbOptions): IDatabase {
  return new FileDatabase(options);
}