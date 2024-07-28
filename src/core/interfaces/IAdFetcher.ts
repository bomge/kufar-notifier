import type { IAd } from "./IAd";

export interface IAdFetcher {
	fetchAds: () => Promise<IAd[]>
	format: (data: any) => IAd
}