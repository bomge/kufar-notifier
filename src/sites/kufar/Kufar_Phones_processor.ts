import type { TelegramService } from "../../common/Telegram";
import { BaseUrlProcessor, type PriceChange } from "../../core/base/BaseUrlProcessor";
import type { IAdPhone } from "../../core/interfaces/IAd";
import type { IDatabase } from "../../core/interfaces/IDatabase";
import type { ILogger } from "../../core/interfaces/ILogger";
import type { UrlConfig } from "../../core/interfaces/IConfig";
import * as format from '../../utils/format';
import type Kufar_Fetcher from "./Kufar_fetcher";
import type { IKufarAd, IKufarAdsResponse } from "./IKufarResponseAPI";
import { getAdParameter } from "./meta/test2_generics";


// type category = 'realEstate';
// let subCategory = 'Квартиры';
// type innerCategory = 'Квартиры {category:1010 type:let}';

//! currently need write whis 3 times....
type IAdType = IKufarAd<'phones', 'Мобильные телефоны'>;
type IAdsResponse = IKufarAdsResponse<'phones', 'Мобильные телефоны'>;

//todo add generic for <IAdPhone>
export class Kufar_PhoneUrlProcessor extends BaseUrlProcessor<IAdPhone, IAdsResponse, IAdType> {

	constructor(
		protected adFetcher: Kufar_Fetcher<'phones', 'Мобильные телефоны'>,
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

	protected formatAd(data: IAdType): IAdPhone {
		return {
			id: String(data.ad_id),
			adress: getAdParameter(data.ad_parameters, 'area') as string,// TODO REDO
			condition: getAdParameter(data.ad_parameters, 'condition') as (string | undefined),
			currency: data.currency,
			price_byn: String(+data.price_byn / 100),
			price_usd: String(+data.price_usd / 100),
			price: data.currency === 'BYR' ? data.price_byn : data.price_usd,
			images: data.images.map(a => `https://rms4.kufar.by/v1/gallery/${a.path}`),
			description_short: data.body_short,
			description_full: data.body_short?.length < 150 ? data.body_short : undefined,
			link: data.ad_link,

			region: getAdParameter(data.ad_parameters, 'region') as string,
			shop_address: getAdParameter(data.ad_parameters, 'shop_address') as string || data.account_parameters.find(a => a.p == 'shop_address')?.v,
			shop_guarantee: getAdParameter(data.ad_parameters, 'shop_guarantee') as string,
			isCompanyAd: data.company_ad,
			companyName: data.account_parameters.find(a => a.pl == 'Имя')?.v,
			subject: data.subject

		}
	}

	protected async formatAdMessage(ad: IAdPhone, priceChange?: PriceChange): Promise<string> {
		const priceChangeStatus = this.formatPriceChangeStatus(priceChange);
		const priceChangeStatusText = priceChangeStatus? priceChangeStatus + '\n' : '';
		const { adress_text, price_text, shopAdText } = this.getFormatingTexts(ad);
		const description = await this.adFetcher.getFullDescription(ad);


		return `${format.bold(this.urlConfig.prefix)} ` + '\n'
			+ `${format.italic(format.underline(ad.subject))} ${ad.condition}` + '\n'
			+ priceChangeStatusText
			+ shopAdText
			// + adress_text + '\n'
			+ price_text + '\n'
			+ ad.link + '\n'
			+ format.monospace(description);
	}

	private getFormatingTexts(ad: IAdPhone) {
		const { adress, price_byn, price_usd, shop_address, shop_guarantee, isCompanyAd, companyName } = ad

		let price_text = Math.round(+price_byn) + 'руб.' + ' ' + Math.round(+price_usd) + '$'
		if (!+price_byn && !+price_usd) {
			price_text = 'договорная цена'
		}

		const adress_text = (adress || shop_address) + '\n'

		//is shop ad, shop adress,gurantee etc
		let shopAdText = ''
		if (isCompanyAd) {
			let guranteeText = ''
			if (shop_guarantee) {
				guranteeText = `Гарантия ${shop_guarantee}`
			} else {
				// guranteeText = 'Гарантии нет!!'
			}
			shopAdText = `Компания ${companyName} ${guranteeText}\n`
		}

		return {
			price_text,
			adress_text,
			shopAdText
		}
	}
}

