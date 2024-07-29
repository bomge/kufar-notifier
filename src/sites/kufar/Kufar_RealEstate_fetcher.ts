import axios, { type AxiosResponse } from "axios";
const cheerio = require('cheerio');
import { BaseAdFetcher } from "../../core/base/BaseAdFetcher";
import type { IAd, IAdRealEstate } from "../../core/interfaces/IAd";
import type { IKufarAd, IKufarAdsResponse } from "../../core/interfaces/IKufarResponseAPI";
import type { ILogger } from "../../core/interfaces/ILogger";
import type { Queue, QueueOptions } from "../../common/Queue";

//todo mobe to config
const MAX_DESCRIPTION_TRYS = 5

export default class Kufar_RealEstateFetcher  extends BaseAdFetcher<IAdRealEstate, IKufarAdsResponse, IKufarAd> {
	// private queue: Queue;

	/* constructor(
		private logger: ILogger,
		// queueOptions: Partial<QueueOptions> = {}
		private queue: Queue
	) {
		super()
		// this.queue = new Queue({
		// 	logger: logger.child({ name: "Kufar_RealEstateFetcherDEFAULT" }),
		// 	concurrency: 2,
		// 	interval: 10,
		// 	maxPerInterval: 10,
		// 	...queueOptions
		// });
	} */

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

	//todo handle errors
	async getFullDescription(id: string, err_try = 0): Promise<string> {
		try {
			// const res = await axios.get(`https://re.kufar.by/vi/${id}`, { headers: defaultHeaderDescription })
			const res = await this.queue.add<AxiosResponse>(() => {

				this.logger.info('getting descr for ' + id, { id })
				return axios.get(`https://re.kufar.by/vi/${id}`, { headers: defaultHeaderDescription })
			}
			);
			const resHtml = res.data
			const $ = cheerio.load(resHtml);

			const description = $('div[itemprop="description"]').text();
			if (!description?.length) {
				// err_try++

				this.logger.info('no description ' + id)
				// this.logger.info('no description ' + `[${err_try}/${MAX_DESCRIPTION_TRYS}]`,{id})
				// if (err_try < MAX_DESCRIPTION_TRYS) {
					// return (this.getFullDescription(id, err_try))
				// }
				return ''
			}
			return description
		} catch (error) {
			this.logger.error(`err get descr https://re.kufar.by/vi/${id}`, { error,id }, error)
			// process.exit()
			return ''
		}
	}

	protected async fetchRawData(url: string): Promise<IKufarAdsResponse> {
        return this.fetchWithQueue<IKufarAdsResponse>(url, { headers: defaultHeadersKufar });
    }

    protected extractAds(rawData: IKufarAdsResponse): IKufarAd[] {
        return rawData.ads;
    }
}

const defaultHeadersKufar = {
	'authority': 'cre-api-v2.kufar.by',
	'accept': '*/*',
	'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'content-type': 'application/json',
	'dnt': '1',
	'origin': 'https://re.kufar.by',
	'referer': 'https://re.kufar.by/',
	'sec-ch-ua': '"Chromium";v="106", "Google Chrome";v="106", "Not;A=Brand";v="99"',
	'sec-ch-ua-mobile': '?0',
	'sec-ch-ua-platform': '"Windows"',
	'sec-fetch-dest': 'empty',
	'sec-fetch-mode': 'cors',
	'sec-fetch-site': 'same-site',
	'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
	'x-segmentation': 'routing=web_re;platform=web;application=ad_view'
}

const defaultHeaderDescription = {
	'authority': 're.kufar.by',
	'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'accept-language': 'ru-RU,ru;q=0.9',
	'cache-control': 'max-age=0',
	'sec-ch-ua': '"Google Chrome";v="98", "Chromium";v="98", "Not=A?Brand";v="24"',
	'sec-ch-ua-mobile': '?0',
	'sec-ch-ua-platform': '"Windows"',
	'sec-fetch-dest': 'document',
	'sec-fetch-mode': 'navigate',
	'sec-fetch-site': 'none',
	'sec-fetch-user': '?1',
	'upgrade-insecure-requests': '1',
	'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.82 Safari/537.36',
	'Cookie': 'lang=ru'
}