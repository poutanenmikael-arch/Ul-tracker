/* Keep in-progress workout sets in the signed-in user's local draft. */
(()=>{
  const DRAFT='ul_draft',DAY='ul_current_day';
  const readDraft=()=>{try{return JSON.parse(ulStorage.getItem(DRAFT)||'{}')}catch{return {}}};
  const writeDraft=draft=>ulStorage.setItem(DRAFT,JSON.stringify(draft));
  const selectedDay=()=>ulStorage.getItem(DAY)||'upperA';
  const persist=()=>{
    const draft=readDraft(),day=selectedDay(),cards=Array.from(document.querySelectorAll('.exercise'));
    document.querySelectorAll('[data-e][data-s][data-k]').forEach(input=>{
      const card=cards[+input.dataset.e],name=card?.querySelector('.exercise-name')?.textContent?.trim();
      if(!name)return;
      const key=day+'|'+name,setIndex=+input.dataset.s,field=input.dataset.k;
      if(!draft[key])draft[key]={sets:[]};
      if(!draft[key].sets[setIndex])draft[key].sets[setIndex]={};
      draft[key].sets[setIndex][field]=input.value;
      if(card.dataset.exerciseId)draft[key].exerciseId=card.dataset.exerciseId;
    });
    writeDraft(draft);
  };
  const restore=()=>{
    const draft=readDraft(),day=selectedDay(),cards=Array.from(document.querySelectorAll('.exercise'));
    document.querySelectorAll('[data-e][data-s][data-k]').forEach(input=>{
      const card=cards[+input.dataset.e],name=card?.querySelector('.exercise-name')?.textContent?.trim();
      const value=name?draft[day+'|'+name]?.sets?.[+input.dataset.s]?.[input.dataset.k]:undefined;
      if(value!==undefined)input.value=value;
    });
  };
  document.addEventListener('input',()=>setTimeout(persist,0),true);
  document.addEventListener('change',()=>setTimeout(persist,0),true);
  document.addEventListener('click',event=>{
    const button=event.target.closest('#daytabs button');
    if(button){ulStorage.setItem(DAY,button.dataset.day);setTimeout(restore,50)}
  },true);
  setTimeout(()=>{
    const wanted=selectedDay(),button=document.querySelector(`#daytabs button[data-day="${CSS.escape(wanted)}"]`);
    if(button&&!button.classList.contains('active'))button.click();
    setTimeout(restore,100);
  },120);
})();
