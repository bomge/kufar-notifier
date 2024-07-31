import type { categories as adParameterStructure } from './categories_result';

export type MainCategory = keyof typeof adParameterStructure;

export type SubCategory<T extends MainCategory> = keyof typeof adParameterStructure[T];

type AdParameterKeys<T extends MainCategory, U extends SubCategory<T>> = keyof typeof adParameterStructure[T][U];

type AdParameterValueType = string | number | string[];

export interface AdParameter<T extends MainCategory, U extends SubCategory<T>> {
    pl: string; // display label
    vl: AdParameterValueType | undefined;
    p: AdParameterKeys<T, U>; // Use the dynamic keys here
    v: AdParameterValueType | undefined;
    pu: string; // presumably the unit
}

//define the interface for the ad data
interface IKufarAd<T extends MainCategory, U extends SubCategory<T>> {
    ad_parameters: AdParameter<T, U>[];
    // other fields...
}

export function getAdParameter<T extends MainCategory, U extends SubCategory<T>, K extends AdParameterKeys<T, U>>(
    params: AdParameter<T, U>[],
    key: K
): AdParameterValueType | undefined {
    const param = params.find(a => a.p === key);
    return param?.vl;
}

//type guard function to check if a parameter is defined
function isDefined<T>(value: T | undefined): value is T {
    return value !== undefined;
}

//usage
// const flatSellAd: IKufarAd<'realEstate', 'Квартиры'> = {
//     ad_parameters: [
//         { pl: "Этаж", vl: 3, p: "floor", v: 3, pu: "" },
//         { pl: "Количество комнат", vl: "2", p: "rooms", v: "2", pu: "" }, 
//         { pl: "Размер", vl: 50, p: "size", v: 50, pu: "м²" },
//     ]
// };

// const floor = getAdParameter(flatSellAd.ad_parameters, "balcony" );