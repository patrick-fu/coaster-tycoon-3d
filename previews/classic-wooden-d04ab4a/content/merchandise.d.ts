import type { Rules } from '../simulation/types.js';
export declare const merchandiseProfileId: 'independent.merchandise-v1';
export declare const informationProfileId: 'independent.information-kiosk-v1';
export declare const merchandiseIds: readonly ['independent.map', 'independent.umbrella'];
export type MerchandiseId = typeof merchandiseIds[number];
export type MerchandiseRule = {
    stockCost: number;
    defaultPrice: number;
    maxPrice: number;
    value: number;
};
export type MerchandiseProfile = {
    products: Record<MerchandiseId, MerchandiseRule>;
};
export type MerchandiseAccount = {
    readonly sales: number;
    readonly income: number;
};
export type MerchandiseAccounts = Readonly<Record<MerchandiseId, MerchandiseAccount>>;
export type InformationProducts = Readonly<Record<MerchandiseId, MerchandiseAccount & {
    readonly price: number;
}>>;
export type GuestMerchandise = {
    readonly map: boolean;
    readonly umbrellaColour: number | null;
};
export declare function withMerchandiseProfile(base: Rules): Rules;
export declare function isMerchandiseId(id: unknown): id is MerchandiseId;
export declare function emptyMerchandiseAccounts(): MerchandiseAccounts;
export declare function merchandiseProfile(rules: Rules): MerchandiseProfile;
export declare function informationProducts(rules: Rules): InformationProducts;
export declare function validateMerchandiseProfiles(input: Rules['merchandiseProfiles']): Record<string, MerchandiseProfile>;
export declare function informationProductViews(products: InformationProducts, rules: Rules): {
    'independent.map': {
        sales: number;
        income: number;
        price: number;
        maxPrice: number;
        stockCost: number;
        stockExpense: number;
        grossMargin: number;
    };
    'independent.umbrella': {
        sales: number;
        income: number;
        price: number;
        maxPrice: number;
        stockCost: number;
        stockExpense: number;
        grossMargin: number;
    };
};
