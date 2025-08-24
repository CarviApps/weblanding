// Utilidad: smooth scroll para links internos
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length > 1) {
      e.preventDefault();
      document.querySelector(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // cerrar menú móvil después de navegar
      navList.classList.remove('show');
      menuBtn.setAttribute('aria-expanded', 'false');
    }
  });
});

// Menú móvil
const menuBtn = document.getElementById('menuBtn');
const navList = document.getElementById('nav-menu');
menuBtn?.addEventListener('click', () => {
  const expanded = menuBtn.getAttribute('aria-expanded') === 'true';
  menuBtn.setAttribute('aria-expanded', String(!expanded));
  navList.classList.toggle('show');
});

// Toggle modo claro/oscuro (respeta preferencia del sistema)
const modeToggle = document.getElementById('modeToggle');
const root = document.documentElement;
const savedTheme = localStorage.getItem('carvi-theme');
if (savedTheme === 'dark') root.classList.add('dark');
modeToggle?.addEventListener('click', () => {
  root.classList.toggle('dark');
  localStorage.setItem('carvi-theme', root.classList.contains('dark') ? 'dark' : 'light');
});

// Espera de email (demo sin backend)
const form = document.getElementById('waitlistForm');
const msg = document.getElementById('formMsg');
form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = (document.getElementById('email') || {}).value?.trim();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    msg.textContent = 'Por favor, ingresá un email válido.';
    msg.style.color = '#cc3d3d';
    return;
  }
  // Guardamos en localStorage a modo demo
  const current = JSON.parse(localStorage.getItem('carvi-waitlist') || '[]');
  current.push({ email, ts: Date.now() });
  localStorage.setItem('carvi-waitlist', JSON.stringify(current));
  msg.textContent = '¡Gracias! Te avisaremos cuando lancemos en tu zona.';
  msg.style.color = 'inherit';
  form.reset();
});

// KPI de CO2 (contador simple de ejemplo)
const co2El = document.getElementById('co2Saved');
let co2 = 0;
const inc = () => {
  co2 += Math.random() * 0.4 + 0.2; // entre 0.2 y 0.6 kg
  co2El.textContent = co2.toFixed(1);
  if (co2 < 128) requestAnimationFrame(() => setTimeout(inc, 40));
};
inc();

// Año del footer
document.getElementById('year').textContent = new Date().getFullYear();
