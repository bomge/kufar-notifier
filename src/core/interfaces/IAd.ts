export interface IAd {
	id: string,
	price:string,
	price_byn:string
	price_usd:string
	description_full?: string,
	currency?: string
	images: string[];
	link:string
	adress:string
	isCompanyAd?:boolean
	companyName?:string
	subject?:string
	description_short?:string

}

export type IAllAds = IAd | IAdRealEstate

export interface IAdRealEstate extends IAd {
	currency: string
	size?: number,
	room_count?:string,
	flat_repair?:string
	condition?:string
	who_can_rent?:string
	floor?:number,
	floor_total?:string
	description_short?:string
}

export interface IAdPhone extends IAd {
	condition?:string
	shop_guarantee?:string
	region?:string
	description_short?:string
	shop_address?:string
}