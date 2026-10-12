import type {State} from './types.js';
export function random(state:State,min:number,max:number){state.rng=(state.rng*1664525+1013904223)>>>0;return min+state.rng%(max-min+1);}
