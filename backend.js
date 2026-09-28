(()=>{
  const SUPABASE_URL='https://zjwunducqyvueapqdeqx.supabase.co';
  const SUPABASE_KEY='sb_publishable_sOKL5gFe82ZsEemL_FbpfA_iQGen5Qn';
  const CDN='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  const DATA_KEYS=['ul_profile','ul_profile_name','ul_history','ul_program','ul_draft','ul_current_day','ul_home_day'];
  let sb=null,user=null,activeUserId=null,epoch=0,syncTimer=null,hydrated=false;
  const $=s=>document.querySelector(s);
  const authDebug=new URLSearchParams(window.location.search).has('authDebug');
  const debugAuth=(event,details={})=>{if(authDebug)console.info('[UL auth]',event,details)};
  const localDataFlags=()=>({profile:!!localStorage.getItem('ul_profile'),profileName:!!localStorage.getItem('ul_profile_name'),history:!!localStorage.getItem('ul_history'),program:!!localStorage.getItem('ul_program'),draft:!!localStorage.getItem('ul_draft'),serviceWorker:navigator.serviceWorker?.controller?.scriptURL||null});
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)??'null')??fallback}catch{return fallback}};
  const history=()=>read('ul_history',[]);
  const program=()=>read('ul_program',null);
  const profile=()=>{const p=read('ul_profile',{});return p&&typeof p==='object'&&!Array.isArray(p)?p:{}};
  const toast=msg=>{const t=$('#toast');if(t){t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}};
  const loadScript=()=>new Promise((resolve,reject)=>{if(window.supabase)return resolve();const s=document.createElement('script');s.src=CDN;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
  const clearLocalData=()=>DATA_KEYS.forEach(k=>localStorage.removeItem(k));
  const deactivate=()=>{
    clearTimeout(syncTimer);syncTimer=null;epoch++;hydrated=false;user=null;activeUserId=null;clearLocalData();
  };
  const hydrate=async u=>{
    if(!u)return;
    if(activeUserId===u.id&&hydrated)return;
    clearTimeout(syncTimer);syncTimer=null;
    const requestEpoch=++epoch;activeUserId=u.id;user=u;hydrated=false;
    debugAuth('hydrate start',{authenticatedUserId:u.id,previousLocalData:localDataFlags()});
    clearLocalData();
    const {data,error}=await sb.from('user_data').select('user_id,history_json,program_json,profile_json,updated_at').eq('user_id',u.id).maybeSingle();
    if(requestEpoch!==epoch||activeUserId!==u.id)return;
    if(error){debugAuth('hydrate error',{authenticatedUserId:u.id,error:error.message});toast('Pilvidatan luku epäonnistui');const gate=$('#authBootstrap');if(gate)gate.textContent='Private account data could not be loaded. Refresh to retry.';return}
    debugAuth('database row loaded',{queryUserId:u.id,rowUserId:data?.user_id||null,profileFields:Object.keys(data?.profile_json||{}),localStorageBeforeHydrate:localDataFlags()});
    if(data){
      if(Array.isArray(data.history_json))localStorage.setItem('ul_history',JSON.stringify(data.history_json));
      if(data.program_json&&Array.isArray(data.program_json.days))localStorage.setItem('ul_program',JSON.stringify(data.program_json));
      if(data.profile_json&&typeof data.profile_json==='object'&&!Array.isArray(data.profile_json)){
        localStorage.setItem('ul_profile',JSON.stringify(data.profile_json));
        if(typeof data.profile_json.name==='string'&&data.profile_json.name)localStorage.setItem('ul_profile_name',data.profile_json.name);
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
    toast('☁️ Pilvitallennus käytössä');
  };
  const sync=force=>{
    clearTimeout(syncTimer);
    if(!sb||!user||!hydrated)return;
    const uid=activeUserId,requestEpoch=epoch;
    const write=async()=>{
      if(!hydrated||!user||activeUserId!==uid||epoch!==requestEpoch)return;
      const {error}=await sb.from('user_data').upsert({user_id:uid,history_json:history(),program_json:program(),profile_json:profile(),updated_at:new Date().toISOString()},{onConflict:'user_id'});
      if(requestEpoch!==epoch||activeUserId!==uid)return;
      if(error)toast('Pilvitallennus epäonnistui');
      else toast('☁️ Tallennettu pilveen');
    };
    if(force)void write();else syncTimer=setTimeout(write,1200);
  };
  const passwordRecovery=()=>{
    let m=$('#passwordRecovery');if(m)return;
    const el=document.createElement('div');el.className='cloud-auth';el.id='passwordRecovery';
    el.innerHTML='<div class="cloud-box"><div style="font-size:12px;color:#39ffb6;font-weight:900;margin-bottom:8px">UL TRACKER • CLOUD</div><h2>Vaihda salasana</h2><div style="font-size:12px;color:#8e9aaa;margin-bottom:12px">Anna uusi salasana tilillesi.</div><input class="cloud-input" id="newPass" type="password" autocomplete="new-password" placeholder="Uusi salasana"><input class="cloud-input" id="newPass2" type="password" autocomplete="new-password" placeholder="Uusi salasana uudelleen"><div class="cloud-actions"><button class="btn primary" id="saveNewPass">Vaihda salasana</button></div><div class="cloud-status" id="passStatus"></div></div>';
    document.body.appendChild(el);
    $('#saveNewPass').onclick=async()=>{const a=$('#newPass').value,b=$('#newPass2').value;if(a.length<6)return $('#passStatus').textContent='Salasanan pitää olla vähintään 6 merkkiä.';if(a!==b)return $('#passStatus').textContent='Salasanat eivät täsmää.';const r=await sb.auth.updateUser({password:a});if(r.error)return $('#passStatus').textContent=r.error.message;el.remove();toast('Salasana vaihdettu ✓')};
  };
  const boot=async()=>{
    try{
      await loadScript();sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
      debugAuth('supabase client initialized',{persistSession:true,storage:'Supabase client default browser storage',serviceWorker:navigator.serviceWorker?.controller?.scriptURL||null});
      if(authDebug&&'caches'in window)caches.keys().then(keys=>debugAuth('browser caches',{keys}));
      sb.auth.onAuthStateChange((event,session)=>{
        debugAuth('app auth event',{event,sessionUserId:session?.user?.id||null,localStorage:localDataFlags()});
        setTimeout(()=>{
          if(event==='PASSWORD_RECOVERY'){passwordRecovery();return}
          if(session?.user){void hydrate(session.user);return}
          if(event==='SIGNED_OUT'){deactivate();return}
          if(event==='INITIAL_SESSION')location.replace('./index.html');
        },0);
      });
      document.addEventListener('click',e=>{if(e.target.closest('#saveBtn'))setTimeout(()=>sync(true),900)},true);
      window.ulSignOut=async()=>{
        const r=await sb.auth.signOut({scope:'global'});
        if(r.error)throw r.error;
        deactivate();sessionStorage.setItem('ul_logout','1');return r;
      };
      window.addEventListener('ul-program-changed',()=>sync(false));
      window.addEventListener('ul-profile-changed',()=>sync(false));
    }catch(e){console.error(e);toast('Pilvipalvelun käynnistys epäonnistui')}
  };
  setTimeout(boot,0);
})();