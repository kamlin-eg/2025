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
