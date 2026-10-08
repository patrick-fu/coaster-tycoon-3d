import type {FixedRideProfile,Rules} from '../simulation/types.js';

export const carouselProfileId='independent.carousel-v1';
export const carouselProfile:FixedRideProfile={
 size:3,bodyHeight:64,portalHeight:24,deckMm:400,
 seats:[
  {x:0,y:1600,z:4200,yaw:1440},{x:1033,y:1600,z:2494,yaw:1800},
  {x:2970,y:1600,z:2970,yaw:2160},{x:2494,y:1600,z:1033,yaw:2520},
  {x:4200,y:1600,z:0,yaw:2880},{x:2494,y:1600,z:-1033,yaw:3240},
  {x:2970,y:1600,z:-2970,yaw:3600},{x:1033,y:1600,z:-2494,yaw:3960},
  {x:0,y:1600,z:-4200,yaw:4320},{x:-1033,y:1600,z:-2494,yaw:4680},
  {x:-2970,y:1600,z:-2970,yaw:5040},{x:-2494,y:1600,z:-1033,yaw:5400},
  {x:-4200,y:1600,z:0,yaw:5760},{x:-2494,y:1600,z:1033,yaw:6120},
  {x:-2970,y:1600,z:2970,yaw:6480},{x:-1033,y:1600,z:2494,yaw:6840},
 ],
 boardTicks:8,minLoadTicks:80,maxLoadTicks:240,accelTicks:80,cruiseTicks:880,decelTicks:80,
 angleUnits:5760,peakUnitsPerTick:12,unloadTicks:40,
 buildPrice:2000,portalPrice:50,defaultPrice:10,maxPrice:100,upkeep:100,
 inspectionInterval:16384,inspectionTicks:160,repairTicks:200,
};

export function withCarouselProfile(rules:Rules):Rules{
 return{...structuredClone(rules),fixedProfiles:{...rules.fixedProfiles,[carouselProfileId]:structuredClone(carouselProfile)}};
}
