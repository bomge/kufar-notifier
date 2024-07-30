import axios, { type AxiosResponse } from "axios";
const cheerio = require('cheerio');
import { BaseAdFetcher } from "../../core/base/BaseAdFetcher";
import type { IAd, IAdRealEstate } from "../../core/interfaces/IAd";
import type { IKufarAd, IKufarAdsResponse } from "./IKufarResponseAPI";
import type { ILogger } from "../../core/interfaces/ILogger";
import type { Queue, QueueOptions } from "../../common/Queue";
import type { MainCategory, SubCategory, InnerCategory } from "./meta/test2_generics";

//todo mobe to config
const MAX_DESCRIPTION_TRYS = 5

export default class Kufar_Fetcher<
    T extends MainCategory,
    U extends SubCategory<T>,
    V extends InnerCategory<T, U>
> extends BaseAdFetcher<IAdRealEstate, IKufarAdsResponse<T, U, V>, IKufarAd<T, U, V>> {
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

	

	//todo handle errors
	private async fetchFullDescription(ad: IAdRealEstate, err_try = 0): Promise<string> {
		try {
			// const res = await axios.get(`https://re.kufar.by/vi/${id}`, { headers: defaultHeaderDescription })
			const res = await this.queue.add<AxiosResponse>(() => {

				this.logger.info('getting descr for ' + ad.id, { id:ad.id })
				return axios.get(ad.link, { headers: defaultHeaderDescription })
			}
			);
			const resHtml = res.data
			const $ = cheerio.load(resHtml);

			const description = $('div[itemprop="description"]').text();
			if (!description?.length) {
				// err_try++

				this.logger.info('no description ' + ad.id)
				// this.logger.info('no description ' + `[${err_try}/${MAX_DESCRIPTION_TRYS}]`,{id})
				// if (err_try < MAX_DESCRIPTION_TRYS) {
					// return (this.getFullDescription(id, err_try))
				// }
				return ''
			}
			return description
		} catch (error) {
			this.logger.error(`err get descr ${ad.link}`, { error,id:ad.id }, error)
			// process.exit()
			return ''
		}
	}

	async getFullDescription(ad: IAdRealEstate): Promise<string> {
		if (ad.description_full) return ad.description_full;

		this.logger.info(`need get full description for ad ${ad.id}`);
		const fullDescr = await this.fetchFullDescription(ad);

		if (fullDescr) {
			ad.description_full = fullDescr;
			this.logger.info(`Got full description for ad ${ad.id}`);
		}

		return (fullDescr || ad.description_short || '').slice(0, 850);
	}
	
	protected async fetchRawData(url: string): Promise<IKufarAdsResponse<T, U, V>> {
        return this.fetchWithQueue<IKufarAdsResponse<T, U, V>>(url, { headers: defaultHeadersKufar });
    }

    protected extractAds(rawData: IKufarAdsResponse<T, U, V>): IKufarAd<T, U, V>[] {
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