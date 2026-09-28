(()=>{
  const SUPABASE_URL='https://zjwunducqyvueapqdeqx.supabase.co';
  const SUPABASE_KEY='sb_publishable_sOKL5gFe82ZsEemL_FbpfA_iQGen5Qn';
  const CDN='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  const DATA_KEYS=['ul_profile','ul_profile_name','ul_history','ul_program','ul_draft','ul_current_day','ul_home_day'];
  let sb=null,user=null,activeUserId=null,epoch=0,syncTimer=null,syncQueue=Promise.resolve(),hydrated=false,recoveryPromptShown=false;
  const $=s=>document.querySelector(s);
  const authDebug=new URLSearchParams(window.location.search).has('authDebug');
  const passwordRecoveryRequested=new URLSearchParams(window.location.search).has('passwordRecovery');
  const debugAuth=(event,details={})=>{if(authDebug)console.info('[UL auth]',event,details)};
  const localDataFlags=(uid=window.ulCurrentUserId)=>{const p=uid?'ul-user-data:'+uid+':':null;const has=k=>!!(p&&localStorage.getItem(p+k));return{profile:has('ul_profile'),profileName:has('ul_profile_name'),history:has('ul_history'),program:has('ul_program'),draft:has('ul_draft'),serviceWorker:navigator.serviceWorker?.controller?.scriptURL||null}};
  const read=(key,fallback)=>{try{return JSON.parse(ulStorage.getItem(key)??'null')??fallback}catch{return fallback}};
  const history=()=>read('ul_history',[]);
  const program=()=>read('ul_program',null);
  const profile=()=>{const p=read('ul_profile',{});return p&&typeof p==='object'&&!Array.isArray(p)?p:{}};
  const toast=msg=>{const t=$('#toast');if(t){t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}};
  const showBootstrapError=message=>{const gate=$('#authBootstrap');if(!gate)return;gate.textContent=message;const button=document.createElement('button');button.type='button';button.className='auth-retry';button.textContent='Reload app';button.onclick=()=>location.reload();gate.appendChild(button)};
  const loadScript=()=>new Promise((resolve,reject)=>{if(window.supabase)return resolve();const s=document.createElement('script');s.src=CDN;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
  const clearLocalData=()=>DATA_KEYS.forEach(k=>ulStorage.removeItem(k));
  const deactivate=()=>{
    clearTimeout(syncTimer);syncTimer=null;epoch++;hydrated=false;user=null;activeUserId=null;window.ulCurrentUserId=null;document.documentElement.classList.add('auth-pending');
  };
  const hydrate=async u=>{
    if(!u)return;
    if(activeUserId===u.id&&hydrated)return;
    clearTimeout(syncTimer);syncTimer=null;
    const requestEpoch=++epoch;activeUserId=u.id;user=u;hydrated=false;
    window.ulCurrentUserId=null;
    document.documentElement.classList.add('auth-pending');
    debugAuth('hydrate start',{authenticatedUserId:u.id,userScopedCache:localDataFlags(u.id)});
    let result;
    try{
      result=await sb.from('user_data').select('user_id,history_json,program_json,profile_json,updated_at').eq('user_id',u.id).maybeSingle();
    }catch(e){
      if(requestEpoch!==epoch||activeUserId!==u.id)return;
      debugAuth('hydrate request failed',{authenticatedUserId:u.id,error:e?.message||String(e)});
      activeUserId=null;user=null;showBootstrapError('Private account data could not be loaded. Check your connection and reload.');toast('Pilvidatan luku epäonnistui');return;
    }
    if(requestEpoch!==epoch||activeUserId!==u.id)return;
    const {data,error}=result||{};
    if(error){debugAuth('hydrate error',{authenticatedUserId:u.id,error:error.message});activeUserId=null;user=null;showBootstrapError('Private account data could not be loaded. Check your connection and reload.');toast('Pilvidatan luku epäonnistui');return}
    if(data&&data.user_id!==u.id){debugAuth('hydrate identity mismatch',{authenticatedUserId:u.id,rowUserId:data.user_id});activeUserId=null;user=null;showBootstrapError('The account data owner did not match. Reload to retry.');return}
    window.ulCurrentUserId=u.id;
    debugAuth('database row loaded',{queryUserId:u.id,rowUserId:data?.user_id||null,profileFields:Object.keys(data?.profile_json||{}),userScopedCache:localDataFlags(u.id)});
    if(!data)clearLocalData();
    if(data){
      if(Array.isArray(data.history_json))ulStorage.setItem('ul_history',JSON.stringify(data.history_json));else ulStorage.removeItem('ul_history');
      if(data.program_json&&Array.isArray(data.program_json.days))ulStorage.setItem('ul_program',JSON.stringify(data.program_json));else ulStorage.removeItem('ul_program');
      if(data.profile_json&&typeof data.profile_json==='object'&&!Array.isArray(data.profile_json)){
        ulStorage.setItem('ul_profile',JSON.stringify(data.profile_json));
        if(typeof data.profile_json.name==='string'&&data.profile_json.name.trim())ulStorage.setItem('ul_profile_name',data.profile_json.name.trim());
        else ulStorage.removeItem('ul_profile_name');
      }else{
        ulStorage.removeItem('ul_profile');ulStorage.removeItem('ul_profile_name');
      }
    }
    hydrated=true;
    document.documentElement.classList.remove('auth-pending');$('#authBootstrap')?.remove();
    if(typeof window.renderHistory==='function')window.renderHistory();
    if(typeof window.renderProgress==='function')window.renderProgress();
    if(typeof window.renderWorkoutHome==='function')window.renderWorkoutHome();
    if(data?.program_json&&Array.isArray(data.program_json.days))window.dispatchEvent(new CustomEvent('ul-cloud-program-loaded',{detail:data.program_json}));
    if(data?.profile_json&&typeof data.profile_json==='object')window.dispatchEvent(new CustomEvent('ul-profile-loaded',{detail:data.profile_json}));
    window.dispatchEvent(new CustomEvent('ul-cloud-ready',{detail:{userId:u.id,profile:profile()}}));
    debugAuth('cloud ready',{authenticatedUserId:u.id,profileNamePresent:!!profile().name,onboardingComplete:profile().onboardingComplete===true});
    toast('☁️ Pilvitallennus käytössä');
  };
  const queueWrite=(uid,requestEpoch)=>{
    const write=async()=>{
      if(!hydrated||!user||activeUserId!==uid||epoch!==requestEpoch)return false;
      try{
        const {error}=await sb.from('user_data').upsert({user_id:uid,history_json:history(),program_json:program(),profile_json:profile(),updated_at:new Date().toISOString()},{onConflict:'user_id'});
        if(requestEpoch!==epoch||activeUserId!==uid)return false;
        if(error){debugAuth('sync error',{authenticatedUserId:uid,error:error.message});toast('Pilvitallennus epäonnistui');return false;}
        toast('☁️ Tallennettu pilveen');return true;
      }catch(e){
        if(requestEpoch!==epoch||activeUserId!==uid)return false;
        debugAuth('sync request failed',{authenticatedUserId:uid,error:e?.message||String(e)});
        toast('Pilvitallennus epäonnistui');return false;
      }
    };
    const pending=syncQueue.then(write,write);
    syncQueue=pending.then(()=>undefined,()=>undefined);
    return pending;
  };
  const sync=force=>{
    clearTimeout(syncTimer);
    if(!sb||!user||!hydrated)return Promise.resolve(false);
    const uid=activeUserId,requestEpoch=epoch;
    if(force)return queueWrite(uid,requestEpoch);
    syncTimer=setTimeout(()=>{void queueWrite(uid,requestEpoch)},1200);
  };
  const passwordRecovery=()=>{
    let m=$('#passwordRecovery');if(m)return;
    const el=document.createElement('div');el.className='cloud-auth';el.id='passwordRecovery';
    el.innerHTML='<div class="cloud-box"><div style="font-size:12px;color:#39ffb6;font-weight:900;margin-bottom:8px">UL TRACKER • CLOUD</div><h2>Vaihda salasana</h2><div style="font-size:12px;color:#8e9aaa;margin-bottom:12px">Anna uusi salasana tilillesi.</div><input class="cloud-input" id="newPass" type="password" autocomplete="new-password" placeholder="Uusi salasana"><input class="cloud-input" id="newPass2" type="password" autocomplete="new-password" placeholder="Uusi salasana uudelleen"><div class="cloud-actions"><button class="btn primary" id="saveNewPass">Vaihda salasana</button></div><div class="cloud-status" id="passStatus"></div></div>';
    document.body.appendChild(el);
    $('#passStatus').setAttribute('role','status');$('#passStatus').setAttribute('aria-live','polite');
    $('#saveNewPass').onclick=async()=>{const a=$('#newPass').value,b=$('#newPass2').value,button=$('#saveNewPass'),status=$('#passStatus');if(a.length<6){status.textContent='Salasanan pitää olla vähintään 6 merkkiä.';return}if(a!==b){status.textContent='Salasanat eivät täsmää.';return}button.disabled=true;button.textContent='Tallennetaan…';try{const r=await sb.auth.updateUser({password:a});if(r.error){status.textContent=r.error.message;button.disabled=false;button.textContent='Vaihda salasana';return}el.remove();toast('Salasana vaihdettu ✓')}catch(e){status.textContent=e?.message||'Salasanan vaihto epäonnistui. Yritä uudelleen.';button.disabled=false;button.textContent='Vaihda salasana'}};
  };
  const boot=async()=>{
    try{
      await loadScript();sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
      debugAuth('supabase client initialized',{persistSession:true,storage:'Supabase client default browser storage',serviceWorker:navigator.serviceWorker?.controller?.scriptURL||null});
      if(authDebug&&'caches'in window)caches.keys().then(keys=>debugAuth('browser caches',{keys}));
      sb.auth.onAuthStateChange((event,session)=>{
        debugAuth('app auth event',{event,sessionUserId:session?.user?.id||null,userScopedCache:localDataFlags(session?.user?.id||null)});
        setTimeout(()=>{
          if(event==='PASSWORD_RECOVERY'){recoveryPromptShown=true;passwordRecovery();return}
          if(session?.user){if(passwordRecoveryRequested&&!recoveryPromptShown){recoveryPromptShown=true;passwordRecovery()}void hydrate(session.user);return}
          if(event==='SIGNED_OUT'){deactivate();return}
          if(event==='INITIAL_SESSION')location.replace('./index.html');
        },0);
      });
      document.addEventListener('click',e=>{if(e.target.closest('#saveBtn'))setTimeout(()=>sync(true),900)},true);
      window.ulSyncNow=()=>sync(true);
      window.ulSignOut=async()=>{
        const r=await sb.auth.signOut({scope:'global'});
        if(r.error)throw r.error;
        deactivate();sessionStorage.setItem('ul_logout','1');return r;
      };
      window.addEventListener('ul-program-changed',()=>sync(false));
      window.addEventListener('ul-profile-changed',()=>sync(false));
    }catch(e){console.error(e);showBootstrapError('Secure sign-in could not start. Check your connection and reload.');toast('Pilvipalvelun käynnistys epäonnistui')}
  };
  setTimeout(boot,0);
})();