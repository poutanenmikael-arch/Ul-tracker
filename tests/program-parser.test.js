const test=require('node:test');
const assert=require('node:assert/strict');
const {parseProgramText}=require('../program-parser');

const exerciseOf=text=>{
  const result=parseProgramText(text);
  assert.equal(result.valid,true,JSON.stringify(result.issues));
  return result.program.days.flatMap(day=>day.exercises);
};

test('parses common prescription styles without changing the exercise name',()=>{
  const cases=[
    ['Bench Press 3x8',3,'8'],
    ['Bench Press: 3 sets of 8 reps',3,'8'],
    ['Bench Press — 3 × 8–10',3,'8–10'],
    ['3x Bench Press, 8-10 reps',3,'8–10'],
    ['Bench Press | 3 sets | 8-10 reps',3,'8–10'],
    ['Bench Press (3 sets of 8-10)',3,'8–10'],
    ['Bench Press 3 sets, 8-10 reps, 2 RIR',3,'8–10'],
    ['Bench Press 3x8-10 @ RIR 2',3,'8–10'],
    ['Bench Press 3 sets of 8-10, rest 2 min',3,'8–10']
  ];
  for(const [line,sets,reps] of cases){const ex=exerciseOf(line)[0];assert.equal(ex.name,'Bench Press',line);assert.equal(ex.sets,sets,line);assert.equal(ex.reps,reps,line)}
});

test('preserves supported RIR, RPE, rest and notes as separate metadata',()=>{
  const [rir]=exerciseOf('Bench Press 3x8-10 @ RIR 2')[0]? [parseProgramText('Bench Press 3x8-10 @ RIR 2').program.days[0].exercises[0]]:[];
  assert.equal(rir.minRir,2);assert.equal(rir.maxRir,2);
  const rpe=exerciseOf('Squat 4x6 @ RPE 8')[0];assert.equal(rpe.targetRpe,8);assert.equal(rpe.minRir,undefined);
  const rest=exerciseOf('Row 3 sets of 8 reps, rest 90 sec')[0];assert.equal(rest.rest,1.5);
  const note=exerciseOf('Curl 2x12, note: pause at the top')[0];assert.equal(note.notes,'pause at the top');
});

test('keeps multiple explicit prescriptions grouped and sums their real set count',()=>{
  const [ex]=exerciseOf('Bench Press: 3x8, 3x10, 2x12');
  assert.equal(ex.sets,8);assert.equal(ex.reps,'3×8, 3×10, 2×12');
  assert.deepEqual(ex.setPlan,[{sets:3,reps:'8'},{sets:3,reps:'10'},{sets:2,reps:'12'}]);
});

test('recognizes workout headings, numbered lists, Markdown headings and tables',()=>{
  const text='# Upper A\n\n1. Bench Press 3x8\n- Lat Pulldown — 3×10\n\n## Lower B\nSquat 4 sets of 6 reps\n\n| Exercise | Sets | Reps | RIR | Rest | Notes |\n| --- | --- | --- | --- | --- | --- |\n| Romanian Deadlift | 3 | 8-10 | 2 | 2 min | pause at bottom |';
  const result=parseProgramText(text);assert.equal(result.valid,true,JSON.stringify(result.issues));
  assert.deepEqual(result.program.days.map(d=>d.name),['Upper A','Lower B']);
  assert.deepEqual(result.program.days.map(d=>d.exercises.map(e=>e.name)),[['Bench Press','Lat Pulldown'],['Squat','Romanian Deadlift']]);
  const tableEx=result.program.days[1].exercises[1];assert.equal(tableEx.minRir,2);assert.equal(tableEx.rest,2);assert.equal(tableEx.notes,'pause at bottom');
});

test('recognizes common day heading variants and preserves punctuation in exercise names',()=>{
  const result=parseProgramText('Workout A\nCable / Rope Pushdown — 3 × 10–12\n\nPull Day\nChest-Supported Row (Machine) 3x8');
  assert.equal(result.valid,true,JSON.stringify(result.issues));
  assert.deepEqual(result.program.days.map(day=>day.name),['Workout A','Pull Day']);
  assert.equal(result.program.days[0].exercises[0].name,'Cable / Rope Pushdown');
  assert.equal(result.program.days[1].exercises[0].name,'Chest-Supported Row (Machine)');
});

test('supports tab-separated spreadsheet rows',()=>{
  const result=parseProgramText('Exercise\tSets\tReps\nBench Press\t3\t8-10');
  assert.equal(result.valid,true,JSON.stringify(result.issues));assert.equal(result.program.days[0].exercises[0].reps,'8–10');
});

test('keeps unrecognized and ambiguous content visible and blocks import',()=>{
  const source='Upper A\nBench Press 3x8\nCoach note: keep elbows tucked\nFlyes 3 sets';
  const result=parseProgramText(source);assert.equal(result.valid,false);assert.equal(result.issues.length,2);
  assert.deepEqual(result.issues.map(i=>[i.line,i.text]),[[3,'Coach note: keep elbows tucked'],[4,'Flyes 3 sets']]);
});

test('does not invent prescriptions or silently accept incomplete workout headings',()=>{
  for(const source of ['Upper A\nBench Press','Upper A','Bench Press 0x8','Bench Press 3x0','| Bench Press | 3 | 8 |']){
    const result=parseProgramText(source);assert.equal(result.valid,false,source);assert.ok(result.issues.length,source);
  }
});

test('surfaces unsupported superset pairing instead of losing it',()=>{
  const result=parseProgramText('Upper A\nA1/A2 Superset: Bench Press + Row 3x8');
  assert.equal(result.valid,false);assert.match(result.issues[0].text,/Superset/);assert.match(result.issues[0].message,/not supported/i);
  const paired=parseProgramText('Upper A\nA1. Bench Press 3x8');assert.equal(paired.valid,false);assert.match(paired.issues[0].text,/A1/);
});

test('preserves original line text and source order',()=>{
  const source='  Upper A  \n- Incline DB Press — 3 × 8–10\n2. Cable Row 3x12';
  const result=parseProgramText(source);assert.equal(result.valid,true);assert.equal(result.program.days[0].exercises[0].sourceText,'- Incline DB Press — 3 × 8–10');
  assert.deepEqual(result.program.days[0].exercises.map(e=>e.name),['Incline DB Press','Cable Row']);
});
