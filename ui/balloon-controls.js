import {facilityInspection} from './consumable-controls.js';
import {balloonColour} from './balloon-colours.js';

function colourRow(label, index, {escape}) {
  const colour=balloonColour(index);
  return `<div class="row"><span>${escape(label)}</span><strong><svg class="information-product-icon" aria-hidden="true" width="16" height="16" viewBox="0 0 16 16"><path d="M8 12c-1 1 1 2 0 3" fill="none" stroke="currentColor" stroke-width=".8"/><path d="M8 1.5c-6 0-6 8 0 10l-1 1h2l-1-1c6-2 6-10 0-10" fill="${colour.hex}" stroke="rgba(0,0,0,.35)" stroke-width=".8"/><path d="M5.5 4C6 3 7 2.5 8 2.5" fill="none" stroke="white" stroke-opacity=".6" stroke-width=".8"/></svg> ${escape(colour.label)}</strong></div>`;
}
export function balloonInspection(data, packet, helpers) {
  if (data?.kind!=='balloon' || data.product?.id!=='independent.balloon') throw new Error('Balloon inspection requires the actual projected product.');
  balloonColour(data.balloonColour);
  return facilityInspection(data,packet,{...helpers,row:(label,value)=>helpers.row(label,value)+(label==='Product'?colourRow('Colour',data.balloonColour,helpers):'')});
}
export function guestBalloonHtml(data, helpers) {
  return data.balloonColour===null?'':colourRow('Balloon',data.balloonColour,helpers);
}
