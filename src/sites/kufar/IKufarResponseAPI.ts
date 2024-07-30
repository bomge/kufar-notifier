import type { AdParameter, InnerCategory, MainCategory, SubCategory } from "./meta/test2_generics";

export interface IKufarAdsResponse<T extends MainCategory, U extends SubCategory<T>, V extends InnerCategory<T, U>> {
    ads: IKufarAd<T, U, V>[];
    pagination: Pagination;
    total: number;
}

export interface IKufarAd<T extends MainCategory, U extends SubCategory<T>, V extends InnerCategory<T, U>> {
    account_id: string;
    account_parameters: AccountParameter[];
    ad_id: number;
    ad_link: string;
    ad_parameters:  AdParameter<T, U, V>[];
    body: string | null;
    body_short: string;
    category: string;
    company_ad: boolean;
    currency: 'BYR' | 'USD';
    images: Image[];
    is_mine: boolean;
    list_id: number;
    list_time: string;
    message_id: string;
    paid_services: PaidServices;
    phone_hidden: boolean;
    price_byn: string;
    price_usd: string;
    remuneration_type: string;
    show_parameters: ShowParameters;
    subject: string;
    type: string;
}

interface AccountParameter {
    pl: string;
    vl: string;
    p: string;
    v: string;
    pu: string;
    g?: Group[];
}

// interface AdParameter {
//     pl: string;
//     vl: string | string[];
//     p: string;
//     v: string | number | boolean | string[];
//     pu: string;
//     g?: Group[];
// }

interface Group {
    gi: number;
    gl?: string;
    go: number;
    po: number;
}

interface Image {
    id: string;
    media_storage: string;
    path: string;
    yams_storage: boolean;
}

interface PaidServices {
    halva: boolean;
    highlight: boolean;
    polepos: boolean;
    ribbons: string | null;
}

interface ShowParameters {
    show_call: boolean;
    show_chat: boolean;
    show_import_link: boolean;
    show_web_shop_link: boolean;
}

interface Pagination {
    pages: Page[];
}

interface Page {
    label: string;
    num: number;
    token: string | null;
}

