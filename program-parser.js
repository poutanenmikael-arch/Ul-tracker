;(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ulProgramParser=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const slug=value=>String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'day';
  const normalizeLine=value=>String(value).normalize('NFKC').replace(/[‐‑‒–—−]/g,'-').replace(/[×✕]/g,'x').replace(/\u00a0/g,' ').trim();
  const formatReps=(low,high)=>low===high?String(low):`${low}–${high}`;
  const parseRep=value=>{const m=String(value).trim().match(/^(\d{1,3})(?:\s*-\s*(\d{1,3}))?$/);if(!m)return null;const low=+m[1],high=+(m[2]||m[1]);return low>0&&high>=low&&high<=200?{low,high}:null};
  const issue=(issues,line,text,message)=>issues.push({line,text,message});
  const headingName=text=>{
    const value=text.replace(/^#{1,6}\s*/,'').replace(/\*\*/g,'').trim().replace(/:$/,'');
    if(/^(?:day|workout|session)\s+[a-z0-9]+(?:\s*[-:]\s*.+)?$/i.test(value))return value;
    if(/^(?:upper|lower|push|pull|legs?|full\s*body|arm(?:s)?|chest|back|shoulder(?:s)?)(?:\s+(?:day|[a-z0-9]+))?$/i.test(value))return value;
    return null;
  };
  const metadata=(text)=>{
    let rir=null,rpe=null,rest=null,notes=null,body=text;
    body=body.replace(/(?:,?\s*\[?\s*(?:note|notes)\s*:\s*([^\]]+)\]?\s*)$/i,(_,v)=>{notes=v.trim();return ''});
    body=body.replace(/(?:,?\s*(?:@\s*)?RIR\s*(?:of\s*)?(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\b)/ig,(_,a,b)=>{rir={min:+a,max:+(b||a)};return ''});
    body=body.replace(/(?:,?\s*)(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*RIR\b/ig,(_,a,b)=>{rir={min:+a,max:+(b||a)};return ''});
    body=body.replace(/(?:,?\s*(?:@\s*)?RPE\s*(?:of\s*)?(\d+(?:\.\d+)?)\b)/ig,(_,a)=>{rpe=+a;return ''});
    body=body.replace(/(?:,?\s*(?:rest(?:\s*time)?\s*[:=]?\s*)(\d+(?:\.\d+)?)\s*(seconds?|secs?|s|minutes?|mins?|m)\b)/ig,(_,n,unit)=>{rest={value:+n,unit:/^(?:s|sec|secs|second|seconds)$/i.test(unit)?'seconds':'minutes'};return ''});
    return {body:body.trim().replace(/[|,;:-]+$/,'').trim(),rir,rpe,rest,notes};
  };
  const parsePrescriptions=(value)=>{
    const source=normalizeLine(value).trim().replace(/\breps?\b/ig,'').trim();
    const groups=source.split(/\s*[,;+]\s*/).filter(Boolean),plans=[];
    for(const group of groups){
      let m=group.match(/^(\d+)\s*x\s*(\d+(?:\s*-\s*\d+)?)(?:\s*(?:sets?\s*(?:of)?\s*)?)?$/i);
      if(!m)m=group.match(/^(\d+)\s+sets?\s+(?:of\s+)?(\d+(?:\s*-\s*\d+)?)$/i);
      if(!m)return null;
      const reps=parseRep(m[2]),sets=+m[1];if(!reps||sets<1||sets>50)return null;
      plans.push({sets,reps:formatReps(reps.low,reps.high),low:reps.low,high:reps.high});
    }
    return plans.length?plans:null;
  };
  const parseExercise=(source,line,issues,tableHeaders)=>{
    let text=normalizeLine(source).replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/,'').trim();
    if(!text)return null;
    if(text.startsWith('|')){
      const cells=text.replace(/^\||\|$/g,'').split('|').map(x=>x.trim());
      if(cells.every(x=>/^:?-{2,}:?$/.test(x)))return {type:'separator'};
      if(tableHeaders){const row={};tableHeaders.forEach((h,i)=>row[h]=cells[i]||'');return parseTableRow(row,line,source,issues)}
      return {type:'table-cells',cells};
    }
    const meta=metadata(text);text=meta.body.replace(/\breps?\b/ig,'').replace(/(\d+\s+sets?)\s*,\s*(\d+)/ig,'$1 of $2').trim();
    let name='',plan=null;
    // Leading compact prescription: 3x Bench Press, 8-10 reps.
    let m=text.match(/^(\d+)\s*x\s*(.+?)\s*[,|]\s*(\d+(?:\s*-\s*\d+)?)\s*(?:reps?)?$/i);
    if(m){name=m[2].trim();const rp=parseRep(m[3]);if(rp)plan=[{sets:+m[1],reps:formatReps(rp.low,rp.high),low:rp.low,high:rp.high}]}
    // Name | sets | reps, or name: prescribed pattern.
    if(!plan){const pipe=text.split('|').map(x=>x.trim());if(pipe.length>=3){name=pipe[0];const sets=pipe[1].match(/^(\d+)\s*(?:sets?)?$/i),repText=pipe.slice(2).join(' ');if(sets)plan=parsePrescriptions(`${sets[1]} sets ${repText}`)}}
    if(!plan){
      const cleaned=text.replace(/[()]\s*([^()]*)\s*[)]/g,(whole,inside)=>{const p=parsePrescriptions(inside);if(p){plan=p;return ' '}return whole});
      if(!plan){const patterns=[/(\d+\s*x\s*\d+(?:\s*-\s*\d+)?(?:\s*[,;+]\s*\d+\s*x\s*\d+(?:\s*-\s*\d+)?)*)\s*$/i,/(\d+\s+sets?\s+(?:of\s+)?\d+(?:\s*-\s*\d+)?(?:\s*(?:[,;+]\s*)?\d+\s*x\s*\d+(?:\s*-\s*\d+)?)*)\s*$/i];
        for(const pattern of patterns){const found=cleaned.match(pattern);if(found){plan=parsePrescriptions(found[1]);if(plan){name=cleaned.slice(0,found.index).replace(/[\s:|,;-]+$/,'').trim();break}}}}
      else name=cleaned.replace(/[\s:|,;-]+$/,'').trim();
    }
    if(!plan||!name){
      // Explicit prescription markers that were only partly understood must stay unresolved.
      if(/\d\s*x\s*\d|\b(?:sets?|reps?)\b|\bRIR\b|\bRPE\b|\brest\b/i.test(text))issue(issues,line,source,'Could not fully read this exercise line. Keep the original line and correct its sets/reps or metadata.');
      else issue(issues,line,source,'Could not identify this line as a workout heading or exercise. Add a recognized heading and a sets-and-reps prescription.');
      return null;
    }
    if(plan.some(p=>p.sets<1||p.sets>50)){issue(issues,line,source,'Set count must be between 1 and 50.');return null}
    const total=plan.reduce((n,p)=>n+p.sets,0),reps=plan.length===1?plan[0].reps:plan.map(p=>`${p.sets}×${p.reps}`).join(', ');
    const exercise={name,sets:total,reps,exerciseId:'name:'+name.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase()};
    if(plan.length>1)exercise.setPlan=plan.map(({sets,reps})=>({sets,reps}));
    if(meta.rir){if(meta.rir.min<0||meta.rir.max>10||meta.rir.max<meta.rir.min)issue(issues,line,source,'Check the RIR value.');else{exercise.minRir=meta.rir.min;exercise.maxRir=meta.rir.max}}
    if(meta.rpe!=null){if(meta.rpe<1||meta.rpe>10)issue(issues,line,source,'RPE must be between 1 and 10.');else exercise.targetRpe=meta.rpe}
    if(meta.rest){if(meta.rest.value<=0||meta.rest.value>3600)issue(issues,line,source,'Check the rest period.');else exercise.rest=meta.rest.value/(meta.rest.unit==='seconds'?60:1)}
    if(meta.notes)exercise.notes=meta.notes;
    exercise.sourceText=source;
    return {type:'exercise',exercise};
  };
  const parseTableRow=(row,line,source,issues)=>{
    const get=names=>{for(const key of Object.keys(row)){if(names.includes(key.toLowerCase().replace(/[^a-z]/g,'')))return row[key]}return ''};
    const name=get(['exercise','movement','name']),sets=get(['sets','set']),reps=get(['reps','rep','repsrange','rep range']);
    if(!name||!sets||!reps){issue(issues,line,source,'Markdown table row needs Exercise, Sets, and Reps columns.');return null}
    const rest=get(['rest','resttime']),rir=get(['rir']),rpe=get(['rpe']),notes=get(['notes','note']),extras=[name,`${sets} sets of ${reps} reps`,rir?`RIR ${rir}`:'',rpe?`RPE ${rpe}`:'',rest?`rest ${rest}`:'',notes?`note: ${notes}`:''].filter(Boolean).join(', ');
    return parseExercise(extras,line,issues,null);
  };
  const parseProgramText=source=>{
    const original=String(source??''),lines=original.split(/\r?\n/),days=[],issues=[];let current=null,tableHeaders=null,pendingTables=[];
    const ensureDefault=()=>{if(!current){current={id:'workout',name:'Workout',exercises:[],_line:1};days.push(current)}return current};
    lines.forEach((raw,index)=>{
      const line=index+1,text=normalizeLine(raw);if(!text){tableHeaders=null;return}
      if(/^\s*\|?\s*(?:exercise|movement|name)\s*\|/i.test(text)){tableHeaders=text.replace(/^\||\|$/g,'').split('|').map(v=>v.trim());return}
      if(tableHeaders&&(text.startsWith('|')||text.includes('\t'))){if(/^\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)+\|?$/.test(text))return;const cells=text.replace(/^\||\|$/g,'').split(text.includes('\t')?'\t':'|').map(v=>v.trim());const row=parseTableRow(Object.fromEntries(tableHeaders.map((h,i)=>[h,cells[i]||''])),line,raw,issues);if(row?.type==='exercise')ensureDefault().exercises.push(row.exercise);return}
      tableHeaders=null;
      if(/^(?:\|\s*)?(?:exercise|movement|name)\s*[\t|]/i.test(text)){
        const cells=text.replace(/^\||\|$/g,'').split(/[|\t]/).map(x=>x.trim());tableHeaders=cells;return;
      }
      const trimmed=text.replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/,'').trim(),heading=headingName(trimmed);
      if(heading){current={id:slug(heading),name:heading.slice(0,60),exercises:[],_line:line,_source:raw};days.push(current);return}
      if(/^\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)+\|?$/.test(text))return;
      // Superset labels cannot be represented by the current workout model; preserve for explicit correction.
      if(/\b(?:superset|\bA1\s*[/+&-]\s*A2\b|\bB1\s*[/+&-]\s*B2\b)/i.test(text)||/^[AB][12]\s*[.:)-]?\s+\S/i.test(trimmed)){issue(issues,line,raw,'Superset pairing is not supported by this program format yet. Split the exercises into separate lines and review the pairing.');return}
      const parsed=parseExercise(raw,line,issues,null);if(parsed?.type==='exercise')ensureDefault().exercises.push(parsed.exercise);else if(parsed?.type==='table-cells')issue(issues,line,raw,'Markdown table row needs a recognized Exercise, Sets, and Reps header.');
    });
    days.forEach((day,index)=>{if(!day.exercises.length)issue(issues,day._line,day._source||day.name,'This workout heading has no recognized exercises.');day.id=slug(day.name)+'-'+(index+1);delete day._line;delete day._source});
    const exerciseCount=days.reduce((n,d)=>n+d.exercises.length,0),ids=new Set();days.forEach(d=>{const base=d.id;let id=base,suffix=2;while(ids.has(id))id=base+'-'+suffix++;ids.add(id);d.id=id});
    return {program:exerciseCount?{days,optional:[]}:null,issues,exerciseCount,valid:exerciseCount>0&&issues.length===0};
  };
  return {parseProgramText,normalizeLine};
});
