/* UL Tracker persistent draft + current-day patch */
(()=>{
  const DRAFT='ul_draft';
  const DAY='ul_current_day';
  const read=()=>{try{return JSON.parse(localStorage.getItem(DRAFT)||'{}')}catch{return{}}};
  const write=x=>localStorage.setItem(DRAFT,JSON.stringify(x));
  const selected=()=>localStorage.getItem(DAY)||'upperA';
  const persist=()=>{
    const draft=read();
    const day=selected();
    document.querySelectorAll('[data-e][data-s][data-k]').forEach(el=>{
      const e=el.dataset.e,s=el.dataset.s,k=el.dataset.k;
      const cards=[...document.querySelectorAll('.exercise')];
      const name=cards[e]?.querySelector('.exercise-name')?.textContent?.trim();
      if(!name)return;
      const key=day+'|'+name;
      if(!draft[key])draft[key]={sets:[]};
      if(!draft[key].sets[s])draft[key].sets[s]={};
      draft[key].sets[s][k]=el.value;
    });
    write(draft);
  };
  const restore=()=>{
    const draft=read(),day=selected();
    document.querySelectorAll('[data-e][data-s][data-k]').forEach(el=>{
      const cards=[...document.querySelectorAll('.exercise')];
      const name=cards[+el.dataset.e]?.querySelector('.exercise-name')?.textContent?.trim();
      const v=draft[day+'|'+name]?.sets?.[+el.dataset.s]?.[el.dataset.k];
      if(v!==undefined)el.value=v;
    });
  };
  document.addEventListener('input',()=>setTimeout(persist,0),true);
  document.addEventListener('change',()=>setTimeout(persist,0),true);
  document.addEventListener('click',e=>{
    const b=e.target.closest('#daytabs button');
    if(b){localStorage.setItem(DAY,b.dataset.day);setTimeout(restore,50);}
  },true);
  setTimeout(()=>{
    const wanted=selected();
    const b=document.querySelector(`#daytabs button[data-day="${CSS.escape(wanted)}"]`);
    if(b && !b.classList.contains('active'))b.click();
    setTimeout(restore,100);
  },120);
})();