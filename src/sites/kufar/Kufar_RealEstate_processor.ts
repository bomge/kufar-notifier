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

	protected formatAd(data: IKufarAd): IAdRealEstate {
		return {
			id: String(data.ad_id),
			adress: data.account_parameters.find(a => a.pl == 'Адрес')?.v?.split(', Гомель')[0] || 'Гомель?',// TODO REDO
			condition: data.ad_parameters.find(a => a.pl === 'Состояние')?.vl as (string | undefined),
			currency: data.currency,
			price_byn: String(+data.price_byn / 100),
			price_usd: String(+data.price_usd / 100),
			price: data.currency === 'BYR' ? data.price_byn : data.price_usd,
			images: data.images.map(a => `https://rms4.kufar.by/v1/gallery/${a.path}`),
			//@ts-ignore
			who_can_rent: data.ad_parameters.find(a => a.p == 'flat_rent_for_whom')?.vl?.join('/'),
			//@ts-ignore
			floor: data.ad_parameters.find(a => a.p == 'floor')?.v[0],
			floor_total: data.ad_parameters.find(a => a.p == 're_number_floors')?.vl as (string | undefined),
			flat_repair: data.ad_parameters.find(a => a.pl === 'Ремонт')?.vl as (string | undefined),
			room_count: data.ad_parameters.find(a => a.p == 'rooms')?.v as (string | undefined),
			size: data.ad_parameters.find(a => a.p == 'size')?.v as (number | undefined),
			description_short: data.body_short,
			description_full: data.body_short?.length < 150 ? data.body_short : undefined,
			link: data.ad_link

		}
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