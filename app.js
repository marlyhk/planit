(() => {
  'use strict';

  const STORAGE_KEY = 'planit_data_v1';
  const VERSION = 1;
  const HOUR_START = 7;
  const HOUR_END = 23;
  const CALENDAR_MINUTES = (HOUR_END - HOUR_START) * 60;
  const CALENDAR_HEIGHT = 840;
  const COURSE_COLORS = [
    '#76b8ae','#a9c9e8','#c9bfe6','#c7dfcf','#f2c09d','#efb5c5',
    '#efd9a4','#b8dcd8','#b7cde8','#d7cae1','#e7c8bd','#d9d0c6',
    '#f0aaa5','#d7dfa0','#e3b77e','#c3aad0'
  ];
  const MOTIVATIONS = [
    'Future Dr. Marly is built one focused hour at a time. 🦷✨',
    'Tiny study sessions still move you toward the white coat.',
    'Your future patients are worth today’s focused effort.',
    'One lecture, one case, one session — progress compounds.',
    'You do not need a perfect day. You need the next useful step.',
    'Learn it gently, repeat it often, own it when it matters.',
    'The version of you in clinic is being trained by what you do today.',
    'A calm plan beats a chaotic all-nighter. Every time.',
    'One more concept understood is one less thing to fear on exam day.',
    'Study the details now so clinical decisions feel lighter later.',
    'Consistency looks boring until it becomes competence.',
    'Your notes are temporary. Your clinical judgment is the goal.',
    'Protect your focus. It is building your future practice.',
    'You are not behind — choose the next high-yield step and do that.',
    'Dentistry is precision. Your study routine can be gentle and precise too.'
  ];

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const uid = () => (crypto && crypto.randomUUID ? crypto.randomUUID() : `id_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const pad = n => String(n).padStart(2, '0');
  const escapeHTML = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  function dateKey(date) {
    const d = date instanceof Date ? date : new Date(date);
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }
  function localDate(dateStr) {
    if (!dateStr) return new Date();
    const [y,m,d] = dateStr.split('-').map(Number);
    return new Date(y,m-1,d,12,0,0,0);
  }
  function addDays(date, days) { const d = new Date(date); d.setDate(d.getDate()+days); return d; }
  function startOfWeek(date) { const d = new Date(date); const day = d.getDay(); const diff = day === 0 ? -6 : 1-day; d.setHours(12,0,0,0); d.setDate(d.getDate()+diff); return d; }
  function endOfWeek(date) { const d = startOfWeek(date); d.setDate(d.getDate()+6); return d; }
  function startOfMonth(date) { return new Date(date.getFullYear(), date.getMonth(), 1, 12); }
  function endOfMonth(date) { return new Date(date.getFullYear(), date.getMonth()+1, 0, 12); }
  function startOfYear(date) { return new Date(date.getFullYear(),0,1,12); }
  function endOfYear(date) { return new Date(date.getFullYear(),11,31,12); }
  function isBetween(dateStr, start, end) { const d=localDate(dateStr); return d>=start && d<=end; }
  function timeToMinutes(time='00:00') { const [h,m]=time.split(':').map(Number); return h*60+m; }
  function minutesToTime(mins) { mins = ((Math.round(mins/15)*15)%(24*60)+(24*60))%(24*60); return `${pad(Math.floor(mins/60))}:${pad(mins%60)}`; }
  function durationLabel(minutes=0) { if (!minutes) return '—'; const h=Math.floor(minutes/60), m=minutes%60; return [h?`${h}h`:'',m?`${m}m`:''].filter(Boolean).join(' '); }
  function addMinutesToTime(time, minutes) { return minutesToTime(timeToMinutes(time)+Number(minutes||0)); }
  function formatTime(time) { if (!time) return 'All day'; const [h,m]=time.split(':').map(Number); const suffix=h>=12?'PM':'AM'; const hr=h%12||12; return `${hr}:${pad(m)} ${suffix}`; }
  function formatDate(dateStr, opts={weekday:'short',month:'short',day:'numeric'}) { return localDate(dateStr).toLocaleDateString('en-US',opts); }
  function prettyDateRange(start,end) {
    if (dateKey(start)===dateKey(end)) return start.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
    if (start.getFullYear()===end.getFullYear() && start.getMonth()===end.getMonth()) return `${start.toLocaleDateString('en-US',{month:'long',day:'numeric'})} – ${end.getDate()}, ${end.getFullYear()}`;
    return `${start.toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${end.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}`;
  }
  function readableMoney(value) { const n=Number(value||0); const sign = n < 0 ? '-' : ''; return `${sign}${state.data.settings.currency}${Math.abs(n).toLocaleString('en-US',{minimumFractionDigits: n%1?2:0, maximumFractionDigits:2})}`; }
  function lighten(hex, amount=.72) {
    const raw=hex.replace('#',''); if(raw.length!==6) return '#ece8f7';
    const vals=[0,2,4].map(i=>parseInt(raw.slice(i,i+2),16));
    return '#'+vals.map(v=>Math.round(v+(255-v)*amount).toString(16).padStart(2,'0')).join('');
  }
  function contrastText(hex) {
    const raw=hex.replace('#',''); if(raw.length!==6) return '#38333a';
    const [r,g,b]=[0,2,4].map(i=>parseInt(raw.slice(i,i+2),16)); const lum=(.299*r+.587*g+.114*b)/255;
    return lum>.64?'#373237':'#ffffff';
  }

  function blankData() {
    return {
      version: VERSION,
      settings: { name:'Marly', currency:'$', defaultDuration:90, snapMinutes:15, updatedAt:null },
      courses: [], students: [], groups: [], events: [], payments: []
    };
  }
  function normalizeData(raw) {
    const base = blankData();
    if (!raw || typeof raw !== 'object') return base;
    return {
      version: VERSION,
      settings: {...base.settings, ...(raw.settings||{})},
      courses: Array.isArray(raw.courses)?raw.courses:[],
      students: Array.isArray(raw.students)?raw.students:[],
      groups: Array.isArray(raw.groups)?raw.groups:[],
      events: Array.isArray(raw.events)?raw.events:[],
      payments: Array.isArray(raw.payments)?raw.payments:[]
    };
  }
  function localGet(key) {
    try { return window.localStorage.getItem(key); }
    catch { return null; }
  }
  function localSet(key, value) {
    try { window.localStorage.setItem(key, value); return true; }
    catch { return false; }
  }
  function sessionGet(key) {
    try { return window.sessionStorage.getItem(key); }
    catch { return null; }
  }
  function sessionSet(key, value) {
    try { window.sessionStorage.setItem(key, value); return true; }
    catch { return false; }
  }
  function loadData() {
    try { return normalizeData(JSON.parse(localGet(STORAGE_KEY))); }
    catch { return blankData(); }
  }

  const cloud = {
    configured:false, client:null, user:null, status:'local', saveTimer:null, pullTimer:null, lastPushedAt:null, busy:false
  };

  function saveData(options={}) {
    if (!options.keepTimestamp && state?.data?.settings) state.data.settings.updatedAt = new Date().toISOString();
    localSet(STORAGE_KEY, JSON.stringify(state.data));
    if (!options.skipCloud) scheduleCloudSave();
  }

  const state = {
    data: loadData(),
    view: 'dashboard',
    quote: '',
    calendar: { mode:'week', date:new Date(), filters:new Set(['class','study','exam','assignment','tutoring','personal']) },
    finance: { period:'month', date:new Date() },
    drawer: null,
    undo: null
  };

  function cloudConfig() { return window.PLANIT_CLOUD_CONFIG || {}; }
  function isCloudConfigured() {
    const c=cloudConfig();
    return Boolean(c.supabaseUrl && c.supabaseAnonKey && !String(c.supabaseUrl).includes('PASTE_') && !String(c.supabaseAnonKey).includes('PASTE_'));
  }
  function hasMeaningfulData(data=state.data) {
    return Boolean((data.courses?.length||0)+(data.students?.length||0)+(data.groups?.length||0)+(data.events?.length||0)+(data.payments?.length||0));
  }
  function updateCloudStatus(status, label) {
    cloud.status=status;
    const btn=$('#syncStatus'), text=$('#syncStatusText');
    if(!btn||!text) return;
    btn.dataset.status=status;
    text.textContent=label || ({local:'Local only',offline:'Offline',syncing:'Syncing…',synced:'Synced',error:'Sync issue',signin:'Sign in'}[status]||status);
  }
  function showAuthError(message) {
    const el=$('#authError'); if(!el) return; el.textContent=message; el.classList.remove('hidden');
  }
  function clearAuthError() { const el=$('#authError'); if(el){el.textContent='';el.classList.add('hidden');} }
  function showAuthGate() { $('#authGate')?.classList.remove('hidden'); updateCloudStatus('signin','Sign in'); }
  function hideAuthGate() { $('#authGate')?.classList.add('hidden'); clearAuthError(); }
  function allowedEmailOk(email) { const allowed=String(cloudConfig().allowedEmail||'').trim().toLowerCase(); return !allowed || String(email||'').trim().toLowerCase()===allowed; }

  function scheduleCloudSave() {
    if(!cloud.configured || !cloud.user || cloud.busy) return;
    clearTimeout(cloud.saveTimer);
    cloud.saveTimer=setTimeout(()=>pushCloudState(),650);
    updateCloudStatus(navigator.onLine?'syncing':'offline');
  }

  async function pushCloudState() {
    if(!cloud.configured || !cloud.user) return;
    if(!navigator.onLine){updateCloudStatus('offline');return;}
    cloud.busy=true; updateCloudStatus('syncing');
    try {
      const payload=JSON.parse(JSON.stringify(state.data));
      const {data,error}=await cloud.client.from('planit_state').upsert({user_id:cloud.user.id,payload},{onConflict:'user_id'}).select('updated_at').single();
      if(error) throw error;
      cloud.lastPushedAt=data?.updated_at||new Date().toISOString();
      updateCloudStatus('synced');
    } catch(err) {
      console.error('Planit cloud save failed',err); updateCloudStatus('error');
    } finally { cloud.busy=false; }
  }

  async function pullCloudState({quiet=false}={}) {
    if(!cloud.configured || !cloud.user || !navigator.onLine || cloud.busy) return;
    cloud.busy=true; if(!quiet) updateCloudStatus('syncing');
    try {
      const {data,error}=await cloud.client.from('planit_state').select('payload,updated_at').eq('user_id',cloud.user.id).maybeSingle();
      if(error) throw error;
      if(!data) {
        if(hasMeaningfulData()) await cloud.client.from('planit_state').upsert({user_id:cloud.user.id,payload:state.data},{onConflict:'user_id'});
        else await cloud.client.from('planit_state').upsert({user_id:cloud.user.id,payload:state.data},{onConflict:'user_id'});
        updateCloudStatus('synced'); return;
      }
      const localStamp=Date.parse(state.data.settings?.updatedAt||0)||0;
      const cloudStamp=Date.parse(data.updated_at||0)||0;
      if(localStamp>cloudStamp+1200 && hasMeaningfulData()) {
        cloud.busy=false; await pushCloudState(); return;
      }
      state.data=normalizeData(data.payload);
      state.data.settings.updatedAt=data.updated_at||state.data.settings.updatedAt;
      localSet(STORAGE_KEY,JSON.stringify(state.data));
      cloud.lastPushedAt=data.updated_at||null;
      renderAllVisible();
      updateCloudStatus('synced');
    } catch(err) {
      console.error('Planit cloud load failed',err); updateCloudStatus('error');
    } finally { cloud.busy=false; }
  }

  async function bindCloudSession(session) {
    if(!session?.user){cloud.user=null;showAuthGate();return;}
    if(!allowedEmailOk(session.user.email)){
      await cloud.client.auth.signOut(); showAuthError('This Planit is restricted to its owner email.'); return;
    }
    cloud.user=session.user; hideAuthGate(); updateCloudStatus('syncing');
    await pullCloudState();
    clearInterval(cloud.pullTimer);
    cloud.pullTimer=setInterval(()=>pullCloudState({quiet:true}),45000);
  }

  async function initCloud() {
    cloud.configured=isCloudConfigured();
    if(!cloud.configured || !window.supabase?.createClient){updateCloudStatus('local','Local only');return;}
    const c=cloudConfig();
    cloud.client=window.supabase.createClient(c.supabaseUrl,c.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data:{session}}=await cloud.client.auth.getSession();
    cloud.client.auth.onAuthStateChange((_event,nextSession)=>setTimeout(()=>bindCloudSession(nextSession),0));
    if(session) await bindCloudSession(session); else showAuthGate();
  }

  async function cloudSignIn(email,password) {
    clearAuthError();
    if(!allowedEmailOk(email)) return showAuthError('Use the owner email configured for this Planit.');
    updateCloudStatus('syncing','Signing in…');
    const {error}=await cloud.client.auth.signInWithPassword({email,password});
    if(error){updateCloudStatus('signin','Sign in');showAuthError(error.message);}
  }
  async function cloudSignUp(email,password) {
    clearAuthError();
    if(cloudConfig().allowSignup===false) return showAuthError('New account creation is disabled for this private Planit.');
    if(!allowedEmailOk(email)) return showAuthError('Use the owner email configured for this Planit.');
    updateCloudStatus('syncing','Creating account…');
    const {data,error}=await cloud.client.auth.signUp({email,password});
    if(error){updateCloudStatus('signin','Sign in');showAuthError(error.message);return;}
    if(!data.session){showAuthError('Account created. Check your email for the confirmation link, then sign in here.');updateCloudStatus('signin','Confirm email');}
  }
  async function cloudSignOut() {
    if(!cloud.client)return; clearInterval(cloud.pullTimer); await cloud.client.auth.signOut(); cloud.user=null; showAuthGate();
  }

  function chooseQuote() {
    const prev = Number(sessionGet('planit_last_quote') ?? -1);
    let i = Math.floor(Math.random()*MOTIVATIONS.length);
    if (MOTIVATIONS.length>1 && i===prev) i=(i+1)%MOTIVATIONS.length;
    sessionSet('planit_last_quote', String(i));
    state.quote = MOTIVATIONS[i];
  }

  function getCourse(id) { return state.data.courses.find(x=>x.id===id); }
  function getStudent(id) { return state.data.students.find(x=>x.id===id); }
  function getGroup(id) { return state.data.groups.find(x=>x.id===id); }
  function getEvent(id) { return state.data.events.find(x=>x.id===id); }
  function eventCourse(event) { return getCourse(event.courseId); }
  function eventColor(event) {
    const course=eventCourse(event); if(course?.color) return course.color;
    return ({tutoring:'#c9bfe6',study:'#c7dfcf',exam:'#f2c09d',assignment:'#efd9a4',class:'#a9c9e8',personal:'#b8dcd8'})[event.type] || '#d9d0c6';
  }
  function eventTitle(event) {
    if (event.type==='tutoring') {
      if(event.groupId) return getGroup(event.groupId)?.name || 'Group session';
      return getStudent(event.studentId)?.name || 'Tutoring session';
    }
    if (event.title) return event.title;
    const c=eventCourse(event);
    return c ? `${c.code} · ${c.name}` : event.type[0].toUpperCase()+event.type.slice(1);
  }
  function eventMeta(event) {
    const c=eventCourse(event);
    if(event.type==='tutoring') {
      const amount = projectedSessionAmount(event);
      return [c?.code, durationLabel(event.plannedDuration), amount?readableMoney(amount):''].filter(Boolean).join(' · ');
    }
    return [c?.code, event.start?formatTime(event.start):''].filter(Boolean).join(' · ');
  }
  function eventDuration(event) { return Number(event.actualDuration || event.plannedDuration || 0); }
  function projectedSessionAmount(event) {
    if(event.type!=='tutoring') return 0;
    const duration = eventDuration(event) || state.data.settings.defaultDuration;
    if(event.groupId) {
      const group=getGroup(event.groupId); if(!group) return 0;
      const members = event.groupCharges?.length ? event.groupCharges : group.members || [];
      return members.reduce((sum,m)=>sum+rateAmount(m.rateType,m.rate,duration),0);
    }
    return rateAmount(event.rateType,event.rate,duration);
  }
  function rateAmount(rateType,rate,duration) { const r=Number(rate||0); return rateType==='per_session'?r:r*(Number(duration||0)/60); }

  function allocationPaid(sessionId, studentId=null) {
    return state.data.payments.reduce((sum,p)=>sum+(p.allocations||[]).filter(a=>a.sessionId===sessionId && (studentId ? a.studentId===studentId : !a.studentId)).reduce((s,a)=>s+Number(a.amount||0),0),0);
  }
  function chargeItemsForEvent(event) {
    if(event.type!=='tutoring' || event.status!=='finished') return [];
    if(event.groupId) {
      return (event.groupCharges||[]).filter(c=>c.attendance!=='absent' && Number(c.amount||0)>0).map(c=>({
        sessionId:event.id, studentId:c.studentId, amount:Number(c.amount||0), paid:allocationPaid(event.id,c.studentId), event
      }));
    }
    const amount=Number(event.amount||0);
    return amount>0 ? [{sessionId:event.id,studentId:event.studentId,amount,paid:allocationPaid(event.id,null),event}] : [];
  }
  function allChargeItems() { return state.data.events.flatMap(chargeItemsForEvent); }
  function studentLedger(studentId) { return allChargeItems().filter(x=>x.studentId===studentId).sort((a,b)=>a.event.date.localeCompare(b.event.date)); }
  function studentFinance(studentId) {
    const items=studentLedger(studentId);
    const earned=items.reduce((s,x)=>s+x.amount,0), paid=items.reduce((s,x)=>s+x.paid,0);
    return { earned, paid, outstanding: Math.max(0,earned-paid), items };
  }
  function groupFinance(groupId) {
    const events=state.data.events.filter(e=>e.type==='tutoring'&&e.groupId===groupId&&e.status==='finished');
    const items=events.flatMap(chargeItemsForEvent);
    const earned=items.reduce((s,x)=>s+x.amount,0), paid=items.reduce((s,x)=>s+x.paid,0);
    return {earned,paid,outstanding:Math.max(0,earned-paid),items};
  }
  function currentOutstanding() { return allChargeItems().reduce((s,x)=>s+Math.max(0,x.amount-x.paid),0); }

  const TITLES = {
    dashboard:['Dashboard','A calm view of what matters today.'], calendar:['Calendar','University, tutoring and deadlines in one place.'],
    courses:['Courses','Color-code every course and keep its work together.'], assignments:['Assignments','Deadlines without the visual chaos.'],
    exams:['Exams','Keep every exam visible and easy to reschedule.'], students:['Students','Individual rates, sessions, payments and balances.'],
    groups:['Groups','Schedule together. Track every student separately.'], sessions:['Sessions','Scheduled, finished, unpaid and paid — clearly separated.'],
    finances:['Finances','Daily, weekly, monthly and yearly tutoring overview.'], receipts:['Receipts','Every recorded payment has a clean receipt.'],
    settings:['Settings','Personalize Planit and keep a safe backup.']
  };

  function setView(view) {
    if(!TITLES[view]) view='dashboard';
    state.view=view;
    $$('.view').forEach(el=>el.classList.toggle('active',el.id===`view-${view}`));
    $$('.nav-item[data-view], .bottom-nav-item[data-view]').forEach(btn=>btn.classList.toggle('active',btn.dataset.view===view));
    $('#pageTitle').textContent=TITLES[view][0]; $('#pageSubtitle').textContent=TITLES[view][1];
    document.title=`${TITLES[view][0]} · planit.`;
    renderView(view);
    window.scrollTo({top:0,behavior:'smooth'});
    closeMobileNav();
  }

  function renderView(view=state.view) {
    ({dashboard:renderDashboard,calendar:renderCalendar,courses:renderCourses,assignments:renderAssignments,exams:renderExams,students:renderStudents,groups:renderGroups,sessions:renderSessions,finances:renderFinances,receipts:renderReceipts,settings:renderSettings}[view]||renderDashboard)();
  }
  function renderAllVisible() { renderView(); if(state.drawer) refreshDrawer(); }

  function emptyState(title,text,button,action) {
    return `<div class="empty-state"><div class="empty-dot">✦</div><h3>${escapeHTML(title)}</h3><p>${escapeHTML(text)}</p>${button?`<button class="btn btn-secondary compact-btn" data-action="${action}">${escapeHTML(button)}</button>`:''}</div>`;
  }

  function sessionStatusBadge(event) {
    if(event.status==='cancelled') return '<span class="badge badge-cancelled">Cancelled</span>';
    if(event.status==='finished') {
      const charges=chargeItemsForEvent(event); const total=charges.reduce((s,x)=>s+x.amount,0); const paid=charges.reduce((s,x)=>s+x.paid,0);
      if(total>0 && paid>=total-.005) return '<span class="badge badge-paid">✓ Paid</span>';
      if(paid>0) return '<span class="badge badge-pending">Part paid</span>';
      return '<span class="badge badge-pending">Unpaid</span>';
    }
    return '<span class="badge badge-scheduled">Scheduled</span>';
  }

  function renderDashboard() {
    const el=$('#view-dashboard');
    const today=dateKey(new Date());
    const todayEvents=state.data.events.filter(e=>e.date===today && e.status!=='cancelled').sort(sortEvents);
    const monthStart=startOfMonth(new Date()), monthEnd=endOfMonth(new Date());
    const f=financeStats(monthStart,monthEnd);
    const upcoming=state.data.events.filter(e=>['assignment','exam'].includes(e.type) && e.status!=='cancelled' && localDate(e.date)>=localDate(today)).sort(sortEvents).slice(0,5);
    const outstandingStudents=state.data.students.map(s=>({s,...studentFinance(s.id)})).filter(x=>x.outstanding>.005).sort((a,b)=>b.outstanding-a.outstanding).slice(0,5);
    const week=financeStats(startOfWeek(new Date()),endOfWeek(new Date()));
    el.innerHTML=`
      <div class="hero-row">
        <div class="card hello-card">
          <h2 class="hello-title">Hello ${escapeHTML(state.data.settings.name)} ✦</h2>
          <p class="hello-date">${new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</p>
        </div>
        <div class="card motivation-card">
          <div class="motivation-kicker">a little note for future you</div>
          <p class="motivation-text">${escapeHTML(state.quote)}</p>
        </div>
      </div>

      <div class="content-grid grid-4" style="margin-bottom:14px">
        <div class="card metric"><div class="metric-label">Earned this month</div><div class="metric-value">${readableMoney(f.earned)}</div><div class="metric-foot"><span class="metric-accent" style="background:var(--lavender)"></span>${f.sessions} finished sessions</div></div>
        <div class="card metric"><div class="metric-label">Received this month</div><div class="metric-value">${readableMoney(f.received)}</div><div class="metric-foot"><span class="metric-accent" style="background:var(--teal)"></span>actual payments received</div></div>
        <div class="card metric"><div class="metric-label">Currently outstanding</div><div class="metric-value">${readableMoney(currentOutstanding())}</div><div class="metric-foot"><span class="metric-accent" style="background:var(--yellow)"></span>across all finished sessions</div></div>
        <div class="card metric"><div class="metric-label">This week</div><div class="metric-value">${durationLabel(Math.round(week.hours*60))}</div><div class="metric-foot"><span class="metric-accent" style="background:var(--sage)"></span>${week.sessions} tutoring sessions</div></div>
      </div>

      <div class="content-grid grid-2">
        <div class="card">
          <div class="card-head"><div><h3 class="card-title">Today</h3><p class="card-subtitle">Everything on your calendar today.</p></div><button class="card-link" data-jump="calendar">Open calendar →</button></div>
          ${todayEvents.length?`<div class="stack-list">${todayEvents.map(eventRow).join('')}</div>`:emptyState('Your day is clear','Add a class, tutoring session, study block or deadline.','Add something','quick-add')}
        </div>
        <div class="card">
          <div class="card-head"><div><h3 class="card-title">Upcoming academic work</h3><p class="card-subtitle">Assignments and exams coming next.</p></div><button class="card-link" data-jump="assignments">View work →</button></div>
          ${upcoming.length?`<div class="stack-list">${upcoming.map(eventRow).join('')}</div>`:emptyState('Nothing urgent','Your next assignments and exams will appear here.','Add assignment','add-assignment')}
        </div>
        <div class="card">
          <div class="card-head"><div><h3 class="card-title">Outstanding payments</h3><p class="card-subtitle">Who still has a balance.</p></div><button class="card-link" data-jump="finances">Open finances →</button></div>
          ${outstandingStudents.length?`<div class="stack-list">${outstandingStudents.map(x=>`<div class="list-row clickable" data-student-id="${x.s.id}"><div class="list-main"><div class="list-title">${escapeHTML(x.s.name)}</div><div class="list-meta">${x.items.filter(i=>i.amount-i.paid>.005).length} unpaid session${x.items.filter(i=>i.amount-i.paid>.005).length===1?'':'s'}</div></div><div class="list-right"><div class="amount">${readableMoney(x.outstanding)}</div><span class="badge badge-pending">Pending</span></div></div>`).join('')}</div>`:emptyState('All caught up','No student currently has an unpaid finished session.','','')}
        </div>
        <div class="card">
          <div class="card-head"><div><h3 class="card-title">This week at a glance</h3><p class="card-subtitle">A small workload check — no noise.</p></div></div>
          <div class="detail-grid">
            <div class="detail-tile"><span>Tutoring hours</span><strong>${week.hours.toFixed(week.hours%1?1:0)} h</strong></div>
            <div class="detail-tile"><span>Finished sessions</span><strong>${week.sessions}</strong></div>
            <div class="detail-tile"><span>Earned</span><strong>${readableMoney(week.earned)}</strong></div>
            <div class="detail-tile"><span>Received</span><strong>${readableMoney(week.received)}</strong></div>
          </div>
        </div>
      </div>`;
    bindViewInteractions(el);
  }

  function eventRow(e) {
    const color=eventColor(e), course=eventCourse(e);
    let right='';
    if(e.type==='tutoring') right=sessionStatusBadge(e);
    else if(e.type==='assignment') right=e.completed?'<span class="badge badge-paid">Done</span>':`<span class="badge badge-neutral">${daysUntil(e.date)}</span>`;
    else right=`<span class="badge badge-neutral">${e.start?formatTime(e.start):'All day'}</span>`;
    return `<div class="list-row clickable" data-event-id="${e.id}"><div class="list-main"><div class="list-title"><span class="course-swatch" style="background:${color}"></span>${escapeHTML(eventTitle(e))}</div><div class="list-meta">${[course?.code,e.start?formatTime(e.start):'',e.type==='tutoring'?durationLabel(e.plannedDuration):''].filter(Boolean).join(' · ')}</div></div><div class="list-right">${right}</div></div>`;
  }
  function daysUntil(dateStr) { const diff=Math.ceil((localDate(dateStr)-localDate(dateKey(new Date())))/86400000); return diff===0?'Today':diff===1?'Tomorrow':diff<0?'Past':`${diff} days`; }
  function sortEvents(a,b) { return a.date.localeCompare(b.date) || (a.start||'00:00').localeCompare(b.start||'00:00'); }

  function renderCalendar() {
    const el=$('#view-calendar');
    const d=state.calendar.date, mode=state.calendar.mode;
    let title='';
    if(mode==='week') title=prettyDateRange(startOfWeek(d),endOfWeek(d));
    else if(mode==='day') title=d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
    else if(mode==='month') title=d.toLocaleDateString('en-US',{month:'long',year:'numeric'});
    else title=`Agenda from ${d.toLocaleDateString('en-US',{month:'long',day:'numeric'})}`;
    el.innerHTML=`<div class="calendar-shell">
      <div class="card calendar-toolbar">
        <div class="toolbar-group">
          <button class="btn btn-secondary tiny-btn" data-cal-nav="today">Today</button>
          <button class="icon-btn" data-cal-nav="prev" aria-label="Previous">‹</button>
          <button class="icon-btn" data-cal-nav="next" aria-label="Next">›</button>
          <div class="calendar-date-title">${escapeHTML(title)}</div>
        </div>
        <div class="segmented">${['day','week','month','agenda'].map(m=>`<button data-cal-mode="${m}" class="${mode===m?'active':''}">${m[0].toUpperCase()+m.slice(1)}</button>`).join('')}</div>
        <div class="filter-row">
          ${calendarFilterChip('class','University','#a9c9e8')}${calendarFilterChip('tutoring','Tutoring','#c9bfe6')}${calendarFilterChip('study','Study','#c7dfcf')}${calendarFilterChip('exam','Exams','#f2c09d')}${calendarFilterChip('assignment','Assignments','#efd9a4')}${calendarFilterChip('personal','Personal','#b8dcd8')}
        </div>
      </div>
      ${mode==='week'?renderWeekCalendar(d):mode==='day'?renderDayCalendar(d):mode==='month'?renderMonthCalendar(d):renderAgenda(d)}
    </div>`;
    bindCalendar(el);
    bindViewInteractions(el);
  }
  function calendarFilterChip(type,label,color) { return `<button class="filter-chip ${state.calendar.filters.has(type)?'active':''}" data-filter="${type}"><span class="filter-dot" style="background:${color}"></span>${label}</button>`; }
  function filteredEvents(start,end) { return state.data.events.filter(e=>state.calendar.filters.has(e.type)&&e.status!=='cancelled'&&isBetween(e.date,start,end)); }

  function renderWeekCalendar(date, days=7) {
    const start=days===1?new Date(date):startOfWeek(date); const dates=Array.from({length:days},(_,i)=>addDays(start,i));
    const today=dateKey(new Date());
    const events=filteredEvents(dates[0],dates[dates.length-1]).filter(e=>e.type!=='assignment'||e.start).sort(sortEvents);
    const allDay=filteredEvents(dates[0],dates[dates.length-1]).filter(e=>!e.start||e.type==='assignment');
    const cols=days===1?'52px minmax(0,1fr)':`52px repeat(${days},minmax(105px,1fr))`;
    return `<div class="week-calendar">
      <div class="week-head" style="grid-template-columns:${cols};min-width:${days===1?'360px':'800px'}"><div></div>${dates.map(dt=>`<div class="week-head-cell ${dateKey(dt)===today?'today':''}"><span class="week-day-name">${dt.toLocaleDateString('en-US',{weekday:'short'})}</span><span class="week-day-num">${dt.getDate()}</span>${allDay.filter(e=>e.date===dateKey(dt)).slice(0,2).map(e=>`<div class="month-event" data-event-id="${e.id}" style="background:${lighten(eventColor(e),.55)};color:${contrastText(lighten(eventColor(e),.55))}">${escapeHTML(eventTitle(e))}</div>`).join('')}</div>`).join('')}</div>
      <div class="week-body" style="grid-template-columns:${cols};min-width:${days===1?'360px':'800px'}">
        <div class="time-axis">${Array.from({length:HOUR_END-HOUR_START+1},(_,i)=>`<div class="time-label" style="top:${(i/(HOUR_END-HOUR_START))*100}%">${formatTime(`${pad(HOUR_START+i)}:00`).replace(':00','')}</div>`).join('')}</div>
        ${dates.map(dt=>`<div class="day-column ${dateKey(dt)===today?'today':''}" data-date="${dateKey(dt)}">${events.filter(e=>e.date===dateKey(dt)).map(calendarEventBlock).join('')}</div>`).join('')}
        ${renderCurrentTimeLine(start,days)}
      </div>
    </div>`;
  }
  function renderDayCalendar(date) { return renderWeekCalendar(date,1); }
  function calendarEventBlock(e) {
    const start=timeToMinutes(e.start||'07:00'); const duration=Number(e.plannedDuration||60); const top=clamp((start-HOUR_START*60)/CALENDAR_MINUTES*CALENDAR_HEIGHT,0,CALENDAR_HEIGHT-16); const height=Math.max(24,duration/CALENDAR_MINUTES*CALENDAR_HEIGHT);
    const color=eventColor(e), bg=lighten(color,.58), text=contrastText(bg);
    return `<div class="calendar-event" draggable="true" data-event-id="${e.id}" style="top:${top}px;height:${Math.min(height,CALENDAR_HEIGHT-top)}px;background:${bg};color:${text};border-color:${lighten(color,.35)}"><div class="event-title">${escapeHTML(eventTitle(e))}</div><div class="event-meta">${escapeHTML(eventMeta(e))}</div>${e.type!=='assignment'?'<div class="resize-handle" data-resize-event="'+e.id+'"></div>':''}</div>`;
  }
  function renderCurrentTimeLine(start,days) {
    const now=new Date(); const key=dateKey(now); const index=Array.from({length:days},(_,i)=>dateKey(addDays(start,i))).indexOf(key); if(index<0) return '';
    const mins=now.getHours()*60+now.getMinutes(); if(mins<HOUR_START*60||mins>HOUR_END*60) return '';
    const top=(mins-HOUR_START*60)/CALENDAR_MINUTES*CALENDAR_HEIGHT;
    const totalCols=days+1; const leftPct=((1+index)/totalCols)*100; const widthPct=(1/totalCols)*100;
    return `<div class="current-time-line" style="top:${top}px;left:calc(${leftPct}% + 1px);right:auto;width:${widthPct}%"></div>`;
  }
  function renderMonthCalendar(date) {
    const first=startOfMonth(date); const gridStart=startOfWeek(first); const days=42; const today=dateKey(new Date());
    const dates=Array.from({length:days},(_,i)=>addDays(gridStart,i)); const end=dates[dates.length-1]; const events=filteredEvents(gridStart,end).sort(sortEvents);
    return `<div class="month-calendar">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=>`<div class="month-weekday">${x}</div>`).join('')}${dates.map(dt=>{const key=dateKey(dt), dayEvents=events.filter(e=>e.date===key), outside=dt.getMonth()!==date.getMonth(); return `<div class="month-day ${outside?'outside':''} ${key===today?'today':''}" data-month-date="${key}"><div class="month-day-number">${dt.getDate()}</div>${dayEvents.slice(0,3).map(e=>`<div class="month-event" data-event-id="${e.id}" style="background:${lighten(eventColor(e),.55)};color:${contrastText(lighten(eventColor(e),.55))}">${escapeHTML(eventTitle(e))}</div>`).join('')}${dayEvents.length>3?`<div class="more-events">+${dayEvents.length-3} more</div>`:''}</div>`}).join('')}</div>`;
  }
  function renderAgenda(date) {
    const start=new Date(date), end=addDays(start,30); const events=filteredEvents(start,end).sort(sortEvents);
    if(!events.length) return `<div class="card">${emptyState('Nothing in the next 30 days','Your classes, tutoring sessions, study blocks, assignments and exams will show here.','Add something','quick-add')}</div>`;
    const grouped={}; events.forEach(e=>(grouped[e.date]??=[]).push(e));
    return `<div class="card">${Object.entries(grouped).map(([key,items])=>`<div class="agenda-group"><p class="agenda-date">${formatDate(key,{weekday:'long',month:'long',day:'numeric'})}</p>${items.map(e=>`<div class="agenda-row" data-event-id="${e.id}"><div class="agenda-time">${e.start?formatTime(e.start):'All day'}</div><div class="agenda-color" style="background:${eventColor(e)}"></div><div><div class="list-title">${escapeHTML(eventTitle(e))}</div><div class="list-meta">${escapeHTML(eventMeta(e))}</div></div><div>${e.type==='tutoring'?sessionStatusBadge(e):''}</div></div>`).join('')}</div>`).join('')}</div>`;
  }

  function bindCalendar(root) {
    $$('[data-cal-mode]',root).forEach(b=>b.onclick=()=>{state.calendar.mode=b.dataset.calMode; renderCalendar();});
    $$('[data-cal-nav]',root).forEach(b=>b.onclick=()=>{
      const nav=b.dataset.calNav; if(nav==='today') state.calendar.date=new Date(); else {
        const delta=state.calendar.mode==='month'?1:state.calendar.mode==='week'?7:state.calendar.mode==='agenda'?7:1;
        if(state.calendar.mode==='month') state.calendar.date=new Date(state.calendar.date.getFullYear(),state.calendar.date.getMonth()+(nav==='next'?1:-1),1,12);
        else state.calendar.date=addDays(state.calendar.date,(nav==='next'?1:-1)*delta);
      } renderCalendar();
    });
    $$('[data-filter]',root).forEach(b=>b.onclick=()=>{ const type=b.dataset.filter; state.calendar.filters.has(type)?state.calendar.filters.delete(type):state.calendar.filters.add(type); renderCalendar(); });
    $$('.day-column',root).forEach(col=>{
      col.addEventListener('click',e=>{ if(e.target.closest('.calendar-event')) return; const rect=col.getBoundingClientRect(); const y=e.clientY-rect.top; const mins=HOUR_START*60+Math.round((y/rect.height)*CALENDAR_MINUTES/state.data.settings.snapMinutes)*state.data.settings.snapMinutes; openQuickAdd({date:col.dataset.date,start:minutesToTime(mins)}); });
      col.addEventListener('dragover',e=>e.preventDefault());
      col.addEventListener('drop',e=>{ e.preventDefault(); const id=e.dataTransfer.getData('text/planit-event'); if(!id) return; const ev=getEvent(id); if(!ev) return; const rect=col.getBoundingClientRect(); const y=e.clientY-rect.top; const mins=HOUR_START*60+Math.round((y/rect.height)*CALENDAR_MINUTES/state.data.settings.snapMinutes)*state.data.settings.snapMinutes; rescheduleEvent(ev,col.dataset.date,minutesToTime(mins)); });
    });
    $$('.calendar-event',root).forEach(block=>{
      block.addEventListener('dragstart',e=>{ e.dataTransfer.setData('text/planit-event',block.dataset.eventId); e.dataTransfer.effectAllowed='move'; });
      const handle=$('.resize-handle',block); if(handle) handle.addEventListener('pointerdown',startResizeEvent);
    });
    $$('[data-month-date]',root).forEach(cell=>cell.addEventListener('click',e=>{ if(e.target.closest('[data-event-id]')) return; openQuickAdd({date:cell.dataset.monthDate,start:'09:00'}); }));
  }
  function startResizeEvent(e) {
    e.stopPropagation(); e.preventDefault(); const id=e.currentTarget.dataset.resizeEvent; const ev=getEvent(id); if(!ev) return;
    const startY=e.clientY, initial=Number(ev.plannedDuration||60); const move=pe=>{ const delta=pe.clientY-startY; const minutesDelta=Math.round((delta/CALENDAR_HEIGHT*CALENDAR_MINUTES)/state.data.settings.snapMinutes)*state.data.settings.snapMinutes; e.currentTarget.parentElement.style.height=`${Math.max(24,(Math.max(15,initial+minutesDelta)/CALENDAR_MINUTES*CALENDAR_HEIGHT))}px`; };
    const up=pe=>{ const delta=pe.clientY-startY; const minutesDelta=Math.round((delta/CALENDAR_HEIGHT*CALENDAR_MINUTES)/state.data.settings.snapMinutes)*state.data.settings.snapMinutes; ev.plannedDuration=Math.max(15,initial+minutesDelta); if(ev.status==='finished') recalculateFinishedEvent(ev); saveData(); document.removeEventListener('pointermove',move); document.removeEventListener('pointerup',up); renderCalendar(); toast(`Duration updated to ${durationLabel(ev.plannedDuration)}.`,`Undo`,()=>{ev.plannedDuration=initial; if(ev.status==='finished') recalculateFinishedEvent(ev); saveData(); renderCalendar();}); };
    document.addEventListener('pointermove',move); document.addEventListener('pointerup',up,{once:true});
  }
  function rescheduleEvent(ev,newDate,newStart) {
    const before={date:ev.date,start:ev.start}; ev.history??=[]; ev.history.push({type:'reschedule',from:{...before},to:{date:newDate,start:newStart},at:new Date().toISOString()}); ev.date=newDate; ev.start=newStart; saveData(); renderAllVisible(); toast(`${eventTitle(ev)} moved to ${formatDate(newDate,{weekday:'short',month:'short',day:'numeric'})}, ${formatTime(newStart)}.`,`Undo`,()=>{ev.date=before.date;ev.start=before.start;saveData();renderAllVisible();});
  }

  function renderCourses() {
    const el=$('#view-courses'); const courses=state.data.courses;
    el.innerHTML=`<div class="card" style="margin-bottom:12px"><div class="card-head" style="margin:0"><div><h3 class="card-title">Your university courses</h3><p class="card-subtitle">Each course color follows it through classes, study blocks, assignments and exams.</p></div><button class="btn btn-primary compact-btn" data-action="add-course">＋ Course</button></div></div>${courses.length?`<div class="entity-grid">${courses.map(c=>{const events=state.data.events.filter(e=>e.courseId===c.id), upcoming=events.filter(e=>['assignment','exam'].includes(e.type)&&e.status!=='cancelled'&&localDate(e.date)>=localDate(dateKey(new Date()))).length; return `<div class="entity-card" data-course-id="${c.id}"><div class="entity-title"><span class="course-swatch" style="background:${c.color}"></span>${escapeHTML(c.code)}</div><div class="entity-sub">${escapeHTML(c.name)}</div><div class="entity-stats"><div class="entity-stat"><span>Upcoming</span><strong>${upcoming}</strong></div><div class="entity-stat"><span>Events</span><strong>${events.length}</strong></div><div class="entity-stat"><span>Color</span><strong><span class="course-swatch" style="background:${c.color}"></span></strong></div></div></div>`}).join('')}</div>`:`<div class="card">${emptyState('Add your first course','Give it a course code, name and pastel color. That color will follow it everywhere.','Add course','add-course')}</div>`}`;
    bindViewInteractions(el);
  }

  function renderAssignments() { renderAcademicList('assignments','assignment','Assignments','Add assignment'); }
  function renderExams() { renderAcademicList('exams','exam','Exams','Add exam'); }
  function renderAcademicList(view,type,title,button) {
    const el=$(`#view-${view}`); const events=state.data.events.filter(e=>e.type===type).sort(sortEvents); const upcoming=events.filter(e=>e.status!=='cancelled'&&localDate(e.date)>=localDate(dateKey(new Date()))), past=events.filter(e=>e.status==='cancelled'||localDate(e.date)<localDate(dateKey(new Date())));
    el.innerHTML=`<div class="card" style="margin-bottom:12px"><div class="card-head" style="margin:0"><div><h3 class="card-title">${title}</h3><p class="card-subtitle">Course-coded and automatically visible on your main calendar.</p></div><button class="btn btn-primary compact-btn" data-action="add-${type}">＋ ${button.replace('Add ','')}</button></div></div>
    <div class="card"><div class="card-head"><h3 class="card-title">Upcoming</h3></div>${upcoming.length?`<div class="stack-list">${upcoming.map(eventRow).join('')}</div>`:emptyState(`No upcoming ${title.toLowerCase()}`,`Add a ${type} and it will appear here and on your calendar.`,button,`add-${type}`)}</div>
    ${past.length?`<div class="card" style="margin-top:12px"><div class="card-head"><h3 class="card-title">Past</h3></div><div class="stack-list">${past.slice(-12).reverse().map(eventRow).join('')}</div></div>`:''}`;
    bindViewInteractions(el);
  }

  function renderStudents() {
    const el=$('#view-students'), students=state.data.students;
    el.innerHTML=`<div class="card" style="margin-bottom:12px"><div class="card-head" style="margin:0"><div><h3 class="card-title">Students</h3><p class="card-subtitle">Every student keeps their own rate, payment history and outstanding balance.</p></div><button class="btn btn-primary compact-btn" data-action="add-student">＋ Student</button></div></div>${students.length?`<div class="entity-grid">${students.map(s=>{const f=studentFinance(s.id); const next=state.data.events.filter(e=>e.type==='tutoring'&&e.studentId===s.id&&e.status==='scheduled'&&localDate(e.date)>=localDate(dateKey(new Date()))).sort(sortEvents)[0]; return `<div class="entity-card" data-student-id="${s.id}"><div class="entity-title">${escapeHTML(s.name)}</div><div class="entity-sub">${escapeHTML(s.subject||getCourse(s.courseId)?.name||'Tutoring')} · ${s.rateType==='per_session'?`${readableMoney(s.rate)}/session`:`${readableMoney(s.rate)}/h`}</div><div class="entity-stats"><div class="entity-stat"><span>Paid</span><strong>${readableMoney(f.paid)}</strong></div><div class="entity-stat"><span>Owes</span><strong>${readableMoney(f.outstanding)}</strong></div><div class="entity-stat"><span>Next</span><strong>${next?formatDate(next.date,{month:'short',day:'numeric'}):'—'}</strong></div></div></div>`}).join('')}</div>`:`<div class="card">${emptyState('No students yet','Add a student once, then their usual rate and duration will autofill every future session.','Add student','add-student')}</div>`}`;
    bindViewInteractions(el);
  }

  function renderGroups() {
    const el=$('#view-groups'), groups=state.data.groups;
    el.innerHTML=`<div class="card" style="margin-bottom:12px"><div class="card-head" style="margin:0"><div><h3 class="card-title">Groups</h3><p class="card-subtitle">One calendar session; separate attendance, rates, balances and receipts for every member.</p></div><button class="btn btn-primary compact-btn" data-action="add-group">＋ Group</button></div></div>${groups.length?`<div class="entity-grid">${groups.map(g=>{const f=groupFinance(g.id); return `<div class="entity-card" data-group-id="${g.id}"><div class="entity-title">${escapeHTML(g.name)}</div><div class="entity-sub">${g.members?.length||0} students · ${escapeHTML(getCourse(g.courseId)?.code||'No course code')}</div><div class="entity-stats"><div class="entity-stat"><span>Earned</span><strong>${readableMoney(f.earned)}</strong></div><div class="entity-stat"><span>Paid</span><strong>${readableMoney(f.paid)}</strong></div><div class="entity-stat"><span>Owes</span><strong>${readableMoney(f.outstanding)}</strong></div></div></div>`}).join('')}</div>`:`<div class="card">${emptyState('No groups yet','Create a group, add students, and set each member’s own rate.','Add group','add-group')}</div>`}`;
    bindViewInteractions(el);
  }

  function renderSessions() {
    const el=$('#view-sessions'), sessions=state.data.events.filter(e=>e.type==='tutoring').sort((a,b)=>sortEvents(b,a));
    const scheduled=sessions.filter(e=>e.status==='scheduled').sort(sortEvents); const finished=sessions.filter(e=>e.status==='finished').sort((a,b)=>sortEvents(b,a)); const cancelled=sessions.filter(e=>e.status==='cancelled').sort((a,b)=>sortEvents(b,a));
    el.innerHTML=`<div class="card" style="margin-bottom:12px"><div class="card-head" style="margin:0"><div><h3 class="card-title">Tutoring sessions</h3><p class="card-subtitle">Finish → unpaid. Record payment → statistics and receipt update automatically.</p></div><button class="btn btn-primary compact-btn" data-action="add-session">＋ Session</button></div></div>
      ${sessionTableCard('Scheduled',scheduled)}${sessionTableCard('Finished',finished)}${cancelled.length?sessionTableCard('Cancelled',cancelled):''}`;
    bindViewInteractions(el);
  }
  function sessionTableCard(title,events) {
    return `<div class="card" style="margin-bottom:12px"><div class="card-head"><div><h3 class="card-title">${title}</h3><p class="card-subtitle">${events.length} session${events.length===1?'':'s'}</p></div></div>${events.length?`<div class="data-table-wrap"><table><thead><tr><th>Date</th><th>Student / group</th><th>Course</th><th>Duration</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>${events.map(e=>`<tr><td>${formatDate(e.date,{month:'short',day:'numeric'})}<div class="list-meta">${e.start?formatTime(e.start):''}</div></td><td><strong>${escapeHTML(eventTitle(e))}</strong></td><td>${escapeHTML(eventCourse(e)?.code||'—')}</td><td>${durationLabel(eventDuration(e))}</td><td>${e.status==='finished'?readableMoney(chargeItemsForEvent(e).reduce((s,x)=>s+x.amount,0)):e.status==='cancelled'?readableMoney(0):`~ ${readableMoney(projectedSessionAmount(e))}`}</td><td>${sessionStatusBadge(e)}</td><td><div class="row-actions"><button class="btn btn-secondary tiny-btn" data-event-id="${e.id}">Open</button></div></td></tr>`).join('')}</tbody></table></div>`:emptyState(`No ${title.toLowerCase()} sessions`,title==='Scheduled'?'Schedule a student or group session from here or directly on the calendar.':'Finished sessions will move here automatically.','','')}</div>`;
  }

  function financeRange() {
    const d=state.finance.date, p=state.finance.period;
    if(p==='day') return [localDate(dateKey(d)),localDate(dateKey(d))];
    if(p==='week') return [startOfWeek(d),endOfWeek(d)];
    if(p==='year') return [startOfYear(d),endOfYear(d)];
    return [startOfMonth(d),endOfMonth(d)];
  }
  function financeStats(start,end) {
    const sessions=state.data.events.filter(e=>e.type==='tutoring'&&e.status==='finished'&&isBetween(e.date,start,end));
    const charges=sessions.flatMap(chargeItemsForEvent); const earned=charges.reduce((s,x)=>s+x.amount,0);
    const received=state.data.payments.filter(p=>isBetween(p.date,start,end)).reduce((s,p)=>s+Number(p.total||0),0);
    const outstandingPeriod=charges.reduce((s,x)=>s+Math.max(0,x.amount-x.paid),0);
    const hours=sessions.reduce((s,e)=>s+eventDuration(e)/60,0);
    return {earned,received,outstandingPeriod,hours,sessions:sessions.length,avgHourly:hours?earned/hours:0,avgSession:sessions.length?earned/sessions.length:0};
  }
  function renderFinances() {
    const el=$('#view-finances'); const [start,end]=financeRange(), f=financeStats(start,end), buckets=financeBuckets(start,end,state.finance.period);
    const students=state.data.students.map(s=>({student:s,...studentFinance(s.id)})).filter(x=>x.earned>0||x.outstanding>0).sort((a,b)=>b.earned-a.earned);
    el.innerHTML=`<div class="card calendar-toolbar" style="margin-bottom:12px"><div class="toolbar-group"><button class="icon-btn" data-fin-nav="prev">‹</button><div class="calendar-date-title">${escapeHTML(prettyDateRange(start,end))}</div><button class="icon-btn" data-fin-nav="next">›</button></div><div class="segmented">${['day','week','month','year'].map(p=>`<button data-fin-period="${p}" class="${state.finance.period===p?'active':''}">${p[0].toUpperCase()+p.slice(1)}</button>`).join('')}</div></div>
      <div class="finance-hero" style="margin-bottom:12px">
        <div class="finance-card earned"><div class="small">Earned</div><div class="big">${readableMoney(f.earned)}</div><div class="small">finished sessions in this period</div></div>
        <div class="finance-card received"><div class="small">Received</div><div class="big">${readableMoney(f.received)}</div><div class="small">payments actually received</div></div>
        <div class="finance-card outstanding"><div class="small">Outstanding from period</div><div class="big">${readableMoney(f.outstandingPeriod)}</div><div class="small">current total: ${readableMoney(currentOutstanding())}</div></div>
        <div class="finance-card"><div class="small">Teaching time</div><div class="big">${f.hours.toFixed(f.hours%1?1:0)} h</div><div class="small">${f.sessions} finished session${f.sessions===1?'':'s'}</div></div>
      </div>
      <div class="content-grid grid-2">
        <div class="card"><div class="card-head"><div><h3 class="card-title">Earned vs received</h3><p class="card-subtitle">Same view, different cash timing.</p></div><div class="legend"><span><i style="background:var(--lavender)"></i>Earned</span><span><i style="background:var(--teal)"></i>Received</span></div></div>${renderBarChart(buckets)}</div>
        <div class="card"><div class="card-head"><h3 class="card-title">Period details</h3></div><div class="detail-grid"><div class="detail-tile"><span>Average hourly rate</span><strong>${readableMoney(f.avgHourly)}</strong></div><div class="detail-tile"><span>Average per session</span><strong>${readableMoney(f.avgSession)}</strong></div><div class="detail-tile"><span>Finished sessions</span><strong>${f.sessions}</strong></div><div class="detail-tile"><span>Current total outstanding</span><strong>${readableMoney(currentOutstanding())}</strong></div></div></div>
        <div class="card span-2"><div class="card-head"><div><h3 class="card-title">By student</h3><p class="card-subtitle">Lifetime balance shown so you always know who still owes you.</p></div></div>${students.length?`<div class="data-table-wrap"><table><thead><tr><th>Student</th><th>Earned</th><th>Paid</th><th>Outstanding</th><th></th></tr></thead><tbody>${students.map(x=>`<tr><td><strong>${escapeHTML(x.student.name)}</strong></td><td>${readableMoney(x.earned)}</td><td>${readableMoney(x.paid)}</td><td>${readableMoney(x.outstanding)}</td><td><button class="btn btn-secondary tiny-btn" data-student-id="${x.student.id}">Open</button></td></tr>`).join('')}</tbody></table></div>`:emptyState('No tutoring finance data yet','Finish your first tutoring session to start the financial overview.','','')}
      </div>`;
    $$('[data-fin-period]',el).forEach(b=>b.onclick=()=>{state.finance.period=b.dataset.finPeriod;renderFinances();});
    $$('[data-fin-nav]',el).forEach(b=>b.onclick=()=>{const sign=b.dataset.finNav==='next'?1:-1; const d=state.finance.date; if(state.finance.period==='day') state.finance.date=addDays(d,sign); else if(state.finance.period==='week') state.finance.date=addDays(d,7*sign); else if(state.finance.period==='month') state.finance.date=new Date(d.getFullYear(),d.getMonth()+sign,1,12); else state.finance.date=new Date(d.getFullYear()+sign,0,1,12); renderFinances();});
    bindViewInteractions(el);
  }
  function financeBuckets(start,end,period) {
    const buckets=[];
    if(period==='day') {
      const events=state.data.events.filter(e=>e.type==='tutoring'&&e.status==='finished'&&e.date===dateKey(start)).sort(sortEvents);
      if(events.length) events.forEach(e=>{const earned=chargeItemsForEvent(e).reduce((s,x)=>s+x.amount,0); const received=state.data.payments.filter(p=>p.date===e.date&&(p.allocations||[]).some(a=>a.sessionId===e.id)).reduce((s,p)=>s+p.total,0); buckets.push({label:e.start?formatTime(e.start).replace(' AM','a').replace(' PM','p'):'Session',earned,received});});
      else buckets.push({label:'Today',earned:0,received:state.data.payments.filter(p=>p.date===dateKey(start)).reduce((s,p)=>s+p.total,0)});
    } else if(period==='week') {
      for(let i=0;i<7;i++){const d=addDays(start,i), stats=financeStats(d,d); buckets.push({label:d.toLocaleDateString('en-US',{weekday:'short'}),earned:stats.earned,received:stats.received});}
    } else if(period==='month') {
      let cur=new Date(start), idx=1; while(cur<=end){const bs=new Date(cur), be=new Date(Math.min(addDays(cur,6).getTime(),end.getTime())); const stats=financeStats(bs,be); buckets.push({label:`W${idx++}`,earned:stats.earned,received:stats.received}); cur=addDays(be,1);}
    } else {
      for(let m=0;m<12;m++){const s=new Date(start.getFullYear(),m,1,12), e=new Date(start.getFullYear(),m+1,0,12), stats=financeStats(s,e); buckets.push({label:s.toLocaleDateString('en-US',{month:'short'}),earned:stats.earned,received:stats.received});}
    }
    return buckets;
  }
  function renderBarChart(buckets) {
    const max=Math.max(1,...buckets.flatMap(b=>[b.earned,b.received]));
    return `<div class="chart">${buckets.map(b=>`<div class="chart-col" title="${b.label}: earned ${readableMoney(b.earned)}, received ${readableMoney(b.received)}"><div class="chart-bars"><div class="bar" style="height:${Math.max(2,b.earned/max*100)}%"></div><div class="bar received" style="height:${Math.max(2,b.received/max*100)}%"></div></div><div class="chart-label">${escapeHTML(b.label)}</div></div>`).join('')}</div>`;
  }

  function renderReceipts() {
    const el=$('#view-receipts'), payments=[...state.data.payments].sort((a,b)=>b.date.localeCompare(a.date));
    el.innerHTML=`<div class="card"><div class="card-head"><div><h3 class="card-title">Payment receipts</h3><p class="card-subtitle">Print any receipt or use your browser’s “Save as PDF”.</p></div></div>${payments.length?`<div class="data-table-wrap"><table><thead><tr><th>Receipt</th><th>Date</th><th>Student</th><th>Method</th><th>Amount</th><th></th></tr></thead><tbody>${payments.map(p=>`<tr><td><strong>${escapeHTML(p.receiptNo)}</strong></td><td>${formatDate(p.date,{month:'short',day:'numeric',year:'numeric'})}</td><td>${escapeHTML(getStudent(p.studentId)?.name||'Student')}</td><td>${escapeHTML(p.method||'—')}</td><td>${readableMoney(p.total)}</td><td><button class="btn btn-secondary tiny-btn" data-receipt-id="${p.id}">View</button></td></tr>`).join('')}</tbody></table></div>`:emptyState('No receipts yet','Receipts appear automatically when you record a payment.','','')}</div>`;
    bindViewInteractions(el);
  }

  function renderSettings() {
    const el=$('#view-settings');
    el.innerHTML=`<div class="content-grid grid-2"><div class="card"><div class="card-head"><div><h3 class="card-title">Personal</h3><p class="card-subtitle">Small defaults that keep Planit fast.</p></div></div><div class="form-grid"><label class="form-field full"><span class="form-label">Your name</span><input class="input" id="settingName" value="${escapeHTML(state.data.settings.name)}"></label><label class="form-field"><span class="form-label">Currency symbol</span><input class="input" id="settingCurrency" value="${escapeHTML(state.data.settings.currency)}" maxlength="4"></label><label class="form-field"><span class="form-label">Default tutoring duration</span><select class="select" id="settingDuration">${durationOptions(state.data.settings.defaultDuration)}</select></label><label class="form-field"><span class="form-label">Calendar snap</span><select class="select" id="settingSnap"><option value="15" ${state.data.settings.snapMinutes===15?'selected':''}>15 minutes</option><option value="30" ${state.data.settings.snapMinutes===30?'selected':''}>30 minutes</option></select></label></div><div style="margin-top:12px"><button class="btn btn-primary compact-btn" id="saveSettings">Save settings</button></div></div>
      <div class="card"><div class="card-head"><div><h3 class="card-title">Private cloud sync</h3><p class="card-subtitle">Use one private account on your MacBook, iPad and phone.</p></div><span class="badge badge-neutral">${cloud.configured?(cloud.user?'Connected':'Sign in'):'Setup needed'}</span></div><div class="detail-block"><div class="detail-tile"><span>Status</span><strong>${cloud.configured?(cloud.user?'Cloud sync active':'Cloud configured · sign in'):'Local only'}</strong></div>${cloud.user?`<div class="detail-tile"><span>Signed in as</span><strong>${escapeHTML(cloud.user.email||'Private account')}</strong></div>`:''}</div><div class="action-row">${cloud.configured&&cloud.user?`<button class="btn btn-secondary compact-btn" id="syncNow">Sync now</button><button class="btn btn-ghost compact-btn" id="cloudSignOut">Sign out</button>`:`<button class="btn btn-secondary compact-btn" id="cloudSetupHelp">Cloud setup guide</button>`}</div><p class="card-subtitle" style="margin-top:10px">Planit keeps a local copy for speed and saves the same private data to your cloud account when connected.</p></div>
      <div class="card"><div class="card-head"><div><h3 class="card-title">Backup</h3><p class="card-subtitle">Keep a portable backup in addition to cloud sync.</p></div></div><div class="action-row"><button class="btn btn-secondary compact-btn" id="exportData">Export backup</button><label class="btn btn-secondary compact-btn" style="cursor:pointer">Import backup<input type="file" id="importData" accept="application/json" hidden></label></div></div>
      <div class="card"><div class="card-head"><div><h3 class="card-title">Sample data</h3><p class="card-subtitle">Useful if you want to test every screen before entering your real information.</p></div></div><button class="btn btn-secondary compact-btn" id="loadDemo">Load sample data</button></div>
      <div class="card"><div class="card-head"><div><h3 class="card-title">Reset</h3><p class="card-subtitle">Deletes Planit data stored in this browser.</p></div></div><button class="btn btn-danger-soft compact-btn" id="resetData">Clear all local data</button></div></div>`;
    $('#saveSettings').onclick=()=>{state.data.settings.name=$('#settingName').value.trim()||'Marly';state.data.settings.currency=$('#settingCurrency').value.trim()||'$';state.data.settings.defaultDuration=Number($('#settingDuration').value);state.data.settings.snapMinutes=Number($('#settingSnap').value);saveData();toast('Settings saved.');renderDashboard();};
    $('#syncNow')?.addEventListener('click',async()=>{await pullCloudState();toast(cloud.status==='synced'?'Planit is synced across your devices.':'Sync check finished.');});
    $('#cloudSignOut')?.addEventListener('click',()=>confirmAction('Sign out of cloud sync?','Your local copy stays on this device, but new changes will not sync until you sign back in.','Sign out',cloudSignOut));
    $('#cloudSetupHelp')?.addEventListener('click',()=>openModal('Cloud sync setup','One-time setup lets the same private Planit data appear on every device.',`<div class="detail-block"><div class="list-row"><div><div class="list-title">1 · Create a free Supabase project</div><div class="list-meta">Use the setup guide included in the ZIP.</div></div></div><div class="list-row"><div><div class="list-title">2 · Run supabase-setup.sql</div><div class="list-meta">This creates your private, owner-only data table.</div></div></div><div class="list-row"><div><div class="list-title">3 · Fill cloud-config.js</div><div class="list-meta">Add the project URL, anon key and optionally your email.</div></div></div><div class="list-row"><div><div class="list-title">4 · Deploy Planit once</div><div class="list-meta">Open the same HTTPS URL on MacBook, iPad and phone, then sign in.</div></div></div></div>`,[{label:'Got it',kind:'primary',action:closeModal}]));
    $('#exportData').onclick=exportBackup; $('#importData').onchange=importBackup; $('#loadDemo').onclick=()=>confirmAction('Load sample data?','This adds sample courses, students and sessions without deleting your existing data.','Load sample',()=>{loadDemoData();saveData();renderAllVisible();toast('Sample data added.');});
    $('#resetData').onclick=()=>confirmAction('Clear all local data?','This cannot be undone unless you exported a backup first.','Clear data',()=>{state.data=blankData();saveData();closeDrawer();setView('dashboard');toast('Local data cleared.');},true);
  }
  function exportBackup() { const blob=new Blob([JSON.stringify(state.data,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`planit-backup-${dateKey(new Date())}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),500); }
  function importBackup(e) { const file=e.target.files?.[0]; if(!file) return; const reader=new FileReader(); reader.onload=()=>{try{const parsed=normalizeData(JSON.parse(reader.result)); state.data=parsed; saveData(); renderAllVisible(); toast('Backup imported.');}catch{toast('That file is not a valid Planit backup.');}}; reader.readAsText(file); e.target.value=''; }

  function bindViewInteractions(root) {
    $$('[data-jump]',root).forEach(x=>x.onclick=()=>setView(x.dataset.jump));
    $$('[data-action]',root).forEach(x=>x.onclick=()=>handleAction(x.dataset.action));
    $$('[data-event-id]',root).forEach(x=>x.addEventListener('click',e=>{e.stopPropagation(); openEventDrawer(x.dataset.eventId);}));
    $$('[data-student-id]',root).forEach(x=>x.addEventListener('click',e=>{e.stopPropagation(); openStudentDrawer(x.dataset.studentId);}));
    $$('[data-group-id]',root).forEach(x=>x.addEventListener('click',e=>{e.stopPropagation(); openGroupDrawer(x.dataset.groupId);}));
    $$('[data-course-id]',root).forEach(x=>x.addEventListener('click',e=>{e.stopPropagation(); openCourseDrawer(x.dataset.courseId);}));
    $$('[data-receipt-id]',root).forEach(x=>x.addEventListener('click',e=>{e.stopPropagation(); openReceiptDrawer(x.dataset.receiptId);}));
  }

  function handleAction(action) {
    if(action==='quick-add') return openQuickAdd();
    if(action==='add-course') return openCourseForm();
    if(action==='add-student') return openStudentForm();
    if(action==='add-group') return openGroupForm();
    if(action==='add-session') return openEventForm('tutoring');
    if(action==='add-assignment') return openEventForm('assignment');
    if(action==='add-exam') return openEventForm('exam');
  }

  function openQuickAdd(prefill={}) {
    openModal('Add to Planit','Choose only what you need — the form stays short.',`<div class="content-grid grid-2">
      ${quickChoice('tutoring','Tutoring session','Student or group')}${quickChoice('class','University class','Course + time')}${quickChoice('study','Study block','Course + focus')}${quickChoice('exam','Exam','Course + exam time')}${quickChoice('assignment','Assignment','Course + due date')}${quickChoice('personal','Personal event','Anything else')}
    </div>`,[]);
    $$('.quick-choice',$('#modalBody')).forEach(b=>b.onclick=()=>{closeModal();openEventForm(b.dataset.type,prefill);});
  }
  function quickChoice(type,title,sub) { return `<button class="entity-card quick-choice" data-type="${type}" style="text-align:left"><div class="entity-title">${escapeHTML(title)}</div><div class="entity-sub">${escapeHTML(sub)}</div></button>`; }

  function durationOptions(selected=90) { return [30,45,60,75,90,105,120,150,180].map(m=>`<option value="${m}" ${Number(selected)===m?'selected':''}>${durationLabel(m)}</option>`).join(''); }
  function courseOptions(selected='',includeNone=true) { return `${includeNone?'<option value="">No course</option>':''}${state.data.courses.map(c=>`<option value="${c.id}" ${selected===c.id?'selected':''}>${escapeHTML(c.code)} — ${escapeHTML(c.name)}</option>`).join('')}`; }
  function studentOptions(selected='') { return `<option value="">Choose student…</option>${state.data.students.map(s=>`<option value="${s.id}" ${selected===s.id?'selected':''}>${escapeHTML(s.name)}</option>`).join('')}`; }
  function groupOptions(selected='') { return `<option value="">Choose group…</option>${state.data.groups.map(g=>`<option value="${g.id}" ${selected===g.id?'selected':''}>${escapeHTML(g.name)}</option>`).join('')}`; }

  function openCourseForm(courseId=null) {
    const c=courseId?getCourse(courseId):null; const color=c?.color||COURSE_COLORS[state.data.courses.length%COURSE_COLORS.length];
    openModal(c?'Edit course':'Add course','Course codes and colors stay consistent everywhere.',`<div class="form-grid"><label class="form-field"><span class="form-label">Course code</span><input class="input" id="courseCode" maxlength="30" value="${escapeHTML(c?.code||'')}" placeholder="DENT402"></label><label class="form-field"><span class="form-label">Course name</span><input class="input" id="courseName" value="${escapeHTML(c?.name||'')}" placeholder="Oral Surgery"></label><div class="form-field full"><span class="form-label">Course color</span><div class="color-grid" id="courseColors">${COURSE_COLORS.map(x=>`<button type="button" class="color-choice ${x===color?'selected':''}" data-color="${x}" style="background:${x}" aria-label="Choose color ${x}"></button>`).join('')}</div><input type="hidden" id="courseColor" value="${color}"></div></div>`,[
      {label:'Cancel',kind:'secondary',action:closeModal},{label:c?'Save changes':'Add course',kind:'primary',action:()=>{const code=$('#courseCode').value.trim(),name=$('#courseName').value.trim();if(!code||!name)return formError('Please add both a course code and course name.');if(c){c.code=code;c.name=name;c.color=$('#courseColor').value;}else state.data.courses.push({id:uid(),code,name,color:$('#courseColor').value});saveData();closeModal();renderAllVisible();toast(c?'Course updated.':'Course added.');}}
    ]);
    $$('.color-choice',$('#courseColors')).forEach(b=>b.onclick=()=>{$$('.color-choice',$('#courseColors')).forEach(x=>x.classList.remove('selected'));b.classList.add('selected');$('#courseColor').value=b.dataset.color;});
  }

  function openStudentForm(studentId=null) {
    const s=studentId?getStudent(studentId):null;
    openModal(s?'Edit student':'Add student','Set this once. Planit will autofill future sessions.',`<div class="form-grid"><label class="form-field full"><span class="form-label">Student name</span><input class="input" id="studentName" value="${escapeHTML(s?.name||'')}" placeholder="Student name"></label><label class="form-field"><span class="form-label">Course</span><select class="select" id="studentCourse">${courseOptions(s?.courseId||'')}</select></label><label class="form-field"><span class="form-label">Subject / note</span><input class="input" id="studentSubject" value="${escapeHTML(s?.subject||'')}" placeholder="Chemistry"></label><label class="form-field"><span class="form-label">Rate type</span><select class="select" id="studentRateType"><option value="hourly" ${s?.rateType!=='per_session'?'selected':''}>Per hour</option><option value="per_session" ${s?.rateType==='per_session'?'selected':''}>Per session</option></select></label><label class="form-field"><span class="form-label">Rate</span><input class="input" id="studentRate" type="number" min="0" step="0.01" value="${Number(s?.rate||0)}"></label><label class="form-field"><span class="form-label">Usual duration</span><select class="select" id="studentDuration">${durationOptions(s?.defaultDuration||state.data.settings.defaultDuration)}</select></label><label class="form-field full"><span class="form-label">Notes</span><textarea class="textarea" id="studentNotes" placeholder="Topics, preferences, reminders…">${escapeHTML(s?.notes||'')}</textarea></label></div>`,[
      {label:'Cancel',kind:'secondary',action:closeModal},{label:s?'Save changes':'Add student',kind:'primary',action:()=>{const name=$('#studentName').value.trim();if(!name)return formError('Please add the student’s name.');const obj={name,courseId:$('#studentCourse').value,subject:$('#studentSubject').value.trim(),rateType:$('#studentRateType').value,rate:Number($('#studentRate').value||0),defaultDuration:Number($('#studentDuration').value),notes:$('#studentNotes').value.trim()};if(s)Object.assign(s,obj);else state.data.students.push({id:uid(),...obj});saveData();closeModal();renderAllVisible();toast(s?'Student updated.':'Student added.');}}
    ]);
  }

  function openGroupForm(groupId=null) {
    const g=groupId?getGroup(groupId):null; const members=g?.members||[];
    openModal(g?'Edit group':'Add group','Each member keeps their own rate and balance.',`<div class="form-grid"><label class="form-field full"><span class="form-label">Group name</span><input class="input" id="groupName" value="${escapeHTML(g?.name||'')}" placeholder="Chemistry Group A"></label><label class="form-field full"><span class="form-label">Course</span><select class="select" id="groupCourse">${courseOptions(g?.courseId||'')}</select></label></div><div class="detail-block"><div class="detail-label">Members</div><div id="groupMemberRows"></div><button type="button" class="btn btn-secondary tiny-btn" id="addGroupMember">＋ Add member</button></div>`,[
      {label:'Cancel',kind:'secondary',action:closeModal},{label:g?'Save changes':'Add group',kind:'primary',action:()=>{const name=$('#groupName').value.trim();if(!name)return formError('Please give the group a name.');const rows=$$('[data-member-row]',$('#groupMemberRows'));const parsed=rows.map(r=>({studentId:$('[data-member-student]',r).value,rateType:$('[data-member-rate-type]',r).value,rate:Number($('[data-member-rate]',r).value||0)})).filter(x=>x.studentId);if(!parsed.length)return formError('Add at least one student to the group.');const ids=parsed.map(x=>x.studentId);if(new Set(ids).size!==ids.length)return formError('The same student cannot be added twice.');const obj={name,courseId:$('#groupCourse').value,members:parsed};if(g)Object.assign(g,obj);else state.data.groups.push({id:uid(),...obj});saveData();closeModal();renderAllVisible();toast(g?'Group updated.':'Group added.');}}
    ]);
    const container=$('#groupMemberRows');
    const addRow=(m={})=>{const s=getStudent(m.studentId);const wrap=document.createElement('div');wrap.dataset.memberRow='1';wrap.className='inline-fields';wrap.style.marginBottom='7px';wrap.innerHTML=`<label class="form-field" style="flex:1"><span class="form-label">Student</span><select class="select" data-member-student>${studentOptions(m.studentId||'')}</select></label><label class="form-field" style="width:110px"><span class="form-label">Rate type</span><select class="select" data-member-rate-type><option value="hourly" ${(m.rateType||s?.rateType)!=='per_session'?'selected':''}>/ hour</option><option value="per_session" ${(m.rateType||s?.rateType)==='per_session'?'selected':''}>/ session</option></select></label><label class="form-field" style="width:90px"><span class="form-label">Rate</span><input class="input" data-member-rate type="number" min="0" step=".01" value="${Number(m.rate??s?.rate??0)}"></label><button type="button" class="icon-btn" data-remove-member style="margin-bottom:1px">×</button>`;container.appendChild(wrap);$('[data-remove-member]',wrap).onclick=()=>wrap.remove();$('[data-member-student]',wrap).onchange=e=>{const st=getStudent(e.target.value);if(st){$('[data-member-rate-type]',wrap).value=st.rateType;$('[data-member-rate]',wrap).value=st.rate;}};};
    if(members.length)members.forEach(addRow); else if(state.data.students[0])addRow({studentId:state.data.students[0].id}); else addRow();
    $('#addGroupMember').onclick=()=>addRow();
  }

  function openEventForm(type='tutoring',prefill={},eventId=null) {
    const existing=eventId?getEvent(eventId):null; if(existing) type=existing.type;
    const date=existing?.date||prefill.date||dateKey(new Date()), start=existing?.start||prefill.start||'17:00', duration=existing?.plannedDuration||state.data.settings.defaultDuration;
    if(type==='tutoring') return openTutoringForm(existing,{date,start,duration});
    const labels={class:'University class',study:'Study block',exam:'Exam',assignment:'Assignment',personal:'Personal event'};
    const isAssignment=type==='assignment';
    openModal(existing?`Edit ${labels[type]}`:`Add ${labels[type]}`,existing?'Update the same calendar item — no duplicates.':'It will appear automatically on your main calendar.',`<div class="form-grid"><label class="form-field full"><span class="form-label">Course</span><select class="select" id="eventCourse">${courseOptions(existing?.courseId||'')}</select></label><label class="form-field full"><span class="form-label">${type==='exam'?'Exam name':type==='assignment'?'Assignment':'Title / focus'}</span><input class="input" id="eventTitle" value="${escapeHTML(existing?.title||'')}" placeholder="${type==='exam'?'Midterm':type==='assignment'?'Case presentation':type==='study'?'Local anesthesia review':type==='class'?'Lecture / clinic':'Event'}"></label><label class="form-field"><span class="form-label">${isAssignment?'Due date':'Date'}</span><input class="input" id="eventDate" type="date" value="${date}"></label>${!isAssignment?`<label class="form-field"><span class="form-label">Start time</span><input class="input" id="eventStart" type="time" step="900" value="${start}"></label><label class="form-field"><span class="form-label">Duration</span><select class="select" id="eventDuration">${durationOptions(duration)}</select></label>`:''}<label class="form-field ${isAssignment?'':'full'}"><span class="form-label">Notes</span><textarea class="textarea" id="eventNotes">${escapeHTML(existing?.notes||'')}</textarea></label></div>`,[
      {label:'Cancel',kind:'secondary',action:closeModal},{label:existing?'Save changes':'Add',kind:'primary',action:()=>{const dateVal=$('#eventDate').value;if(!dateVal)return formError('Choose a date.');const obj={type,title:$('#eventTitle').value.trim()||labels[type],courseId:$('#eventCourse').value,date:dateVal,start:isAssignment?'':$('#eventStart').value,plannedDuration:isAssignment?0:Number($('#eventDuration').value),notes:$('#eventNotes').value.trim(),status:existing?.status||'scheduled',completed:existing?.completed||false};if(existing){const old={date:existing.date,start:existing.start};Object.assign(existing,obj);if(old.date!==obj.date||old.start!==obj.start){existing.history??=[];existing.history.push({type:'reschedule',from:old,to:{date:obj.date,start:obj.start},at:new Date().toISOString()});}}else state.data.events.push({id:uid(),...obj,history:[]});saveData();closeModal();renderAllVisible();toast(existing?'Event updated.':'Added to Planit.');}}
    ]);
  }

  function openTutoringForm(existing,prefill) {
    const isGroup=!!existing?.groupId; const selectedStudent=existing?.studentId||''; const selectedGroup=existing?.groupId||''; const student=getStudent(selectedStudent);
    openModal(existing?'Edit tutoring session':'Add tutoring session',existing?'Rescheduling edits this same session. It never creates a duplicate.':'Choose a student or group; their saved rates will do the rest.',`<div class="form-grid"><div class="form-field full"><span class="form-label">Session type</span><div class="segmented" id="tutorMode"><button type="button" data-mode="individual" class="${!isGroup?'active':''}">Individual</button><button type="button" data-mode="group" class="${isGroup?'active':''}">Group</button></div></div><label class="form-field full" id="studentField" style="${isGroup?'display:none':''}"><span class="form-label">Student</span><select class="select" id="eventStudent">${studentOptions(selectedStudent)}</select></label><label class="form-field full" id="groupField" style="${isGroup?'':'display:none'}"><span class="form-label">Group</span><select class="select" id="eventGroup">${groupOptions(selectedGroup)}</select></label><label class="form-field"><span class="form-label">Course</span><select class="select" id="eventCourse">${courseOptions(existing?.courseId||student?.courseId||getGroup(selectedGroup)?.courseId||'')}</select></label><label class="form-field"><span class="form-label">Date</span><input class="input" id="eventDate" type="date" value="${prefill.date}"></label><label class="form-field"><span class="form-label">Start time</span><input class="input" id="eventStart" type="time" step="900" value="${prefill.start}"></label><label class="form-field"><span class="form-label">Planned duration</span><select class="select" id="eventDuration">${durationOptions(prefill.duration)}</select></label><div class="form-field full" id="individualRateFields" style="${isGroup?'display:none':''}"><div class="inline-fields"><label class="form-field" style="flex:1"><span class="form-label">Rate type</span><select class="select" id="eventRateType"><option value="hourly" ${(existing?.rateType||student?.rateType)!=='per_session'?'selected':''}>Per hour</option><option value="per_session" ${(existing?.rateType||student?.rateType)==='per_session'?'selected':''}>Per session</option></select></label><label class="form-field" style="flex:1"><span class="form-label">Rate</span><input class="input" id="eventRate" type="number" min="0" step=".01" value="${Number(existing?.rate??student?.rate??0)}"></label></div></div><label class="form-field full"><span class="form-label">Notes</span><textarea class="textarea" id="eventNotes" placeholder="Optional session notes…">${escapeHTML(existing?.notes||'')}</textarea></label></div>`,[
      {label:'Cancel',kind:'secondary',action:closeModal},{label:existing?'Save changes':'Schedule',kind:'primary',action:()=>saveTutoringForm(existing)}
    ]);
    let mode=isGroup?'group':'individual';
    $$('[data-mode]',$('#tutorMode')).forEach(b=>b.onclick=()=>{mode=b.dataset.mode;$$('[data-mode]',$('#tutorMode')).forEach(x=>x.classList.toggle('active',x===b));$('#studentField').style.display=mode==='individual'?'':'none';$('#groupField').style.display=mode==='group'?'':'none';$('#individualRateFields').style.display=mode==='individual'?'':'none';});
    $('#eventStudent').onchange=e=>{const st=getStudent(e.target.value);if(st){$('#eventCourse').value=st.courseId||'';$('#eventDuration').value=st.defaultDuration||state.data.settings.defaultDuration;$('#eventRateType').value=st.rateType||'hourly';$('#eventRate').value=st.rate||0;}};
    $('#eventGroup').onchange=e=>{const g=getGroup(e.target.value);if(g)$('#eventCourse').value=g.courseId||'';};
    $('#modal').dataset.tutorMode=mode;
    $$('[data-mode]',$('#tutorMode')).forEach(b=>b.addEventListener('click',()=>$('#modal').dataset.tutorMode=b.dataset.mode));
  }
  function saveTutoringForm(existing) {
    const mode=$('#modal').dataset.tutorMode||'individual'; const studentId=$('#eventStudent').value, groupId=$('#eventGroup').value; const date=$('#eventDate').value,start=$('#eventStart').value;
    if(mode==='individual'&&!studentId)return formError('Choose a student.'); if(mode==='group'&&!groupId)return formError('Choose a group.'); if(!date||!start)return formError('Choose a date and start time.');
    const obj={type:'tutoring',studentId:mode==='individual'?studentId:'',groupId:mode==='group'?groupId:'',courseId:$('#eventCourse').value,date,start,plannedDuration:Number($('#eventDuration').value),rateType:mode==='individual'?$('#eventRateType').value:'',rate:mode==='individual'?Number($('#eventRate').value||0):0,notes:$('#eventNotes').value.trim()};
    if(existing){const old={date:existing.date,start:existing.start};Object.assign(existing,obj);if(old.date!==date||old.start!==start){existing.history??=[];existing.history.push({type:'reschedule',from:old,to:{date,start},at:new Date().toISOString()});}if(existing.status==='finished')recalculateFinishedEvent(existing);} else state.data.events.push({id:uid(),...obj,status:'scheduled',history:[],actualDuration:null,amount:0,groupCharges:[]});
    saveData();closeModal();renderAllVisible();toast(existing?'Session updated.':'Session scheduled.');
  }

  function recalculateFinishedEvent(event) {
    const dur=eventDuration(event);
    if(event.groupId){ if(!event.groupCharges?.length){const g=getGroup(event.groupId);event.groupCharges=(g?.members||[]).map(m=>({studentId:m.studentId,rateType:m.rateType,rate:m.rate,attendance:'present',amount:rateAmount(m.rateType,m.rate,dur)}));} else event.groupCharges.forEach(c=>{if(c.attendance!=='absent')c.amount=rateAmount(c.rateType,c.rate,dur);else c.amount=0;}); }
    else event.amount=rateAmount(event.rateType,event.rate,dur);
  }

  function openFinishModal(eventId) {
    const event=getEvent(eventId); if(!event||event.status!=='scheduled')return;
    if(event.groupId) {
      const group=getGroup(event.groupId); if(!group)return;
      openModal('Finish group session','Confirm actual duration and attendance. Each student stays financially separate.',`<div class="form-grid"><label class="form-field full"><span class="form-label">Actual duration</span><select class="select" id="finishDuration">${durationOptions(event.plannedDuration)}</select></label></div><div class="detail-block"><div class="detail-label">Attendance</div><div id="attendanceRows">${(group.members||[]).map(m=>{const s=getStudent(m.studentId);return `<div class="switch-row"><div><strong>${escapeHTML(s?.name||'Student')}</strong><div class="list-meta">${m.rateType==='per_session'?`${readableMoney(m.rate)}/session`:`${readableMoney(m.rate)}/h`}</div></div><button type="button" class="switch on" data-attendance="${m.studentId}" aria-label="Toggle attendance"></button></div>`}).join('')}</div></div>`,[
        {label:'Cancel',kind:'secondary',action:closeModal},{label:'Finish session',kind:'primary',action:()=>{const duration=Number($('#finishDuration').value);event.actualDuration=duration;event.status='finished';event.finishedAt=new Date().toISOString();event.groupCharges=(group.members||[]).map(m=>{const present=$(`[data-attendance="${m.studentId}"]`).classList.contains('on');return {studentId:m.studentId,rateType:m.rateType,rate:m.rate,attendance:present?'present':'absent',amount:present?rateAmount(m.rateType,m.rate,duration):0};});saveData();closeModal();renderAllVisible();toast('Group session finished. Charges are now unpaid.');}}
      ]);
      $$('[data-attendance]',$('#attendanceRows')).forEach(b=>b.onclick=()=>b.classList.toggle('on'));
    } else {
      openModal('Finish session','Confirm how long you actually taught. The session becomes earned and unpaid.',`<div class="form-grid"><label class="form-field full"><span class="form-label">Actual duration</span><select class="select" id="finishDuration">${durationOptions(event.plannedDuration)}</select></label></div><div class="detail-block"><div class="detail-label">Billing preview</div><div class="detail-tile"><span>Amount when finished</span><strong id="finishAmount">${readableMoney(rateAmount(event.rateType,event.rate,event.plannedDuration))}</strong></div></div>`,[
        {label:'Cancel',kind:'secondary',action:closeModal},{label:'Finish session',kind:'primary',action:()=>{event.actualDuration=Number($('#finishDuration').value);event.status='finished';event.finishedAt=new Date().toISOString();event.amount=rateAmount(event.rateType,event.rate,event.actualDuration);saveData();closeModal();renderAllVisible();toast('Session finished. It is now marked unpaid.');}}
      ]);
      $('#finishDuration').onchange=e=>$('#finishAmount').textContent=readableMoney(rateAmount(event.rateType,event.rate,Number(e.target.value)));
    }
  }

  function cancelSession(eventId) {
    const e=getEvent(eventId); if(!e)return;
    const paid = chargeItemsForEvent(e).reduce((sum,item)=>sum+item.paid,0);
    if (paid > .005) { toast('Void the recorded payment first before cancelling this finished session.'); return; }
    confirmAction('Cancel this session?',`${eventTitle(e)} will remain in history with a $0 charge. It will not count as earned income or teaching time.`,'Cancel session',()=>{const before={status:e.status,amount:e.amount,groupCharges:e.groupCharges};e.status='cancelled';e.cancelledAt=new Date().toISOString();e.amount=0;e.groupCharges=[];saveData();closeDrawer();renderAllVisible();toast('Session cancelled. $0 added.','Undo',()=>{Object.assign(e,before);saveData();renderAllVisible();});},true);
  }

  function openPaymentModal({studentId,sessionId=null,groupMemberId=null}) {
    const student=getStudent(studentId); if(!student)return;
    let eligible=studentLedger(studentId).filter(x=>x.amount-x.paid>.005);
    if(sessionId) eligible=eligible.filter(x=>x.sessionId===sessionId);
    if(!eligible.length){toast('This student has no unpaid finished sessions.');return;}
    const totalOwed=eligible.reduce((s,x)=>s+(x.amount-x.paid),0);
    openModal(`Record payment · ${student.name}`,'Payments update received income, outstanding balances and receipts instantly.',`<div class="form-grid"><label class="form-field"><span class="form-label">Amount</span><input class="input" type="number" min="0.01" step="0.01" id="paymentAmount" value="${totalOwed.toFixed(2)}"></label><label class="form-field"><span class="form-label">Payment date</span><input class="input" type="date" id="paymentDate" value="${dateKey(new Date())}"></label><label class="form-field"><span class="form-label">Method</span><select class="select" id="paymentMethod"><option>Cash</option><option>Bank transfer</option><option>Whish</option><option>OMT</option><option>Other</option></select></label><label class="form-field full"><span class="form-label">Optional note</span><input class="input" id="paymentNote" placeholder="Payment note"></label></div><div class="detail-block"><div class="detail-label">Will apply oldest first</div>${eligible.map(x=>`<div class="list-row"><div><div class="list-title">${formatDate(x.event.date,{month:'short',day:'numeric'})} · ${escapeHTML(eventCourse(x.event)?.code||eventTitle(x.event))}</div><div class="list-meta">Outstanding ${readableMoney(x.amount-x.paid)}</div></div></div>`).join('')}</div>`,[
      {label:'Cancel',kind:'secondary',action:closeModal},{label:'Record payment',kind:'primary',action:()=>{let amount=Number($('#paymentAmount').value||0);if(amount<=0)return formError('Enter a payment amount greater than zero.');if(amount>totalOwed+.005)return formError(`This student currently owes ${readableMoney(totalOwed)}. Record separate credit only after adjusting the sessions.`);const allocations=[];let remaining=amount;for(const item of eligible){if(remaining<=.005)break;const due=item.amount-item.paid;const alloc=Math.min(due,remaining);allocations.push({sessionId:item.sessionId,studentId:item.event.groupId?studentId:null,amount:Number(alloc.toFixed(2))});remaining-=alloc;}const p={id:uid(),studentId,date:$('#paymentDate').value,method:$('#paymentMethod').value,note:$('#paymentNote').value.trim(),total:Number(amount.toFixed(2)),allocations,receiptNo:nextReceiptNo(),createdAt:new Date().toISOString()};state.data.payments.push(p);saveData();closeModal();renderAllVisible();toast(`Payment recorded · ${p.receiptNo}`);openReceiptDrawer(p.id);}}
    ]);
  }
  function nextReceiptNo(){const year=new Date().getFullYear(); const num=state.data.payments.filter(p=>String(p.receiptNo||'').includes(String(year))).length+1;return `${year}-${String(num).padStart(4,'0')}`;}

  function openEventDrawer(id) {
    const e=getEvent(id);if(!e)return;state.drawer={type:'event',id};
    $('#drawerEyebrow').textContent=e.type==='tutoring'?'Tutoring session':e.type;
    $('#drawerTitle').textContent=eventTitle(e);
    const course=eventCourse(e); let body=`<div class="detail-block"><div class="detail-grid"><div class="detail-tile"><span>Date</span><strong>${formatDate(e.date,{month:'short',day:'numeric',year:'numeric'})}</strong></div><div class="detail-tile"><span>Time</span><strong>${e.start?formatTime(e.start):'All day'}</strong></div>${e.plannedDuration?`<div class="detail-tile"><span>Duration</span><strong>${durationLabel(eventDuration(e))}</strong></div>`:''}<div class="detail-tile"><span>Course</span><strong>${escapeHTML(course?.code||'—')}</strong></div></div></div>`;
    if(e.type==='tutoring') {
      const charges=chargeItemsForEvent(e), total=charges.reduce((s,x)=>s+x.amount,0), paid=charges.reduce((s,x)=>s+x.paid,0);
      body+=`<div class="detail-block"><div class="detail-label">Session</div><div class="action-row">${sessionStatusBadge(e)}${e.status==='finished'?`<span class="badge badge-neutral">${readableMoney(total)}</span>`:''}</div></div>`;
      if(e.groupId && e.status==='finished') body+=`<div class="detail-block"><div class="detail-label">Group members</div>${(e.groupCharges||[]).map(c=>{const st=getStudent(c.studentId), item=charges.find(x=>x.studentId===c.studentId);const due=item?Math.max(0,item.amount-item.paid):0;return `<div class="list-row"><div><div class="list-title">${escapeHTML(st?.name||'Student')}</div><div class="list-meta">${c.attendance==='absent'?'Absent · $0':`${readableMoney(c.amount)} charge · ${readableMoney(item?.paid||0)} paid`}</div></div><div>${c.attendance!=='absent'&&due>.005?`<button class="btn btn-soft tiny-btn" data-pay-student="${c.studentId}" data-pay-session="${e.id}">Pay ${readableMoney(due)}</button>`:'<span class="badge badge-paid">✓ Clear</span>'}</div></div>`}).join('')}</div>`;
      if(!e.groupId && e.status==='finished') { const due=Math.max(0,total-paid); body+=`<div class="detail-block"><div class="detail-label">Payment</div><div class="detail-grid"><div class="detail-tile"><span>Earned</span><strong>${readableMoney(total)}</strong></div><div class="detail-tile"><span>Still owed</span><strong>${readableMoney(due)}</strong></div></div>${due>.005?`<div class="action-row" style="margin-top:8px"><button class="btn btn-soft compact-btn" data-pay-student="${e.studentId}" data-pay-session="${e.id}">$ Mark paid</button></div>`:''}</div>`; }
      body+=`<div class="detail-block"><div class="detail-label">Actions</div><div class="action-row">${e.status==='scheduled'?`<button class="btn btn-primary compact-btn" data-finish="${e.id}">✓ Finish</button><button class="btn btn-secondary compact-btn" data-edit-event="${e.id}">↻ Reschedule / edit</button><button class="btn btn-danger-soft compact-btn" data-cancel-event="${e.id}">Cancel</button>`:`<button class="btn btn-secondary compact-btn" data-edit-event="${e.id}">Edit details</button>${e.status!=='cancelled'&&paid<=.005?`<button class="btn btn-danger-soft compact-btn" data-cancel-event="${e.id}">Cancel / void</button>`:''}`}</div></div>`;
    } else {
      body+=`<div class="detail-block"><div class="detail-label">Actions</div><div class="action-row"><button class="btn btn-secondary compact-btn" data-edit-event="${e.id}">Edit / reschedule</button>${e.type==='assignment'?`<button class="btn btn-soft compact-btn" data-toggle-complete="${e.id}">${e.completed?'Mark not done':'✓ Complete'}</button>`:''}<button class="btn btn-danger-soft compact-btn" data-delete-event="${e.id}">Delete</button></div></div>`;
    }
    if(e.notes)body+=`<div class="detail-block"><div class="detail-label">Notes</div><p style="margin:0;font-size:11.5px;white-space:pre-wrap">${escapeHTML(e.notes)}</p></div>`;
    if(e.history?.length)body+=`<div class="detail-block"><div class="detail-label">Reschedule history</div>${e.history.slice(-3).reverse().map(h=>`<div class="list-meta" style="margin:5px 0">Moved from ${formatDate(h.from.date,{month:'short',day:'numeric'})} ${h.from.start?formatTime(h.from.start):''}</div>`).join('')}</div>`;
    $('#drawerBody').innerHTML=body;openDrawer();
    $$('[data-finish]',$('#drawerBody')).forEach(b=>b.onclick=()=>{closeDrawer();openFinishModal(b.dataset.finish);});
    $$('[data-edit-event]',$('#drawerBody')).forEach(b=>b.onclick=()=>{closeDrawer();openEventForm(e.type,{},b.dataset.editEvent);});
    $$('[data-cancel-event]',$('#drawerBody')).forEach(b=>b.onclick=()=>cancelSession(b.dataset.cancelEvent));
    $$('[data-pay-student]',$('#drawerBody')).forEach(b=>b.onclick=()=>{closeDrawer();openPaymentModal({studentId:b.dataset.payStudent,sessionId:b.dataset.paySession});});
    $$('[data-toggle-complete]',$('#drawerBody')).forEach(b=>b.onclick=()=>{e.completed=!e.completed;saveData();renderAllVisible();openEventDrawer(e.id);toast(e.completed?'Assignment completed.':'Assignment reopened.');});
    $$('[data-delete-event]',$('#drawerBody')).forEach(b=>b.onclick=()=>confirmAction('Delete this calendar item?','This removes it from Planit.','Delete',()=>{state.data.events=state.data.events.filter(x=>x.id!==e.id);saveData();closeDrawer();renderAllVisible();toast('Deleted.');},true));
  }

  function openStudentDrawer(id) {
    const s=getStudent(id);if(!s)return;state.drawer={type:'student',id};const f=studentFinance(id);const allEvents=state.data.events.filter(e=>e.type==='tutoring'&&(e.studentId===id||(e.groupId&&getGroup(e.groupId)?.members?.some(m=>m.studentId===id)))).sort((a,b)=>sortEvents(b,a));
    $('#drawerEyebrow').textContent='Student';$('#drawerTitle').textContent=s.name;
    $('#drawerBody').innerHTML=`<div class="detail-block"><div class="detail-grid"><div class="detail-tile"><span>Earned</span><strong>${readableMoney(f.earned)}</strong></div><div class="detail-tile"><span>Paid</span><strong>${readableMoney(f.paid)}</strong></div><div class="detail-tile"><span>Outstanding</span><strong>${readableMoney(f.outstanding)}</strong></div><div class="detail-tile"><span>Rate</span><strong>${s.rateType==='per_session'?`${readableMoney(s.rate)}/session`:`${readableMoney(s.rate)}/h`}</strong></div></div></div><div class="detail-block"><div class="detail-label">Actions</div><div class="action-row"><button class="btn btn-primary compact-btn" data-new-session-student="${id}">＋ Session</button>${f.outstanding>.005?`<button class="btn btn-soft compact-btn" data-record-payment="${id}">$ Record payment</button>`:''}<button class="btn btn-secondary compact-btn" data-edit-student="${id}">Edit</button></div></div><div class="detail-block"><div class="detail-label">Recent sessions</div>${allEvents.length?allEvents.slice(0,8).map(e=>`<div class="list-row clickable" data-open-session="${e.id}"><div><div class="list-title">${formatDate(e.date,{month:'short',day:'numeric'})} · ${escapeHTML(e.groupId?getGroup(e.groupId)?.name||'Group':eventCourse(e)?.code||'Session')}</div><div class="list-meta">${e.start?formatTime(e.start):''} · ${durationLabel(eventDuration(e))}</div></div><div>${sessionStatusBadge(e)}</div></div>`).join(''):'<div class="list-meta">No sessions yet.</div>'}</div>${s.notes?`<div class="detail-block"><div class="detail-label">Notes</div><p style="white-space:pre-wrap;font-size:11.5px;margin:0">${escapeHTML(s.notes)}</p></div>`:''}`;openDrawer();
    $('[data-new-session-student]',$('#drawerBody')).onclick=()=>{closeDrawer();openEventForm('tutoring');setTimeout(()=>{const sel=$('#eventStudent');if(sel){sel.value=id;sel.dispatchEvent(new Event('change'));}},0);};
    const pay=$('[data-record-payment]',$('#drawerBody'));if(pay)pay.onclick=()=>{closeDrawer();openPaymentModal({studentId:id});};
    $('[data-edit-student]',$('#drawerBody')).onclick=()=>{closeDrawer();openStudentForm(id);};
    $$('[data-open-session]',$('#drawerBody')).forEach(b=>b.onclick=()=>openEventDrawer(b.dataset.openSession));
  }

  function openGroupDrawer(id) {
    const g=getGroup(id);if(!g)return;state.drawer={type:'group',id};const f=groupFinance(id);$('#drawerEyebrow').textContent='Tutoring group';$('#drawerTitle').textContent=g.name;
    $('#drawerBody').innerHTML=`<div class="detail-block"><div class="detail-grid"><div class="detail-tile"><span>Members</span><strong>${g.members?.length||0}</strong></div><div class="detail-tile"><span>Outstanding</span><strong>${readableMoney(f.outstanding)}</strong></div><div class="detail-tile"><span>Earned</span><strong>${readableMoney(f.earned)}</strong></div><div class="detail-tile"><span>Paid</span><strong>${readableMoney(f.paid)}</strong></div></div></div><div class="detail-block"><div class="detail-label">Actions</div><div class="action-row"><button class="btn btn-primary compact-btn" data-new-group-session="${id}">＋ Group session</button><button class="btn btn-secondary compact-btn" data-edit-group="${id}">Edit group</button></div></div><div class="detail-block"><div class="detail-label">Members</div>${(g.members||[]).map(m=>{const st=getStudent(m.studentId),sf=studentFinance(m.studentId);return `<div class="list-row clickable" data-open-student="${m.studentId}"><div><div class="list-title">${escapeHTML(st?.name||'Student')}</div><div class="list-meta">${m.rateType==='per_session'?`${readableMoney(m.rate)}/session`:`${readableMoney(m.rate)}/h`}</div></div><div class="list-right"><div class="amount">${readableMoney(sf.outstanding)}</div><div class="list-meta">outstanding total</div></div></div>`}).join('')}</div>`;openDrawer();
    $('[data-new-group-session]',$('#drawerBody')).onclick=()=>{closeDrawer();openEventForm('tutoring');setTimeout(()=>{const groupBtn=$('[data-mode="group"]');if(groupBtn){groupBtn.click();$('#eventGroup').value=id;$('#eventGroup').dispatchEvent(new Event('change'));}},0);};
    $('[data-edit-group]',$('#drawerBody')).onclick=()=>{closeDrawer();openGroupForm(id);};
    $$('[data-open-student]',$('#drawerBody')).forEach(b=>b.onclick=()=>openStudentDrawer(b.dataset.openStudent));
  }

  function openCourseDrawer(id) {
    const c=getCourse(id);if(!c)return;state.drawer={type:'course',id};const events=state.data.events.filter(e=>e.courseId===id).sort(sortEvents);const upcoming=events.filter(e=>localDate(e.date)>=localDate(dateKey(new Date()))&&e.status!=='cancelled');$('#drawerEyebrow').textContent='University course';$('#drawerTitle').textContent=`${c.code} · ${c.name}`;
    $('#drawerBody').innerHTML=`<div class="detail-block"><div class="detail-label">Course color</div><div style="width:100%;height:34px;border-radius:10px;background:${lighten(c.color,.45)};border:1px solid ${lighten(c.color,.25)}"></div></div><div class="detail-block"><div class="detail-label">Actions</div><div class="action-row"><button class="btn btn-secondary compact-btn" data-edit-course="${id}">Edit course</button><button class="btn btn-soft compact-btn" data-course-assignment="${id}">＋ Assignment</button><button class="btn btn-soft compact-btn" data-course-exam="${id}">＋ Exam</button></div></div><div class="detail-block"><div class="detail-label">Upcoming</div>${upcoming.length?upcoming.slice(0,10).map(eventRow).join(''):'<div class="list-meta">Nothing scheduled yet.</div>'}</div>`;openDrawer();
    $('[data-edit-course]',$('#drawerBody')).onclick=()=>{closeDrawer();openCourseForm(id);};
    $('[data-course-assignment]',$('#drawerBody')).onclick=()=>{closeDrawer();openEventForm('assignment');setTimeout(()=>{$('#eventCourse').value=id;},0);};
    $('[data-course-exam]',$('#drawerBody')).onclick=()=>{closeDrawer();openEventForm('exam');setTimeout(()=>{$('#eventCourse').value=id;},0);};
    $$('[data-event-id]',$('#drawerBody')).forEach(b=>b.onclick=()=>openEventDrawer(b.dataset.eventId));
  }

  function openReceiptDrawer(paymentId) {
    const p=state.data.payments.find(x=>x.id===paymentId);if(!p)return;const s=getStudent(p.studentId);state.drawer={type:'receipt',id:paymentId};$('#drawerEyebrow').textContent='Payment receipt';$('#drawerTitle').textContent=p.receiptNo;
    const lines=(p.allocations||[]).map(a=>{const e=getEvent(a.sessionId);return `<div class="list-row"><div><div class="list-title">${e?formatDate(e.date,{month:'short',day:'numeric',year:'numeric'}):'Session'}</div><div class="list-meta">${escapeHTML(eventCourse(e||{})?.code||'Tutoring session')} · ${e?durationLabel(eventDuration(e)):''}</div></div><div class="amount">${readableMoney(a.amount)}</div></div>`}).join('');
    $('#drawerBody').innerHTML=`<div class="receipt-paper" id="receiptPreview"><div class="receipt-brand">planit.</div><div class="list-meta">PAYMENT RECEIPT</div><div class="detail-block"><div class="detail-grid"><div><div class="detail-label">Receipt</div><strong>${escapeHTML(p.receiptNo)}</strong></div><div><div class="detail-label">Date</div><strong>${formatDate(p.date,{month:'long',day:'numeric',year:'numeric'})}</strong></div><div><div class="detail-label">Student</div><strong>${escapeHTML(s?.name||'Student')}</strong></div><div><div class="detail-label">Method</div><strong>${escapeHTML(p.method||'—')}</strong></div></div></div><div class="detail-block"><div class="detail-label">Sessions covered</div>${lines}</div><div class="detail-block"><div class="detail-label">Amount paid</div><div class="receipt-total">${readableMoney(p.total)}</div></div>${p.note?`<div class="detail-block"><div class="detail-label">Note</div><div>${escapeHTML(p.note)}</div></div>`:''}</div><div class="action-row" style="margin-top:10px"><button class="btn btn-primary compact-btn" id="printReceipt">Print / Save PDF</button><button class="btn btn-danger-soft compact-btn" id="voidPayment">Void payment</button></div>`;openDrawer();$('#printReceipt').onclick=()=>printReceipt(p.id);$('#voidPayment').onclick=()=>confirmAction('Void this payment?',`Receipt ${p.receiptNo} will be removed and all linked balances will become outstanding again.`,'Void payment',()=>{state.data.payments=state.data.payments.filter(x=>x.id!==p.id);saveData();closeDrawer();renderAllVisible();toast('Payment voided. Balances updated.');},true);
  }
  function printReceipt(paymentId) {
    const p=state.data.payments.find(x=>x.id===paymentId); if(!p)return;const s=getStudent(p.studentId);const print=document.createElement('div');print.id='printArea';print.innerHTML=`<div style="max-width:720px;margin:auto;font-family:Arial,sans-serif"><div style="font-family:Georgia,serif;font-size:34px;font-weight:800">planit.</div><p style="letter-spacing:.12em;font-size:11px">PAYMENT RECEIPT</p><hr><table style="width:100%;min-width:0"><tr><td><b>Receipt</b><br>${escapeHTML(p.receiptNo)}</td><td><b>Date</b><br>${formatDate(p.date,{month:'long',day:'numeric',year:'numeric'})}</td></tr><tr><td><b>Student</b><br>${escapeHTML(s?.name||'Student')}</td><td><b>Method</b><br>${escapeHTML(p.method||'—')}</td></tr></table><h3 style="margin-top:28px">Sessions covered</h3>${(p.allocations||[]).map(a=>{const e=getEvent(a.sessionId);return `<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #ddd"><span>${e?formatDate(e.date,{month:'short',day:'numeric',year:'numeric'}):'Session'} · ${escapeHTML(eventCourse(e||{})?.code||'Tutoring')}</span><b>${readableMoney(a.amount)}</b></div>`}).join('')}<div style="margin-top:28px;font-size:14px">AMOUNT PAID</div><div style="font-size:30px;font-weight:800">${readableMoney(p.total)}</div></div>`;document.body.appendChild(print);window.print();setTimeout(()=>print.remove(),500); }

  function refreshDrawer() { if(!state.drawer)return; const {type,id}=state.drawer; if(type==='event')openEventDrawer(id);else if(type==='student')openStudentDrawer(id);else if(type==='group')openGroupDrawer(id);else if(type==='course')openCourseDrawer(id);else if(type==='receipt')openReceiptDrawer(id); }
  function openDrawer(){ $('#drawer').classList.add('open'); }
  function closeDrawer(){ $('#drawer').classList.remove('open'); state.drawer=null; }

  function openModal(title,subtitle,body,buttons=[]) {
    $('#modalTitle').textContent=title;$('#modalSubtitle').textContent=subtitle||'';$('#modalBody').innerHTML=body;$('#modalFoot').innerHTML='';delete $('#modal').dataset.tutorMode;
    buttons.forEach(btn=>{const b=document.createElement('button');b.className=`btn ${btn.kind==='primary'?'btn-primary':btn.kind==='danger'?'btn-danger-soft':'btn-secondary'} compact-btn`;b.textContent=btn.label;b.onclick=btn.action;$('#modalFoot').appendChild(b);});
    $('#modalBackdrop').classList.remove('hidden');$('#modal').classList.remove('hidden');setTimeout(()=>$('#modal input:not([type=hidden]), #modal select')?.focus(),20);
  }
  function closeModal(){ $('#modalBackdrop').classList.add('hidden');$('#modal').classList.add('hidden');$('#modalBody').innerHTML='';$('#modalFoot').innerHTML=''; }
  function formError(message){ let old=$('.modal-error',$('#modalBody')); if(old)old.remove();const p=document.createElement('p');p.className='modal-error field-error';p.textContent=message;$('#modalBody').prepend(p);p.scrollIntoView({behavior:'smooth',block:'nearest'}); }
  function confirmAction(title,text,confirmLabel,onConfirm,danger=false){openModal(title,text,'<p style="margin:0;color:var(--muted);font-size:11.5px">Please check this action before continuing.</p>',[{label:'Keep',kind:'secondary',action:closeModal},{label:confirmLabel,kind:danger?'danger':'primary',action:()=>{closeModal();onConfirm();}}]);}

  function toast(message,actionLabel=null,action=null){const t=document.createElement('div');t.className='toast';t.innerHTML=`<span>${escapeHTML(message)}</span>`;if(actionLabel&&action){const b=document.createElement('button');b.textContent=actionLabel;b.onclick=()=>{action();t.remove();};t.appendChild(b);}$('#toastRegion').appendChild(t);setTimeout(()=>t.remove(),action?6000:3200);}

  function openCommand() { $('#commandBackdrop').classList.remove('hidden');$('#commandPalette').classList.remove('hidden');$('#commandInput').value='';renderCommandResults('');setTimeout(()=>$('#commandInput').focus(),20); }
  function closeCommand(){ $('#commandBackdrop').classList.add('hidden');$('#commandPalette').classList.add('hidden'); }
  function renderCommandResults(query) {
    const q=query.trim().toLowerCase(); const rows=[];
    const match=x=>!q||x.toLowerCase().includes(q);
    state.data.students.forEach(s=>{if(match(s.name+' '+(s.subject||'')))rows.push({label:s.name,meta:'Student',action:()=>openStudentDrawer(s.id)});});
    state.data.courses.forEach(c=>{if(match(c.code+' '+c.name))rows.push({label:`${c.code} · ${c.name}`,meta:'Course',action:()=>openCourseDrawer(c.id)});});
    state.data.groups.forEach(g=>{if(match(g.name))rows.push({label:g.name,meta:'Group',action:()=>openGroupDrawer(g.id)});});
    state.data.events.slice().sort((a,b)=>sortEvents(b,a)).forEach(e=>{if(match(eventTitle(e)+' '+(eventCourse(e)?.code||'')))rows.push({label:eventTitle(e),meta:`${e.type} · ${formatDate(e.date,{month:'short',day:'numeric'})}`,action:()=>openEventDrawer(e.id)});});
    rows.unshift({label:'Add tutoring session',meta:'Quick action',action:()=>openEventForm('tutoring')},{label:'Add assignment',meta:'Quick action',action:()=>openEventForm('assignment')},{label:'Add exam',meta:'Quick action',action:()=>openEventForm('exam')});
    $('#commandResults').innerHTML=rows.slice(0,18).map((r,i)=>`<button class="command-item" data-command-index="${i}"><span><strong>${escapeHTML(r.label)}</strong><br><small>${escapeHTML(r.meta)}</small></span><small>↵</small></button>`).join('')||'<div class="empty-state"><p>No results.</p></div>';
    $$('[data-command-index]',$('#commandResults')).forEach(b=>b.onclick=()=>{const r=rows[Number(b.dataset.commandIndex)];closeCommand();r.action();});
  }

  function loadDemoData() {
    const course1={id:uid(),code:'DENT402',name:'Oral Surgery',color:'#c9bfe6'}, course2={id:uid(),code:'DENT410',name:'Prosthodontics',color:'#a9c9e8'}, chem={id:uid(),code:'CHEM201',name:'Chemistry',color:'#c7dfcf'};state.data.courses.push(course1,course2,chem);
    const sara={id:uid(),name:'Sarah A.',courseId:chem.id,subject:'Chemistry',rateType:'hourly',rate:20,defaultDuration:90,notes:'Review equilibrium next.'}, karim={id:uid(),name:'Karim M.',courseId:chem.id,subject:'Chemistry',rateType:'per_session',rate:18,defaultDuration:90,notes:''}, maya={id:uid(),name:'Maya R.',courseId:chem.id,subject:'Chemistry',rateType:'per_session',rate:15,defaultDuration:90,notes:''};state.data.students.push(sara,karim,maya);
    const group={id:uid(),name:'Chemistry Group A',courseId:chem.id,members:[{studentId:karim.id,rateType:'per_session',rate:18},{studentId:maya.id,rateType:'per_session',rate:15}]};state.data.groups.push(group);
    const now=new Date(), t=dateKey(now), tomorrow=dateKey(addDays(now,1)), in3=dateKey(addDays(now,3)), in6=dateKey(addDays(now,6));
    const done={id:uid(),type:'tutoring',studentId:sara.id,groupId:'',courseId:chem.id,date:t,start:'16:30',plannedDuration:90,actualDuration:90,rateType:'hourly',rate:20,notes:'',status:'finished',amount:30,groupCharges:[],history:[]};
    state.data.events.push(done,{id:uid(),type:'tutoring',studentId:'',groupId:group.id,courseId:chem.id,date:tomorrow,start:'18:00',plannedDuration:90,rateType:'',rate:0,notes:'',status:'scheduled',amount:0,groupCharges:[],history:[]},{id:uid(),type:'class',courseId:course1.id,title:'Oral Surgery lecture',date:t,start:'09:00',plannedDuration:120,status:'scheduled',notes:'',history:[]},{id:uid(),type:'study',courseId:course2.id,title:'Crown prep review',date:t,start:'13:00',plannedDuration:90,status:'scheduled',notes:'',history:[]},{id:uid(),type:'assignment',courseId:course2.id,title:'Lab report',date:in3,start:'',plannedDuration:0,status:'scheduled',completed:false,notes:'',history:[]},{id:uid(),type:'exam',courseId:course1.id,title:'Midterm',date:in6,start:'10:00',plannedDuration:120,status:'scheduled',notes:'',history:[]});
    const pay={id:uid(),studentId:sara.id,date:t,method:'Cash',note:'',total:20,allocations:[{sessionId:done.id,studentId:null,amount:20}],receiptNo:nextReceiptNo(),createdAt:new Date().toISOString()};state.data.payments.push(pay);
  }

  function openMobileNav(){ $('#sidebar').classList.add('mobile-open'); }
  function closeMobileNav(){ $('#sidebar').classList.remove('mobile-open'); }

  function initEvents() {
    $$('.nav-item[data-view], .bottom-nav-item[data-view]').forEach(btn=>btn.addEventListener('click',()=>setView(btn.dataset.view)));
    $('#brandButton').onclick=$('#mobileBrandButton').onclick=()=>setView('dashboard');
    $('#sidebarCollapse').onclick=()=>{const collapsed=!$('#sidebar').classList.contains('collapsed');$('#sidebar').classList.toggle('collapsed',collapsed);document.body.classList.toggle('sidebar-is-collapsed',collapsed);localSet('planit_sidebar_collapsed',collapsed?'1':'0');};
    if(localGet('planit_sidebar_collapsed')==='1'&&innerWidth>820){$('#sidebar').classList.add('collapsed');document.body.classList.add('sidebar-is-collapsed');}
    $('#mobileMenuButton').onclick=()=>$('#sidebar').classList.contains('mobile-open')?closeMobileNav():openMobileNav();
    $('#quickAddButton').onclick=()=>openQuickAdd();
    $('#searchButton').onclick=openCommand;
    $('#syncStatus').onclick=()=>setView('settings');
    $('#authForm').onsubmit=e=>{e.preventDefault();if(!cloud.client)return showAuthError('Cloud sync is not configured yet.');cloudSignIn($('#authEmail').value.trim(),$('#authPassword').value);};
    $('#authSignUp').onclick=()=>{if(!cloud.client)return showAuthError('Cloud sync is not configured yet.');cloudSignUp($('#authEmail').value.trim(),$('#authPassword').value);};
    if(cloudConfig().allowSignup===false) $('#authSignUp').classList.add('hidden');
    $('#modalClose').onclick=$('#modalBackdrop').onclick=closeModal;
    $('#drawerClose').onclick=closeDrawer;
    $('#commandBackdrop').onclick=closeCommand;
    $('#commandInput').oninput=e=>renderCommandResults(e.target.value);
    document.addEventListener('keydown',e=>{
      if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openCommand();}
      if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='n'){e.preventDefault();openQuickAdd();}
      if(e.key==='Escape'){if(!$('#commandPalette').classList.contains('hidden'))closeCommand();else if(!$('#modal').classList.contains('hidden'))closeModal();else closeDrawer();}
      if(e.key.toLowerCase()==='t'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)&&state.view==='calendar'){state.calendar.date=new Date();renderCalendar();}
    });
    window.addEventListener('resize',()=>{if(innerWidth>820)closeMobileNav();});
    window.addEventListener('online',()=>{if(cloud.user)pullCloudState();});
    window.addEventListener('offline',()=>{if(cloud.configured)updateCloudStatus('offline');});
    window.addEventListener('focus',()=>{if(cloud.user)pullCloudState({quiet:true});});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&cloud.user)pullCloudState({quiet:true});});
  }

  function boot() {
    chooseQuote();initEvents();renderDashboard();initCloud();
    if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }

  boot();
})();
