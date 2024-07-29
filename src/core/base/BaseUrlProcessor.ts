import type { MessageContent, TelegramService } from "../../common/Telegram";
import { sortByField } from "../../utils/util";
import type { IAd } from "../interfaces/IAd";
import type { IDatabase, IDbItem } from "../interfaces/IDatabase";
import type { ILogger } from "../interfaces/ILogger";
import type { UrlConfig } from "../interfaces/IConfig";
import type { BaseAdFetcher } from "./BaseAdFetcher";

export interface PriceChange {
	oldPriceBYN: number;
	oldPriceUSD: number;
	newPriceBYN: number;
	newPriceUSD: number;
	changeBYN: number;
	changeUSD: number;
	isIncrease: boolean;
}

export abstract class BaseUrlProcessor<T extends IAd, R, RawAdType>   {
	private imgCount: number = 5;

	constructor(
		protected adFetcher: BaseAdFetcher<T, R, RawAdType>,
		protected telegramService: TelegramService,
		protected logger: ILogger,
		protected db: IDatabase,
		protected urlConfig: UrlConfig
	) {
		this.imgCount = urlConfig.imgСount || 5
	}

	//todo try catch for whole and each add sending msg to tg
	async processAds(): Promise<void> {
		try {
		  const allAds = await this.adFetcher.fetchAds(this.urlConfig.url, this.urlConfig.prefix);
		  const ads = sortByField(allAds, 'description_full');
	
		  await Promise.all(ads.map(ad => this.processAd(ad)));
		} catch (error) {
		  this.logger.error(`Error processing ads for ${this.urlConfig.prefix}`, this.urlConfig, error);
		  await this.telegramService.sendError(`Error processing ads for ${this.urlConfig.prefix}: ${error.message}`);
		}
	  }

	private async processAd(ad: IAd): Promise<void> {
		try {
			if (this.urlConfig.onlyWithPhoto && ad.images.length === 0) {
				return;
			}
			const existingAd = await this.db.getAd(ad.id);
			const priceChange = this.calculatePriceChange(ad, existingAd);
			if (priceChange) {
				this.logger.info('price changed ' + ad.id, { priceChange, id: ad.id });
				await this.notifyTelegram(ad, priceChange);
				await this.db.updateAd(ad);
			} else if (!existingAd) {
				this.logger.info('new ad ' + ad.id, { ad });
				await this.notifyTelegram(ad);
				await this.db.saveAd(ad);
			}
		} catch (error) {
			this.logger.error(`Error processing ad ${ad.link}`, this.urlConfig, error);
			//@ts-ignore
			this.telegramService.sendError(`Error processing ad ${ad.link} ${error.message}`)
		}
	}

	protected calculatePriceChange(newAd: IAd, oldAd: IDbItem | null): PriceChange | null {
		if (!oldAd || newAd.price === oldAd.price) return null;

		const newPriceBYN = Number.parseFloat(newAd.price_byn) || 0;
		const newPriceUSD = Number.parseFloat(newAd.price_usd) || 0;
		const oldPriceBYN = Number.parseFloat(oldAd.price_byn) || 0;
		const oldPriceUSD = Number.parseFloat(oldAd.price_usd) || 0;

		const changeBYN = newPriceBYN - oldPriceBYN;
		const changeUSD = newPriceUSD - oldPriceUSD;

		if (changeBYN === 0 && changeUSD === 0) return null;

		return {
			oldPriceBYN,
			oldPriceUSD,
			newPriceBYN,
			newPriceUSD,
			changeBYN,
			changeUSD,
			isIncrease: changeBYN > 0 || changeUSD > 0
		};
	}

	private async notifyTelegram(ad: IAd, priceChange?: PriceChange): Promise<void> {
		const text = await this.formatAdMessage(ad, priceChange);
		const messageContent: MessageContent = { text };

		if (ad.images) {
			const first_n_img = ad.images.slice(0, this.imgCount);
			messageContent.imgs = first_n_img.map(a => ({ type: 'photo', media: a }));
			messageContent.imgs[messageContent.imgs.length - 1].caption = text;
			messageContent.imgs[messageContent.imgs.length - 1].parse_mode = 'HTML';
		}

		return this.telegramService.sendMessage(messageContent);
	}


	// abstract formatAdMessage(ad: IAd, isPriceChange: boolean): string;
	//promise cuz need also fetch fullDescription
	protected abstract formatAdMessage(ad: IAd, isPriceChange: PriceChange): Promise<string>;
}