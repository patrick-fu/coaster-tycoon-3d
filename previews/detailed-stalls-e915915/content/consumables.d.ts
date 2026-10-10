import type { ContentIdentity } from './registry.js';
import type { Rules } from '../simulation/types.js';
export declare const commerceProfileId: 'independent.consumables-v1';
export declare const productIds: readonly ['independent.burger', 'independent.soft-drink'];
export declare const containerIds: readonly ['emptyBurgerBox', 'emptyCan'];
export type ProductId = typeof productIds[number];
export type ContainerId = typeof containerIds[number];
export type ProductRule = {
    stockCost: number;
    defaultPrice: number;
    maxPrice: number;
    useUnits: number;
    effects: {
        hunger: number;
        thirst: number;
        bladder: number;
    };
    containerId: ContainerId;
};
export type CommerceProfile = {
    consumeTicks: number;
    unitsPerCall: number;
    products: Record<ProductId, ProductRule>;
};
export declare const productService: (id: ProductId) => "drink" | "food";
export declare function withConsumablesProfile(base: Rules): Rules;
export declare function validateCommerceProfiles(input: Rules['commerceProfiles']): Record<string, CommerceProfile>;
export declare function productRule(id: unknown, rules: Rules): ProductRule;
export declare function facilityProduct(content: ContentIdentity, rules: Rules): {
    id: ProductId;
    rule: ProductRule;
} | null;
export declare function facilityStockCost(f: {
    content?: ContentIdentity;
    kind: 'food' | 'drink' | 'restroom';
}, rules: Rules): number;
export declare function productDescriptors(rules: Rules): {
    id: "independent.burger" | "independent.soft-drink";
    label: string;
    service: "drink" | "food";
    defaultPrice: number;
    maxPrice: number;
    stockCost: number;
    useUnits: number;
    container: {
        id: "emptyBurgerBox" | "emptyCan";
        label: string;
    };
}[];
export declare function facilityProductView(f: {
    content: ContentIdentity;
    kind: 'food' | 'drink' | 'restroom';
    sales: number;
    income: number;
}, rules: Rules): {
    id: "independent.burger" | "independent.soft-drink";
    label: string;
    stockCost: number;
    stockExpense: number;
    grossMargin: number;
} | null;
