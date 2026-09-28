/* UL Tracker persistent draft, scoped to the authenticated account */
(()=>{
  const DRAFT='ul_draft',DAY='ul_current_day',HISTORY='ul_history';
  const read=(k,f)=>{try{return JSON.parse(ulStorage.getItem(k)||'')}catch{return f}};
  const readDraft=()=>read(DRAFT,{});
  const writeDraft=x=>ulStorage.setItem(DRAFT,JSON.stringify(x));
  const selected=()=>ulStorage.getItem(DAY)||'upperA';
  const persist=()=>{
    const draft=readDraft(),day=selected();
    document.querySelectorAll('[data-e][data-s][data-k]').forEach(el=>{
      const cards=[...document.querySelectorAll('.exercise')],name=cards[+el.dataset.e]?.querySelector('.exercise-name')?.textContent?.trim();
      if(!name)return; const key=day+'|'+name,s=+el.dataset.s,k=el.dataset.k;
      if(!draft[key])draft[key]={sets:[]}; if(!draft[key].sets[s])draft[key].sets[s]={}; draft[key].sets[s][k]=el.value;
    }); writeDraft(draft);
  };
  const restore=()=>{
    const draft=readDraft(),day=selected(),cards=[...document.querySelectorAll('.exercise')];
    document.querySelectorAll('[data-e][data-s][data-k]').forEach(el=>{const name=cards[+el.dataset.e]?.querySelector('.exercise-name')?.textContent?.trim(),v=draft[day+'|'+name]?.sets?.[+el.dataset.s]?.[el.dataset.k];if(v!==undefined)el.value=v});
  };
  const saveFallback=()=>{
    if(typeof window.saveWorkout==='function'){window.saveWorkout();return}
    const day=selected(),cards=[...document.querySelectorAll('.exercise')],out=[];
    for(const card of cards){
      const name=card.querySelector('.exercise-name')?.textContent?.trim();
      if(!name)continue;
      const inputs=[...card.querySelectorAll('[data-s][data-k]')],sets=[];
      inputs.forEach(el=>{const s=+el.dataset.s;if(!sets[s])sets[s]={};sets[s][el.dataset.k]=el.value});
      if(sets.some(s=>!s||s.weight===''||s.reps===''||s.rir==='')){const t=document.querySelector('#toast');if(t){t.textContent='Täytä jokaisesta sarjasta kg, reps ja RIR.';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}return}
      out.push({name,sets});
    }
    if(!out.length)return;
    const h=read(HISTORY,[]);
    h.unshift({id:crypto.randomUUID(),date:new Date().toISOString(),day,exercises:out});
    ulStorage.setItem(HISTORY,JSON.stringify(h.slice(0,250)));
    const d=readDraft();out.forEach(e=>delete d[`${day}|${e.name}`]);writeDraft(d);
    const t=document.querySelector('#toast');if(t){t.textContent='Treeni tallennettu ✓';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
  };
  document.addEventListener('input',()=>setTimeout(persist,0),true);
  document.addEventListener('change',()=>setTimeout(persist,0),true);
  document.addEventListener('click',e=>{
    const b=e.target.closest('#daytabs button');
    if(b){ulStorage.setItem(DAY,b.dataset.day);setTimeout(restore,50)}
    if(e.target.closest('#saveBtn'))setTimeout(saveFallback,0);
  },true);
  setTimeout(()=>{const wanted=selected(),b=document.querySelector(`#daytabs button[data-day="${CSS.escape(wanted)}"]`);if(b&&!b.classList.contains('active'))b.click();setTimeout(restore,100)},120);
})();
