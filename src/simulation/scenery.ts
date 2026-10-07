export const sceneryTypes=['tree','flower','hedge','lamp','fountain','rock'] as const;
export type SceneryType=typeof sceneryTypes[number];
export type SceneryRules=Record<SceneryType,{price:number,height:number}>;
// Independently authored candidate costs and occupied heights, not vanilla rates.
export const defaultScenery:SceneryRules={tree:{price:60,height:64},flower:{price:30,height:16},hedge:{price:45,height:16},lamp:{price:70,height:40},fountain:{price:300,height:24},rock:{price:35,height:16}};
