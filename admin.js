const SUPABASE_URL = "https://hxphmxkimjxngsrlxcjn.supabase.co";
const SUPABASE_KEY = "sb_publishable_V-vK8enWv_NNYbigWPSkhA_gq-D8s0t";
const ADMIN_EMAIL = "kamlin.eg2025@gmail.com";

const sb = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);const LOGIN_SESSION_KEY="kamlin_admin_authenticated";
const KEYS={bookings:"kamlin_bookings",workers:"kamlin_workers",assignments:"kamlin_assignments",attendance:"kamlin_attendance",tools:"kamlin_tools"};
const load=k=>{try{return JSON.parse(localStorage.getItem(k)||"[]")}catch{return[]}};const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
let bookings=load(KEYS.bookings).map(x=>({...x,status:x.status==="ملغي"?"ملغى":x.status})),workers=load(KEYS.workers),assignments=load(KEYS.assignments),attendance=load(KEYS.attendance),tools=load(KEYS.tools);
async function initAdminLogin() {
  const loginScreen = document.getElementById("adminLogin");
  const loginForm = document.getElementById("adminLoginForm");
  const passwordInput = document.getElementById("adminPassword");

  const { data: { session } } = await sb.auth.getSession();

  if (session) {
    loginScreen.style.display = "none";
    localStorage.setItem(LOGIN_SESSION_KEY, "true");
  } else {
    loginScreen.style.display = "flex";
    localStorage.removeItem(LOGIN_SESSION_KEY);
  }

  loginForm.onsubmit = async (e) => {
    e.preventDefault();

    const password = passwordInput.value;

    const { error } = await sb.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: password
    });

    if (error) {
      passwordInput.value = "";
      alert("كلمة المرور غير صحيحة");
      return;
    }

    localStorage.setItem(LOGIN_SESSION_KEY, "true");
    loginScreen.style.display = "none";
    passwordInput.value = "";
  };
}
function switchView(id){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));document.querySelectorAll('.nav-link[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===id));document.getElementById(id)?.classList.add('active');renderAll()}
document.querySelectorAll('.nav-link[data-view]').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));const id=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);const today=()=>new Date().toISOString().slice(0,10);
function renderAll(){renderBookings();renderWorkers();renderAssignments();renderAttendance();renderTools();renderCustomers();renderFollowups();renderContracts();renderDashboard()}
function renderDashboard(){document.getElementById('kpiTotal').textContent=bookings.length;document.getElementById('kpiNew').textContent=bookings.filter(x=>x.status==='جديد').length;document.getElementById('kpiWorkers').textContent=workers.length;document.getElementById('kpiFollow').textContent=bookings.filter(x=>x.followUp&&x.followUp>=today()).length;const latest=[...bookings].slice(-5).reverse();document.getElementById('latestBookings').innerHTML=latest.length?'<div class="mini-list">'+latest.map(x=>`<div class="mini-row"><b>${esc(x.name)}</b><span>${esc(x.service)}</span><small>${esc(x.status||'جديد')}</small></div>`).join('')+'</div>':'<div class="empty">لا توجد طلبات محفوظة حتى الآن.</div>';const counts={};bookings.forEach(x=>counts[x.status||'جديد']=(counts[x.status||'جديد']||0)+1);document.getElementById('statusSummary').innerHTML=Object.entries(counts).map(([k,v])=>`<div><span>${esc(k)}</span><b>${v}</b></div>`).join('')||'<div class="empty">لا توجد بيانات.</div>'}
function renderBookings(){const q=(document.getElementById('searchInput')?.value||'').toLowerCase(),st=document.getElementById('statusFilter')?.value||'';const a=bookings.filter(x=>(!st||x.status===st)&&(!q||[x.name,x.phone,x.service,x.area].join(' ').toLowerCase().includes(q)));document.getElementById('bookingRows').innerHTML=a.length?a.map(x=>`<tr><td>${esc(x.date||'')}</td><td>${esc(x.name)}</td><td><a href="tel:${esc(x.phone)}">${esc(x.phone)}</a></td><td>${esc(x.service)}</td><td>${esc(x.area||'')}</td><td>${esc(x.status||'جديد')}</td><td><button onclick="editBooking('${x.id}')">تعديل</button> <button class="danger" onclick="deleteBooking('${x.id}')">حذف</button></td></tr>`).join(''):'<tr><td colspan="7" class="empty">لا توجد طلبات محفوظة حتى الآن.</td></tr>'}
function openNewBooking(){const f=document.getElementById('editForm');f.reset();f.elements.id.value='';document.getElementById('dialogTitle').textContent='طلب جديد';document.getElementById('bookingDialog').showModal()}
function editBooking(i){const x=bookings.find(x=>x.id===i);if(!x)return;const f=document.getElementById('editForm');Object.keys(x).forEach(k=>{if(f.elements[k])f.elements[k].value=x[k]??''});document.getElementById('dialogTitle').textContent='تعديل الطلب';document.getElementById('bookingDialog').showModal()}
function deleteBooking(i){if(confirm('حذف هذا الطلب؟')){bookings=bookings.filter(x=>x.id!==i);save(KEYS.bookings,bookings);renderAll()}}
document.getElementById('editForm').onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));d.id=d.id||id();d.date=bookings.find(x=>x.id===d.id)?.date||today();const n=bookings.findIndex(x=>x.id===d.id);if(n>=0)bookings[n]=d;else bookings.push(d);save(KEYS.bookings,bookings);document.getElementById('bookingDialog').close();renderAll()};
const configs={workers:{title:'عامل',key:'workers',fields:[['name','الاسم','text'],['phone','الهاتف','tel'],['role','الوظيفة','text'],['status','الحالة','select','متاح|في مهمة|إجازة'],['notes','ملاحظات','text']]},assignments:{title:'تكليف',key:'assignments',fields:[['date','التاريخ','date'],['worker','العامل','text'],['task','المهمة','text'],['location','الموقع','text'],['status','الحالة','select','جديد|قيد التنفيذ|مكتمل']]},attendance:{title:'حضور',key:'attendance',fields:[['date','التاريخ','date'],['worker','العامل','text'],['in','الحضور','time'],['out','الانصراف','time'],['notes','ملاحظات','text']]},tools:{title:'تسليم أدوات',key:'tools',fields:[['date','التاريخ','date'],['worker','العامل','text'],['tool','الأداة','text'],['qty','الكمية','number'],['status','الحالة','select','مُسلّم|مُعاد|تالف']]}};let genericType='',genericId='';
function openGeneric(type,itemId=''){genericType=type;genericId=itemId;const c=configs[type],arr=eval(type),x=arr.find(y=>y.id===itemId)||{};document.getElementById('genericTitle').textContent=itemId?'تعديل '+c.title:'إضافة '+c.title;document.getElementById('genericFields').innerHTML=c.fields.map(([n,l,t,opts])=>`<label>${l}${t==='select'?`<select name="${n}">${opts.split('|').map(o=>`<option ${x[n]===o?'selected':''}>${o}</option>`).join('')}</select>`:`<input name="${n}" type="${t}" value="${esc(x[n]||(t==='date'?today():''))}" ${n==='name'||n==='worker'||n==='task'||n==='tool'?'required':''}>`}</label>`).join('');document.getElementById('genericDialog').showModal()}
function openWorker(i=''){openGeneric('workers',i)}function openAssignment(i=''){openGeneric('assignments',i)}function openAttendance(i=''){openGeneric('attendance',i)}function openTool(i=''){openGeneric('tools',i)}
document.getElementById('genericForm').onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));d.id=genericId||id();let arr=eval(genericType),n=arr.findIndex(x=>x.id===d.id);if(n>=0)arr[n]=d;else arr.push(d);save(KEYS[genericType],arr);document.getElementById('genericDialog').close();renderAll()};
function delGeneric(type,i){if(!confirm('حذف هذا السجل؟'))return;let arr=eval(type).filter(x=>x.id!==i);if(type==='workers')workers=arr;if(type==='assignments')assignments=arr;if(type==='attendance')attendance=arr;if(type==='tools')tools=arr;save(KEYS[type],arr);renderAll()}
function renderWorkers(){document.getElementById('workerRows').innerHTML=workers.length?workers.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.phone)}</td><td>${esc(x.role)}</td><td>${esc(x.status)}</td><td>${esc(x.notes)}</td><td><button onclick="openWorker('${x.id}')">تعديل</button> <button class="danger" onclick="delGeneric('workers','${x.id}')">حذف</button></td></tr>`).join(''):'<tr><td colspan="6" class="empty">لا توجد بيانات.</td></tr>'}
function renderAssignments(){document.getElementById('assignmentRows').innerHTML=assignments.length?assignments.map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(x.worker)}</td><td>${esc(x.task)}</td><td>${esc(x.location)}</td><td>${esc(x.status)}</td><td><button onclick="openAssignment('${x.id}')">تعديل</button> <button class="danger" onclick="delGeneric('assignments','${x.id}')">حذف</button></td></tr>`).join(''):'<tr><td colspan="6" class="empty">لا توجد بيانات.</td></tr>'}
function renderAttendance(){document.getElementById('attendanceRows').innerHTML=attendance.length?attendance.map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(x.worker)}</td><td>${esc(x.in)}</td><td>${esc(x.out)}</td><td>${esc(x.notes)}</td><td><button onclick="openAttendance('${x.id}')">تعديل</button> <button class="danger" onclick="delGeneric('attendance','${x.id}')">حذف</button></td></tr>`).join(''):'<tr><td colspan="6" class="empty">لا توجد بيانات.</td></tr>'}
function renderTools(){document.getElementById('toolRows').innerHTML=tools.length?tools.map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(x.worker)}</td><td>${esc(x.tool)}</td><td>${esc(x.qty)}</td><td>${esc(x.status)}</td><td><button onclick="openTool('${x.id}')">تعديل</button> <button class="danger" onclick="delGeneric('tools','${x.id}')">حذف</button></td></tr>`).join(''):'<tr><td colspan="6" class="empty">لا توجد بيانات.</td></tr>'}
function renderCustomers(){const m={};bookings.forEach(x=>{const k=x.phone||x.name;if(!m[k])m[k]={name:x.name,phone:x.phone,count:0};m[k].count++;m[k].service=x.service;m[k].status=x.status});document.getElementById('customerRows').innerHTML=Object.values(m).map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.phone)}</td><td>${x.count}</td><td>${esc(x.service)}</td><td>${esc(x.status)}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">لا توجد بيانات.</td></tr>'}
function renderFollowups(){const a=bookings.filter(x=>x.followUp||x.warranty);document.getElementById('followRows').innerHTML=a.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.service)}</td><td>${esc(x.followUp)}</td><td>${esc(x.warranty)}</td><td>${esc(x.status)}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">لا توجد متابعات.</td></tr>'}
function renderContracts(){const a=bookings.filter(x=>Number(x.quote)>0);document.getElementById('contractRows').innerHTML=a.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.service)}</td><td>${esc(x.quote)}</td><td>${esc(x.status)}</td><td>${esc(x.id)}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">لا توجد عروض أو عقود مسجلة.</td></tr>'}
function csv(){const rows=[['التاريخ','العميل','الهاتف','الخدمة','المنطقة','الحالة'],...bookings.map(x=>[x.date,x.name,x.phone,x.service,x.area,x.status])];const blob=new Blob(['\ufeff'+rows.map(r=>r.map(v=>'"'+String(v||'').replaceAll('"','""')+'"').join(',')).join('\n')],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='kamlin-bookings.csv';a.click();URL.revokeObjectURL(a.href)}
document.getElementById('exportBookings').onclick=csv;document.getElementById('clearBookings').onclick=()=>{if(confirm('هل تريد حذف كل الطلبات؟')){bookings=[];save(KEYS.bookings,bookings);renderAll()}};document.getElementById('searchInput').oninput=renderBookings;document.getElementById('statusFilter').onchange=renderBookings;
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>document.getElementById(b.dataset.close).close());document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d)d.close()}));document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('dialog[open]').forEach(d=>d.close())});
async function logout() {
  await sb.auth.signOut();
  localStorage.removeItem(LOGIN_SESSION_KEY);
  window.location.reload();
}

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", logout);
}
initAdminLogin();renderAll();
