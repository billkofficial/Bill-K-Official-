(() => {
  const menu = document.querySelector('.menu');
  const nav = document.querySelector('.nav');
  const year = document.getElementById('year');

  if (year) year.textContent = new Date().getFullYear();

  const setMenu = (open) => {
    if (!menu || !nav) return;
    nav.classList.toggle('open', open);
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    document.body.classList.toggle('menu-open', open);
  };

  menu?.addEventListener('click', () => {
    setMenu(!nav.classList.contains('open'));
  });

  document.querySelectorAll('.nav a').forEach(link => {
    link.addEventListener('click', () => setMenu(false));
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) setMenu(false);
  });
})();