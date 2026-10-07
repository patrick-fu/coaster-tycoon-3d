(async()=>{
 const {createContentBrowser}=await import('./content-browser.js'),game=await import('./game.js'),checks=[];
 const assert=(ok,message)=>{if(!ok)throw new Error(message);},wait=async predicate=>{for(let n=0;n<100;n++){if(predicate())return;await new Promise(r=>setTimeout(r,20));}throw new Error('Library lifecycle condition did not finish');};
 const before=await game.request('save',null),catalogue=await game.request('catalogue',null);
 game.contentLibrary.destroy();
 let library=null;
 try{
  let reject,loads=0,selected=null;
  const deferred=new Promise((_,fail)=>{reject=fail;});
  const unsafe=structuredClone(catalogue);
  unsafe.families[0].label='Steel <img src=x onerror="window.libraryInjected=true">';
  unsafe.families[0].reference={sourceUrl:'javascript:window.libraryInjected=true'};
  unsafe.variants[0].label='Train <svg onload="window.libraryInjected=true">';
  library=createContentBrowser({loadCatalogue:()=>++loads===1?deferred:Promise.resolve(unsafe),onChoose:content=>selected=content});
  library.open();library.open();
  assert(loads===1&&document.querySelectorAll('#content-library-window').length===1,'Concurrent opens duplicate catalogue work');
  assert(document.getElementById('content-library-window').textContent.includes('Loading Catalogue'),'Loading state is invisible');
  reject(new Error('Offline <img src=x onerror="window.libraryInjected=true">'));
  await wait(()=>document.getElementById('content-library-retry'));
  assert(!document.querySelector('#content-library-window img')&&!window.libraryInjected,'Error text executed markup');
  document.getElementById('content-library-retry').click();
  await wait(()=>document.querySelector('.content-library-card'));
  assert(loads===2&&document.getElementById('content-library-window').textContent.includes('Steel <img'),'Retry did not expose the real returned text');
  assert(!document.querySelector('#content-library-window img, #content-library-window svg[onload], #content-library-window a[href^="javascript:"]')&&!window.libraryInjected,'Catalogue text or source URL executed markup');
  document.querySelector('.content-library-choose-btn').click();
  assert(selected?.variantId===catalogue.variants[0].id,'Successful retry cannot select exact content');
  checks.push('Loading is shared, failed requests expose safe text, and a real retry recovers selection');
  library.destroy();
  const pending=structuredClone(catalogue);
  pending.variants[0].choices[0].capabilities={construction:{kind:'future-track'},operation:{kind:'future-cycle'},presentation:{kind:'future-renderer'}};
  library=createContentBrowser({loadCatalogue:async()=>pending,onChoose:()=>{throw new Error('Unknown adapter was selected');}});
  library.open();await wait(()=>document.querySelector('.content-library-card'));
  assert(document.querySelector('.content-library-choose-btn').disabled,'Unknown adapter tags became buildable');
  library.destroy();
  let resolve;
  library=createContentBrowser({loadCatalogue:()=>new Promise(done=>{resolve=done;}),onChoose(){}});
  library.open();library.destroy();resolve(catalogue);
  await new Promise(r=>setTimeout(r,60));
  assert(!document.getElementById('content-library-window'),'Disposed pending request recreated a window');
  checks.push('Unknown adapter kinds remain disabled and pending completion after destroy leaves no window');
  assert(await game.request('save',null)===before,'Injected catalogue lifecycle changed authoritative park state');
  checks.push('Provider failure, retry, untrusted labels and disposal preserve the actual park byte for byte');
  return{ok:true,checks};
 }catch(error){return{ok:false,checks,failure:error.stack??String(error)};}
 finally{library?.destroy();game.contentLibrary.open({opener:document.getElementById('content-library')});}
})()
