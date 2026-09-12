const STORAGE_KEY = "kamlin_bookings_v2";

function getBookings(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}
function saveBookings(items){ localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }

function createBooking(data){
  const items = getBookings();
  const ref = "KML-" + Date.now().toString().slice(-8);
  const item = {
    id: ref,
    createdAt: new Date().toISOString(),
    name: data.name || "",
    phone: data.phone || "",
    service: data.service || "",
    area: data.area || "",
    notes: data.notes || "",
    status: "جديد",
    assignedTo: "",
    followUp: "",
    quote: "",
    warranty: "",
    source: "الموقع"
  };
  items.unshift(item);
  saveBookings(items);
  return item;
}

function validPhone(phone){ return String(phone).replace(/\D/g,"").length >= 10; }

function bindForm(id,statusId){
  const form=document.getElementById(id), status=document.getElementById(statusId);
  if(!form) return;
  form.addEventListener("submit", e=>{
    e.preventDefault();
    const data=Object.fromEntries(new FormData(form).entries());
    if(!validPhone(data.phone)){
      status.className="form-status error";
      status.textContent="يرجى إدخال رقم هاتف صحيح.";
      return;
    }
    const item=createBooking(data);
    status.className="form-status success";
    status.textContent=`تم استلام الطلب بنجاح. رقم الطلب: ${item.id}`;
    form.reset();
  });
}
bindForm("quickBooking","quickStatus");
bindForm("bookingForm","bookingStatus");

function bookService(service){
  const select=document.getElementById("serviceSelect");
  if(select) select.value=service;
  document.getElementById("booking")?.scrollIntoView({behavior:"smooth"});
}
function toggleMenu(){ document.getElementById("mainNav")?.classList.toggle("open"); }
document.getElementById("year").textContent=new Date().getFullYear();

// Public pricing always comes from Supabase, never this browser's localStorage.
const publicPriceClient = window.supabase?.createClient(
  "https://hxphmxkimjxngsrlxcjn.supabase.co",
  "sb_publishable_V-vK8enWv_NNYbigWPSkhA_gq-D8s0t",
  {auth: {persistSession: false, autoRefreshToken: false, detectSessionInUrl: false}}
);
let publicPricesLoading = false;
async function refreshPublicPrices() {
  if (publicPricesLoading) return;
  publicPricesLoading = true;
  const status = document.getElementById('publicPricesStatus');
  const button = document.getElementById('retryPricesBtn');
  button.disabled = true;
  try {
    if (!publicPriceClient) throw new Error('Supabase is unavailable');
    const {data, error} = await publicPriceClient.from('site_settings').select('value').eq('key', 'prices').abortSignal(AbortSignal.timeout(15000)).maybeSingle();
    if (error) throw error;
    let displayed = 0;
    document.querySelectorAll('[data-price]').forEach(element => {
      const value = data?.value?.[element.dataset.price];
      const valid = (typeof value === 'number' || typeof value === 'string') && String(value).trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;
      element.textContent = valid ? new Intl.NumberFormat('ar-EG', {maximumFractionDigits: 2}).format(Number(value)) + ' ج.م' : 'تواصل معنا لمعرفة السعر';
      if (valid) displayed++;
    });
    status.textContent = displayed ? 'الأسعار الحالية للخدمات والباقات.' : 'الأسعار غير متاحة حاليًا. تواصل معنا للحصول على عرض سعر.';
  } catch (error) {
    console.error('Public prices unavailable', error);
    document.querySelectorAll('[data-price]').forEach(element => element.textContent = 'تواصل معنا لمعرفة السعر');
    status.textContent = 'تعذر تحميل الأسعار الآن. أعد المحاولة أو تواصل معنا.';
  } finally {
    publicPricesLoading = false;
    button.disabled = false;
  }
}
document.getElementById('retryPricesBtn').addEventListener('click', refreshPublicPrices);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshPublicPrices(); });
window.addEventListener('online', refreshPublicPrices);
setInterval(() => { if (!document.hidden) refreshPublicPrices(); }, 60000);
refreshPublicPrices();
