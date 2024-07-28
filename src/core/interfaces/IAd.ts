export interface IAd {
	id: string,
	price:string,
	price_byn:string
	price_usd:string
	description_full?: string,
	currency?: string
	images: string[];
	link:string
}

export type IAllAds = IAd | IAdRealEstate

export interface IAdRealEstate extends IAd {
	adress:string
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