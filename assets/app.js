document.addEventListener("DOMContentLoaded", () => {

  const config = window.KAMLIN_CONFIG || {};

  // بيانات الشركة
  document.querySelectorAll("[data-company-name]").forEach(el => {
    el.textContent = config.companyName || "كاملين للنظافة الفائقة";
  });

  document.querySelectorAll("[data-phone]").forEach(el => {
    el.textContent = config.phoneDisplay || "+20 103 043 8805";
    el.href = "tel:" + (config.phone || "+201030438805");
  });

  document.querySelectorAll("[data-whatsapp]").forEach(el => {
    el.textContent = config.whatsappDisplay || "+20 101 042 0272";
    const number = (config.whatsapp || "+201010420272").replace(/\D/g, "");
    el.href = "https://wa.me/" + number;
  });

  document.querySelectorAll("[data-email]").forEach(el => {
    el.textContent = config.email || "kamlin.eg2025@gmail.com";
    el.href = "mailto:" + (config.email || "kamlin.eg2025@gmail.com");
  });

  // فتح وإغلاق القائمة في الموبايل
  const menuBtn = document.querySelector(".menu-btn");
  const nav = document.querySelector(".nav");

  if (menuBtn && nav) {
    menuBtn.addEventListener("click", () => {
      nav.classList.toggle("open");
    });
  }

  // إغلاق القائمة بعد اختيار قسم
  document.querySelectorAll(".nav a").forEach(link => {
    link.addEventListener("click", () => {
      if (nav) nav.classList.remove("open");
    });
  });

  // حركة ظهور العناصر
  const revealElements = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.12
    });

    revealElements.forEach(el => observer.observe(el));
  } else {
    revealElements.forEach(el => el.classList.add("visible"));
  }

  // عدادات الأرقام
  document.querySelectorAll("[data-count]").forEach(counter => {
    const target = Number(counter.dataset.count);

    if (!Number.isFinite(target)) return;

    let current = 0;
    const step = Math.max(1, Math.ceil(target / 50));

    const timer = setInterval(() => {
      current += step;

      if (current >= target) {
        current = target;
        clearInterval(timer);
      }

      counter.textContent = current;
    }, 30);
  });

  // السنة الحالية
  document.querySelectorAll("[data-year]").forEach(el => {
    el.textContent = new Date().getFullYear();
  });

});