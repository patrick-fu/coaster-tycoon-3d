export type Direction=0|1|2|3;
export type Attitude=-1|0|1;
export type Tile={x:number,y:number};
export type Connector={x:number,y:number,z:number,direction:Direction,pitch:Attitude,bank:Attitude};
export type Cell={x:number,y:number,low:number,high:number,mask:number};
export type PieceRule={price:number,station:boolean,end:{x:number,y:number,z:number,turn:number,pitch:Attitude,bank:Attitude},entry:{pitch:Attitude,bank:Attitude},cells:Cell[]};
export type Rules={id:string,evidence:'project-candidate'|'reference-verified',pathPrice:number,terrainPrice:number,refundPerThousand:number,maxSupport:number,maxHeight:number,pieces:Record<string,PieceRule>};
export type WorldOptions={side:number,cash:number,maxLoan:number,seed:number,land?:{tile:Tile,height:number,water:number,owned:boolean}[]};
export type Track={id:number,kind:'track',ride:number,piece:string,origin:Connector};
export type Path={id:number,kind:'path',tile:Tile,height:number,queueFor:number|null};
export type Element=Track|Path;
export type Ride={id:number,name:string,anchor:Connector,track:number[]};
export type State={version:1,rules:string,side:number,tick:number,revision:number,topologyRevision:number,rng:number,paused:boolean,initialCash:number,cash:number,loan:number,maxLoan:number,spent:number,refunded:number,nextElement:number,terrain:number[],water:number[],owned:boolean[],rides:Ride[],elements:Element[]};
export type Command=
 | {type:'create-ride',name:string,tile:Tile,height:number,direction:Direction}
 | {type:'append-track',ride:number,piece:string}
 | {type:'remove-last-track',ride:number}
 | {type:'place-path',tile:Tile,height:number,queueFor:number|null}
 | {type:'remove-path',id:number}
 | {type:'set-terrain',tile:Tile,height:number,water:number}
 | {type:'set-loan',amount:number}
 | {type:'set-paused',paused:boolean};
export type ErrorCode='INVALID_COMMAND'|'STALE_REVISION'|'OFF_MAP'|'NOT_OWNED'|'GEOMETRY'|'CLEARANCE'|'SUPPORT'|'CAPACITY'|'INSUFFICIENT_CASH'|'UNKNOWN_RIDE'|'UNKNOWN_ELEMENT'|'CIRCUIT_CLOSED'|'INVALID_SAVE'|'WRONG_RULES';
export type Result<T>={ok:true,value:T}|{ok:false,error:{code:ErrorCode,message:string}};
export type Quote={revision:string,cost:number,cells:Cell[],endpoint?:Connector};
export type Receipt={revision:string,cost:number,id?:number};
export const LIMITS={mapMin:15,mapMax:256,rideSlots:255,tileElements:196096,surfaceRecords:65536} as const;
