(function () {
  const burger = document.querySelector('[data-burger]');
  const mobile = document.querySelector('[data-mobile-menu]');

  if (burger && mobile) {
    burger.addEventListener('click', () => {
      const open = mobile.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    mobile.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      mobile.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    });
  }
})();
