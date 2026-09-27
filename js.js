// mobile menu toggle
const burger = document.getElementById('burger');
const menu = document.getElementById('mobileMenu');
if (burger && menu) {
  burger.addEventListener('click', () => {
    menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
  });
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { menu.style.display = 'none'; }));
}

// scroll reveal
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// highlight active nav link
const here = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a').forEach(a => {
  if (a.getAttribute('href') === here) a.classList.add('active');
});


// dark mode toggle (persisted)
(function(){
  const saved = localStorage.getItem('dr-theme');
  if(saved === 'dark') document.documentElement.setAttribute('data-theme','dark');
  function sync(){
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.querySelectorAll('[data-toggle-theme] .tt-label').forEach(l=>l.textContent = dark ? 'Light' : 'Dark');
  }
  document.querySelectorAll('[data-toggle-theme]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      if(dark){ document.documentElement.removeAttribute('data-theme'); localStorage.setItem('dr-theme','light'); }
      else { document.documentElement.setAttribute('data-theme','dark'); localStorage.setItem('dr-theme','dark'); }
      sync();
    });
  });
  sync();
})();
