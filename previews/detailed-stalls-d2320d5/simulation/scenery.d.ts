export declare const sceneryTypes: readonly ['tree', 'flower', 'hedge', 'lamp', 'fountain', 'rock'];
export type SceneryType = typeof sceneryTypes[number];
export type SceneryRules = Record<SceneryType, {
    price: number;
    height: number;
}>;
export declare const defaultScenery: SceneryRules;
