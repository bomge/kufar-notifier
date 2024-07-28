import type { IAd } from "./IAd";

export interface IDbItem extends IAd {

}

export interface IDatabase {
	connect(): Promise<void>;
	disconnect(): Promise<void>;
	saveAd(ad: IDbItem): Promise<void>;
	getAd(id: string): Promise<IDbItem | null>;
	getLatestAds(limit: number): Promise<IDbItem[]>;
	adExistsWithSamePrice(id: string, price: string): Promise<boolean>;
	updateAd(ad: IDbItem): Promise<void>;
}