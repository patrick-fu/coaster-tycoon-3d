import type {Path} from './types.js';
import type {PathPoint} from './people.js';

type Link={next:number|null,distance:number};
const key=(p:PathPoint)=>`${p.x},${p.y},${p.z}`;
export class Routes{
  private paths:Map<string,Path>|undefined;
  private revision=-1;
  private byId=new Map<number,Path>();
  private trees=new Map<string,Map<number,Link>>();
  private lookup(paths:Map<string,Path>,revision:number,from:PathPoint,to:PathPoint,queueRide:number|null){
    if(this.paths!==paths||this.revision!==revision){this.paths=paths;this.revision=revision;this.trees.clear();this.byId=new Map([...paths.values()].map(p=>[p.id,p]));}
    const allowed=(p:Path|undefined):p is Path=>!!p&&(p.queueFor===null||p.queueFor===queueRide);
    const start=paths.get(key(from)),goal=paths.get(key(to));if(!allowed(start)||!allowed(goal))return null;
    const cacheKey=`${goal.id}:${queueRide}`;let tree=this.trees.get(cacheKey);
    if(tree){this.trees.delete(cacheKey);this.trees.set(cacheKey,tree);}
    else{
      tree=new Map([[goal.id,{next:null,distance:0}]]);const queue=[goal];let head=0;
      while(head<queue.length){const p=queue[head++]!;for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){
        const next=paths.get(`${p.tile.x+dx!},${p.tile.y+dy!},${p.height}`);if(allowed(next)&&!tree.has(next.id)){tree.set(next.id,{next:p.id,distance:tree.get(p.id)!.distance+1});queue.push(next);}
      }}
      this.trees.set(cacheKey,tree);if(this.trees.size>32)this.trees.delete(this.trees.keys().next().value!);
    }
    return tree.has(start.id)?{start,tree}:null;
  }
  distance(paths:Map<string,Path>,revision:number,from:PathPoint,to:PathPoint,queueRide:number|null){const found=this.lookup(paths,revision,from,to,queueRide);return found?found.tree.get(found.start.id)!.distance:null;}
  next(paths:Map<string,Path>,revision:number,from:PathPoint,to:PathPoint,queueRide:number|null):PathPoint|null{
    const found=this.lookup(paths,revision,from,to,queueRide),id=found?.tree.get(found.start.id)?.next;if(id===undefined||id===null)return null;
    const p=this.byId.get(id)!;return{x:p.tile.x,y:p.tile.y,z:p.height};
  }
  find(paths:Map<string,Path>,revision:number,from:PathPoint,to:PathPoint,queueRide:number|null):PathPoint[]{
    const found=this.lookup(paths,revision,from,to,queueRide);if(!found)return[];
    const route:PathPoint[]=[];let id:number|null=found.start.id;
    while(id!==null){const p=this.byId.get(id)!;route.push({x:p.tile.x,y:p.tile.y,z:p.height});id=found.tree.get(id)!.next;}
    return route;
  }
}
