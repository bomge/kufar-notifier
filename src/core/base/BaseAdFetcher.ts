import type { Queue } from "../../common/Queue";
import type { IAd, IAdRealEstate } from "../interfaces/IAd";
import type { ILogger } from "../interfaces/ILogger";

export abstract class BaseAdFetcher{//like for each site each category (each site and category has own fields)

	constructor(
		protected logger: ILogger,
		// queueOptions: Partial<QueueOptions> = {}
		protected queue: Queue
	){}

	//todo maybe diff fetch ads and get ads? fetch ads will be in base, but getads every instance of class will implement by yourself
	abstract fetchAds(url:string): Promise<(IAd | IAdRealEstate)[]>; //prob need prop typings. (or generics, idk) cuz we get for each site different datas

	// protected abstract getAds(url:string): <T>;

	//todo also need prob limit description to like 1500chars (tg limit)
	protected abstract format(data: any): IAd | IAdRealEstate //format that data to our interface.
}