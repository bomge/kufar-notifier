import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import type { Queue } from "../../common/Queue";
import type { IAd, IAdRealEstate } from "../interfaces/IAd";
import type { ILogger } from "../interfaces/ILogger";

export abstract class BaseAdFetcher<R, RawAdType> {
	constructor(
		protected readonly logger: ILogger,
		protected readonly queue: Queue
	) { }

	public async fetchAds(url: string, name: string): Promise<RawAdType[]> {
		this.logger.debug(`Fetching ads for ${name}`, { url });
		try {
			const rawData = await this.fetchRawData(url);
			this.logger.debug(`Fetched ads for ${name}`, { url });
			const ads = this.extractAds(rawData);
			return ads
			// return ads.map((ad) => this.formatAd(ad));
		} catch (error) {
			this.logger.error(`Error fetching ads for ${name}`, { error, url });
			throw new Error(`Failed to fetch ads for ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	protected abstract fetchRawData(url: string): Promise<R>;
	protected abstract extractAds(rawData: R): RawAdType[];

	protected async fetchWithQueue<ResponseType>(url: string, config: AxiosRequestConfig): Promise<ResponseType> {
		const response = await this.queue.add<AxiosResponse<ResponseType>>(() => axios.get(url, config));
		return response.data;
	}
}