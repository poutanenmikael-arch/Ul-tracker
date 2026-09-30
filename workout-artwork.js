(function(root){
  'use strict';

  const ASSET_ROOT='./workout-artwork';
  const FALLBACK_CATEGORY='front';
  const CATEGORY_SET=new Set(['back','chest','arms','legs','front','posterior']);
  const MUSCLE_CATEGORY=new Map([
    ['front','front'],['posterior','posterior'],
    ['back','back'],['lats','back'],['latissimus dorsi','back'],['traps','back'],['trapezius','back'],['rhomboids','back'],['upper back','back'],['mid back','back'],
    ['chest','chest'],['pecs','chest'],['pectorals','chest'],['pectoralis','chest'],['pectoralis major','chest'],
    ['biceps','arms'],['triceps','arms'],['brachialis','arms'],['forearms','arms'],['arms','arms'],
    ['quads','legs'],['quadriceps','legs'],['hamstrings','legs'],['calves','legs'],['legs','legs'],
    ['abs','front'],['abdominals','front'],['core','front'],['front delts','front'],['anterior delts','front'],['side delts','front'],['shoulders','front'],
    ['glutes','posterior'],['rear delts','posterior'],['posterior chain','posterior'],['gluteus maximus','posterior'],['lower back','posterior']
  ]);
  // The existing program stores exercise tuples, not canonical muscle metadata. These rules
  // add anatomy to those existing exercise names without duplicating the workout/program list.
  const EXERCISE_RULES=[
    {pattern:/\b(?:leg|hamstring|lying|seated|standing|prone).{0,24}\bcurl\b/i,primary:'hamstrings'},
    {pattern:/\b(?:triceps|rope|cable).{0,28}\bpush.?down\b|\bpush.?down\b|\btriceps.{0,24}\bextension\b/i,primary:'triceps'},
    {pattern:/\b(?:biceps|preacher|hammer|incline db|dumbbell|cable).{0,24}\bcurl\b|\b(?:preacher|hammer) curl\b/i,primary:'biceps'},
    {pattern:/\b(?:shoulder|overhead) press\b|\b(?:lateral|front|side delt) raise\b/i,primary:'front delts',secondary:['triceps']},
    {pattern:/\b(?:romanian deadlift|rdl|good morning|hip thrust|glute bridge|back extension|glute kickback|kickback)\b/i,primary:'posterior chain',secondary:['hamstrings','glutes']},
    {pattern:/\b(?:row|lat pulldown|pulldown|chin.?up|pull.?up|pull.?down)\b/i,primary:'back',secondary:['biceps','rear delts']},
    {pattern:/\b(?:pec deck|chest press|bench press|incline.{0,24}press|press.{0,24}chest|barbell.{0,24}press|machine.{0,24}press|cable.{0,24}fly|chest fly|pec fly|push.?up)\b/i,primary:'chest',secondary:['triceps','front delts']},
    {pattern:/\b(?:hack squat|bulgarian split squat|split squat|squat|leg press|leg extension|lunge|step.?up)\b/i,primary:'quadriceps',secondary:['glutes']},
    {pattern:/\b(?:calf raise|calf press|seated calf)\b/i,primary:'calves'}
  ];

  function exerciseRows(workout){
    if(Array.isArray(workout))return workout;
    if(workout&&Array.isArray(workout.exercises))return workout.exercises;
    if(workout&&typeof workout==='object'&&(workout.name||workout.exercise))return [workout];
    return [];
  }
  function exerciseName(entry){
    if(typeof entry==='string')return entry.trim();
    if(Array.isArray(entry))return String(entry[0]||'').trim();
    return String(entry&&(entry.name||entry.exercise||entry.exercise_name)||'').trim();
  }
  function setWeight(entry){
    if(Array.isArray(entry)&&Number.isFinite(Number(entry[1]))&&Number(entry[1])>0)return Number(entry[1]);
    if(entry&&Array.isArray(entry.sets))return Math.max(1,entry.sets.length);
    if(entry&&Number.isFinite(Number(entry.sets))&&Number(entry.sets)>0)return Number(entry.sets);
    if(entry&&Number.isFinite(Number(entry.setCount))&&Number(entry.setCount)>0)return Number(entry.setCount);
    return 1;
  }
  function categoryForMuscle(muscle){
    return MUSCLE_CATEGORY.get(String(muscle||'').trim().toLowerCase())||null;
  }
  function entryMuscle(entry){
    if(Array.isArray(entry))return entry[6]||null;
    if(entry&&typeof entry==='object')return entry.muscle||entry.muscleGroup||entry.muscle_group||entry.muscles||null;
    return null;
  }
  function dominantCategory(workout){
    const scores={back:0,chest:0,arms:0,legs:0,front:0,posterior:0};
    let matched=false;
    exerciseRows(workout).forEach(function(entry){
      const name=exerciseName(entry);
      if(!name)return;
      const metadata=entryMuscle(entry),muscles=Array.isArray(metadata)?metadata:[metadata];
      const explicit=Array.from(new Set(muscles.map(categoryForMuscle).filter(function(category){return category&&CATEGORY_SET.has(category)})));
      if(explicit.length){matched=true;const volume=setWeight(entry);explicit.forEach(function(category){scores[category]+=volume});return;}
      const rule=EXERCISE_RULES.find(function(candidate){return candidate.pattern.test(name)});
      if(!rule)return;
      matched=true;
      const volume=setWeight(entry);
      const primary=categoryForMuscle(rule.primary);
      if(primary&&CATEGORY_SET.has(primary))scores[primary]+=volume;
      (rule.secondary||[]).forEach(function(muscle){
        const category=categoryForMuscle(muscle);
        if(category&&CATEGORY_SET.has(category))scores[category]+=volume*0.1;
      });
    });
    if(!matched)return FALLBACK_CATEGORY;
    const ranked=Object.keys(scores).map(function(category){return {category:category,score:scores[category]}})
      .filter(function(item){return item.score>0})
      .sort(function(a,b){return b.score-a.score||a.category.localeCompare(b.category)});
    if(!ranked.length)return FALLBACK_CATEGORY;
    if(ranked.length===1||ranked[0].score>=ranked[1].score*1.2)return ranked[0].category;
    if((ranked[0].category==='back'&&ranked[1].category==='posterior')||(ranked[0].category==='posterior'&&ranked[1].category==='back'))return 'posterior';
    // A mixed front-of-body or otherwise ambiguous session has a stable broad-front image.
    return FALLBACK_CATEGORY;
  }
  function profileSex(profile){
    const value=profile&&(profile.sex||profile.gender||profile.profileSex);
    const normalized=String(value||'').trim().toLowerCase();
    if(normalized==='male'||normalized==='female')return normalized;
    // Existing completed profiles predate sex selection; keep their stable male fallback.
    return profile&&profile.onboardingComplete===true?'male':null;
  }
  function getWorkoutArtwork(workout,profile){
    const sex=profileSex(profile);
    const category=dominantCategory(workout);
    return Object.freeze({sex:sex,category:category,key:sex?sex+'-'+category:null,src:sex?ASSET_ROOT+'/'+sex+'/'+category+'.webp':null});
  }

  root.getWorkoutArtwork=getWorkoutArtwork;
})(typeof window!=='undefined'?window:globalThis);
