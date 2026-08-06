const header = document.getElementById('site-header');
  window.addEventListener('scroll', () => {
    header.classList.toggle('solid', window.scrollY > 40);
  });

  const burger = document.querySelector('.burger');
  const nav = document.querySelector('nav');
  burger?.addEventListener('click', () => {
    const open = nav.style.display === 'block';
    nav.style.display = open ? 'none' : 'block';
    if(!open){
      nav.style.position='absolute';
      nav.style.top='100%';
      nav.style.left='0';
      nav.style.right='0';
      nav.style.background='rgba(18,16,13,.98)';
      nav.style.padding='24px 28px';
      nav.querySelector('ul').style.flexDirection='column';
      nav.querySelector('ul').style.gap='20px';
    }
  });
