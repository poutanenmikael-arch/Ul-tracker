(()=>{const URL='https://zjwunducqyvueapqdeqx.supabase.co',KEY='sb_publishable_sOKL5gFe82ZsEemL_FbpfA_iQGen5Qn',APP='./app.html?v=11'+(new URLSearchParams(location.search).has('authDebug')?'&authDebug=1':'');
const recoveryHash=new URLSearchParams(location.hash.replace(/^#/,''));
const recoveryQuery=new URLSearchParams(location.search);
const recoveryRequested=recoveryHash.get('type')==='recovery'||recoveryQuery.get('type')==='recovery';
const authCallbackPending=!!location.hash||recoveryQuery.has('code');
const $=s=>document.querySelector(s);
const recoveryApp=APP+(APP.includes('?')?'&':'?')+'passwordRecovery=1';
if(!window.supabase||typeof window.supabase.createClient!=='function'){
  const auth=$('.auth'),status=$('#status');
  if(auth)auth.classList.add('show');
  if(status){
    status.classList.add('error');
    status.setAttribute('role','alert');
    status.textContent='Authentication could not load. Check your connection and reload.';
    const retry=document.createElement('button');
    retry.type='button';retry.className='btn';retry.style.marginTop='10px';
    retry.textContent='Reload';retry.addEventListener('click',()=>location.reload());
    status.appendChild(document.createElement('br'));status.appendChild(retry);
  }
  return;
}
const sb=window.supabase.createClient(URL,KEY);let mode='login';
const authDebug=new URLSearchParams(location.search).has('authDebug'),debugAuth=(event,details={})=>{if(authDebug)console.info('[UL auth]',event,details)};
const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if(!reduce){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in-view');io.unobserve(e.target)}}),{threshold:.12,rootMargin:'0px 0px -7% 0px'});document.querySelectorAll('.reveal').forEach(el=>io.observe(el));}
const heroProduct=document.querySelector('.hero-product'),liquidCursor=heroProduct?.querySelector('.liquid-cursor');
if(!reduce&&heroProduct&&liquidCursor&&window.matchMedia('(hover: hover) and (pointer: fine)').matches){
  let raf=0,x=0,y=0;
  const paint=()=>{raf=0;liquidCursor.style.transform=`translate3d(${x}px,${y}px,0) translate(-50%,-50%)`};
  heroProduct.addEventListener('pointermove',e=>{
    const r=heroProduct.getBoundingClientRect();
    x=e.clientX-r.left;y=e.clientY-r.top;
    if(!raf)raf=requestAnimationFrame(paint);
  });
  heroProduct.addEventListener('pointerenter',e=>{
    const r=heroProduct.getBoundingClientRect();
    x=e.clientX-r.left;y=e.clientY-r.top;
    if(!raf)raf=requestAnimationFrame(paint);
    heroProduct.classList.add('cursor-active');
  });
  heroProduct.addEventListener('pointerleave',()=>{
    heroProduct.classList.remove('cursor-active');
    if(raf){cancelAnimationFrame(raf);raf=0}
  });
}

/* Scroll-driven hero transition — only active while hero is relevant */
if(!reduce&&heroProduct){
  const hero=document.querySelector('.hero'),copySide=document.querySelector('.hero-copy-side');
  let scrollRaf=0,lastProgress=-1;
  const updateHero=()=>{
    scrollRaf=0;
    const rect=hero.getBoundingClientRect();
    const travel=Math.max(320,Math.min(620,rect.height*.68));
    const p=Math.max(0,Math.min(1,-rect.top/travel));
    const stepped=Math.round(p*1000)/1000;
    if(Math.abs(stepped-lastProgress)<.004)return;
    lastProgress=stepped;
    if(p<=0.001){
      copySide.style.opacity='1';
      copySide.style.transform='translate3d(0,0,0)';
      heroProduct.style.opacity='1';
      heroProduct.style.transform='translate3d(0,0,0) scale(1)';
      return;
    }
    copySide.style.opacity=String(1-p*.92);
    copySide.style.transform=`translate3d(0,${-p*18}px,0) scale(${1-p*.012})`;
    heroProduct.style.opacity=String(1-p*.08);
    heroProduct.style.transform=`translate3d(0,${-p*20}px,0) scale(${1-p*.035})`;
  };
  const onScroll=()=>{
    if(!scrollRaf)scrollRaf=requestAnimationFrame(updateHero);
  };
  window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('resize',onScroll,{passive:true});
  updateHero();
}

const modal=$('#auth'),statusEl=$('#status');
const status=(x,type='')=>{statusEl.textContent=x;statusEl.className='status '+type};
const open=m=>{mode=m;modal.classList.add('show');$('#authTitle').textContent=m==='login'?'Log in':'Create your account';$('#authDesc').textContent=m==='login'?'Pick up where your last workout left off.':'Start building your training history today.';$('#submitAuth').innerHTML=m==='login'?'Log in <span aria-hidden="true">→</span>':'Create account <span aria-hidden="true">→</span>';$('#toggleAuth').textContent=m==='login'?'Create account':'Log in';$('#forgot').style.display=m==='login'?'block':'none';document.querySelector('.auth-kicker').textContent=m==='login'?'WELCOME BACK':'START YOUR PROGRESS';status('');setTimeout(()=>$('#email').focus(),180)};
document.querySelectorAll('[data-auth]').forEach(b=>b.addEventListener('click',()=>open(b.dataset.auth)));
document.querySelectorAll('.btn').forEach(b=>b.addEventListener('click',e=>{const r=document.createElement('span');r.className='ripple';const rect=b.getBoundingClientRect();r.style.left=(e.clientX-rect.left)+'px';r.style.top=(e.clientY-rect.top)+'px';b.appendChild(r);setTimeout(()=>r.remove(),600)}));
$('#closeAuth').onclick=()=>modal.classList.remove('show');modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('show')});document.addEventListener('keydown',e=>{if(e.key==='Escape')modal.classList.remove('show')});
$('#toggleAuth').onclick=()=>open(mode==='login'?'signup':'login');
$('#submitAuth').onclick=async()=>{
  const email=$('#email').value.trim(),password=$('#password').value;
  if(!email||!password)return status('Enter your email and password.','error');
  if(!$('#email').checkValidity())return status('Enter a valid email address.','error');
  if(mode==='signup'&&password.length<6)return status('Password must be at least 6 characters.','error');
  const submit=$('#submitAuth');submit.disabled=true;submit.style.pointerEvents='none';
  status(mode==='login'?'Signing you in...':'Creating your account...','loading');
  try{
    if(mode==='signup'){
      const signedOut=await sb.auth.signOut({scope:'local'});
      if(signedOut.error)throw signedOut.error;
      ['ul_profile','ul_profile_name','ul_history','ul_program','ul_draft','ul_current_day','ul_home_day'].forEach(k=>localStorage.removeItem(k));
      Object.keys(localStorage).filter(k=>k.startsWith('sb-')).forEach(k=>localStorage.removeItem(k));
      localStorage.removeItem('ul_logged_out');
    }
    const r=mode==='login'
      ?await sb.auth.signInWithPassword({email,password})
      :await sb.auth.signUp({email,password,options:{emailRedirectTo:location.origin+'/' }});
    if(r.error){
      if(mode==='signup'&&(/already registered|user_already_exists/i.test(r.error.message||'')||r.error.code==='user_already_exists')){
        status('This email already has an account. Log in or reset your password.','error');
        submit.disabled=false;submit.style.pointerEvents='auto';return;
      }
      throw r.error;
    }
    debugAuth(mode==='signup'?'signup response':'login response',{userId:r.data.user?.id||null,sessionUserId:r.data.session?.user?.id||null,sessionCreated:!!r.data.session});
    if(mode==='signup'&&!r.data.session){
      submit.innerHTML='Check your inbox';status('If this email is new, check it to confirm your account. If it is already registered, log in or reset your password.','success');
      submit.disabled=false;submit.style.pointerEvents='auto';return;
    }
    submit.innerHTML='✓ Success';submit.classList.add('success-pulse');
    status(mode==='login'?'Welcome back. Opening your tracker...':'Account created. Opening your tracker...','success');
    setTimeout(()=>location.href=APP,420);
  }catch(e){
    submit.disabled=false;submit.style.pointerEvents='auto';status(e.message||'Authentication failed.','error');
  }
};
$('#forgot').onclick=async()=>{const email=$('#email').value.trim(),button=$('#forgot');if(!email)return status('Enter your email first.','error');button.disabled=true;status('Sending reset link...','loading');try{const r=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/'});status(r.error?r.error.message:'Reset link sent. Check your email.','success')}catch(e){status(e?.message||'Could not send the reset link. Try again.','error')}finally{button.disabled=false}};
const justLoggedOut=localStorage.getItem('ul_logged_out')==='1';if(justLoggedOut)localStorage.removeItem('ul_logged_out');
sb.auth.onAuthStateChange((event,session)=>{debugAuth('landing auth event',{event,sessionUserId:session?.user?.id||null});if(!session||justLoggedOut)return;if(event==='PASSWORD_RECOVERY'){location.replace(recoveryApp);return}if(event==='SIGNED_IN'||event==='INITIAL_SESSION')location.href=recoveryRequested?recoveryApp:APP});
sb.auth.getSession().then(({data})=>{debugAuth('landing getSession',{sessionUserId:data.session?.user?.id||null});if(data.session&&!justLoggedOut&&(!authCallbackPending||recoveryRequested))location.href=recoveryRequested?recoveryApp:APP}).catch(e=>debugAuth('landing session lookup failed',{error:e?.message||String(e)}))})();