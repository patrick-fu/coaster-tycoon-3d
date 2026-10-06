import {ensure} from './validation.js';
export class FixedClock{
  private balance=0;
  private last:number;
  speed=1;
  constructor(private hz:number,now:number){this.last=now;}
  poll(now:number,paused:boolean,maxTicks=40){
    ensure(Number.isFinite(now)&&now>=this.last,'INVALID_COMMAND','Invalid monotonic time.');
    const elapsed=now-this.last;this.last=now;
    if(!paused)this.balance+=elapsed*this.hz*this.speed/1000;
    ensure(Number.isSafeInteger(Math.floor(this.balance)),'CAPACITY','Clock backlog exhausted.');
    const ticks=paused?0:Math.min(maxTicks,Math.floor(this.balance));this.balance-=ticks;return{ticks,backlog:Math.floor(this.balance)};
  }
  reset(now:number){this.last=now;this.balance=0;}
}
