import  type {categories as adParameterStructure} from'./categories_result'

export type MainCategory = keyof typeof adParameterStructure;

export type SubCategory<T extends MainCategory> = keyof typeof adParameterStructure[T];

export type InnerCategory<T extends MainCategory, U extends SubCategory<T>> = keyof typeof adParameterStructure[T][U];

type AdParameterKeys<T extends MainCategory, U extends SubCategory<T>, V extends InnerCategory<T, U>> = keyof typeof adParameterStructure[T][U][V];

type AdParameterValueType = string | number | string[] | undefined;

export interface AdParameter<T extends MainCategory, U extends SubCategory<T>, V extends InnerCategory<T, U>> {
    pl: string; // display label
    vl: AdParameterValueType;
    p: AdParameterKeys<T, U, V>; //use the dynamic keys here
    v: AdParameterValueType;
    pu: string; // presumably the unit
}

interface IKufarAd<T extends MainCategory, U extends SubCategory<T>, V extends InnerCategory<T, U>> {
    ad_parameters: AdParameter<T, U, V>[]; // Use the new nested structure
}

export function getAdParameter<T extends MainCategory, U extends SubCategory<T>, V extends InnerCategory<T, U>, K extends AdParameterKeys<T, U, V>>(
    params: AdParameter<T, U, V>[],
    key: K
): AdParameterValueType | undefined {
    const param = params.find(a => a.p === key);
    return param?.vl;
}

function isDefined<T>(value: T | undefined): value is T {
    return value !== undefined;
}

// const flatAd: IKufarAd<'realEstate', 'Квартиры', 'Квартиры {category:1010 type:let}'> = {
//     ad_parameters: [
//         { pl: "Тип сделки", vl: "sell", p: "flat_kitchen", v: "sell", pu: "" },
//     ]
// };

// const dealType = getAdParameter(flatAd.ad_parameters, "flat_bath");
