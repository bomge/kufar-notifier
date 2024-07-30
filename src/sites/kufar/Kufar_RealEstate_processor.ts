import type { TelegramService } from "../../common/Telegram";
import { BaseUrlProcessor, type PriceChange } from "../../core/base/BaseUrlProcessor";
import type { IAd, IAdRealEstate } from "../../core/interfaces/IAd";
import type { IDatabase } from "../../core/interfaces/IDatabase";
import type { ILogger } from "../../core/interfaces/ILogger";
import type { UrlConfig } from "../../core/interfaces/IConfig";
import * as format from '../../utils/format';
import type Kufar_RealEstate from "./Kufar_RealEstate_fetcher";
import type Kufar_RealEstateFetcher from "./Kufar_RealEstate_fetcher";
import type { IKufarAd, IKufarAdsResponse } from "../../core/interfaces/IKufarResponseAPI";

export class Kufar_RealEstateUrlProcessor extends BaseUrlProcessor<IAdRealEstate, IKufarAdsResponse, IKufarAd> {

	constructor(
		protected adFetcher: Kufar_RealEstate,
		protected telegramService: TelegramService,
		protected logger: ILogger,
		protected db: IDatabase,
		protected urlConfig: UrlConfig
	) {
		logger = logger.child({ name: urlConfig.prefix })
		super(
			adFetcher,
			telegramService,
			logger,
			db,
			urlConfig
		)
	}

	protected async formatAdMessage(ad: IAdRealEstate, priceChange?: PriceChange): Promise<string> {
		const priceChangeStatus = this.formatPriceChangeStatus(priceChange);

		const { adress_text, floor_text, price_text, room_area_text, who_can_rent_text } = this.getFormatingTexts(ad);
		const description = await this.adFetcher.getFullDescription(ad);


		return `${format.bold(this.urlConfig.prefix)} ` + priceChangeStatus + '\n'
			+ adress_text + room_area_text + '\n'
			+ price_text + '\n'
			+ floor_text
			+ who_can_rent_text
			+ ad.link + '\n'
			+ format.monospace(description);
	}

	private getFormatingTexts(ad: IAdRealEstate) {
		const { adress, price_byn, price_usd, condition, flat_repair, floor, floor_total, room_count, size, who_can_rent } = ad

		let price_text = Math.round(+price_byn) + 'руб.' + ' ' + Math.round(+price_usd) + '$'
		if (!+price_byn && !+price_usd) {
			price_text = 'договорная цена'
		}

		let area_text = ''
		if (size) {
			area_text += size + ' м²'
		}

		const room_text = room_count ? room_count + ' комнатная ' : " "

		const room_area_text = ' ' + room_text + area_text


		let who_can_rent_text = ''
		if (who_can_rent)
			who_can_rent_text = 'Кому: ' + who_can_rent + '\n'

		let floor_text = `Этаж ${floor || "?"} из ${floor_total || '?'} \n`
		if (!floor && !floor_total) {
			// if(!+floor && !+floor_total){
			floor_text = ''
		}

		let adress_text = adress
		if (room_count) {
			adress_text = adress + '.'
		}

		return {
			price_text,
			room_area_text,
			who_can_rent_text,
			floor_text,
			adress_text
		}
	}
}