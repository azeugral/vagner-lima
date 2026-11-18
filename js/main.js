(() => {
  const WA = '351965489781';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- língua ---------- */
  const LANGS = { pt: 'pt-PT', de: 'de', en: 'en' };
  let lang = 'pt';
  try {
    const q = new URLSearchParams(location.search).get('lang');
    const s = localStorage.getItem('vl-lang');
    const nav = (navigator.language || 'pt').slice(0, 2);
    lang = (q in LANGS && q) || (s in LANGS && s) || (nav in LANGS ? nav : 'en');
  } catch (e) {}
  const t = k => (T[lang] && T[lang][k]) || T.pt[k] || k;
  function aplica(l) {
    lang = l;
    document.documentElement.lang = LANGS[l];
    document.title = t('title');
    $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
    $$('.lang button').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === l));
    try { localStorage.setItem('vl-lang', l); } catch (e) {}
    if (lbAberto()) legenda();
  }
  $$('.lang button').forEach(b => b.addEventListener('click', () => aplica(b.dataset.lang)));

  /* ---------- hero: cobertura em tinta ---------- */
  const pecas = $$('#janela .peca');
  let atual = 0, tk = 0;
  function mostra(i) {
    const nova = pecas[i];
    tk = tk % 3 + 1;
    nova.classList.remove('t2', 't3', 'entra');
    void nova.offsetWidth;
    nova.classList.add('entra');
    if (tk > 1) nova.classList.add('t' + tk);
    nova.addEventListener('animationend', function fim() {
      nova.removeEventListener('animationend', fim);
      pecas.forEach(p => { if (p !== nova) p.classList.remove('vis', 'entra', 't2', 't3'); });
      nova.classList.add('vis'); nova.classList.remove('entra', 't2', 't3');
    });
    atual = i;
  }
  if (pecas.length) {
    const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduz) pecas[0].classList.add('vis');
    else {
      mostra(0);
      setInterval(() => { if (!document.hidden) mostra((atual + 1) % pecas.length); }, 5000);
    }
  }

  /* ---------- trabalhos ---------- */
  const grade = $('#grade'), mais = $('#mais');
  let OBRAS = [], filtro = '*', limite = 24, visiveis = [];
  const TEMA = { ret: 'f.ret', ani: 'f.ani', fec: 'f.fec', cav: 'f.cav' };
  function desenha() {
    const lista = OBRAS.filter(o => filtro === '*' || o.t === filtro);
    visiveis = lista.slice(0, limite);
    grade.innerHTML = '';
    visiveis.forEach((o, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', t(TEMA[o.t]) + (o.c ? ' · ' + t('cover') : ''));
      b.innerHTML = `<img src="img/obras/${o.id}-720.webp" alt="" width="720" height="900" draggable="false">`;
      b.addEventListener('click', () => abre(i));
      grade.appendChild(b);
    });
    mais.hidden = lista.length <= limite;
  }
  fetch('js/obras.json').then(r => r.json()).then(j => { OBRAS = j; desenha(); });
  $$('.filtros button').forEach(b => b.addEventListener('click', () => {
    $$('.filtros button').forEach(x => x.classList.toggle('ativo', x === b));
    filtro = b.dataset.f; limite = 24; desenha();
  }));
  mais.addEventListener('click', () => { limite += 24; desenha(); });

  /* ---------- lightbox ---------- */
  const lb = $('#lb'), lbimg = $('#lbimg');
  let idx = 0;
  const lbAberto = () => lb && !lb.hidden;
  function legenda() {
    const o = visiveis[idx];
    $('#lbcap').textContent = t(TEMA[o.t]) + (o.c ? ' · ' + t('cover') : '');
  }
  function abre(i) {
    idx = i;
    const o = visiveis[idx];
    lbimg.src = `img/obras/${o.id}-1440.webp`;
    lbimg.alt = t(TEMA[o.t]);
    legenda();
    lb.hidden = false; document.body.style.overflow = 'hidden';
    $('#lbx').focus();
  }
  function fecha() { lb.hidden = true; document.body.style.overflow = ''; }
  const passa = d => abre((idx + d + visiveis.length) % visiveis.length);
  $('#lbx').addEventListener('click', fecha);
  $('#lbp').addEventListener('click', () => passa(-1));
  $('#lbn').addEventListener('click', () => passa(1));
  lb.addEventListener('click', e => { if (e.target === lb) fecha(); });
  addEventListener('keydown', e => {
    if (!lbAberto()) return;
    if (e.key === 'Escape') fecha();
    if (e.key === 'ArrowLeft') passa(-1);
    if (e.key === 'ArrowRight') passa(1);
  });
  let x0 = null;
  lb.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) passa(dx < 0 ? 1 : -1);
    x0 = null;
  });
  $('#lbq').addEventListener('click', () => {
    const o = visiveis[idx];
    const f = $('#form');
    const r = f.querySelector(`input[name=tema][value="${o.t}"]`); if (r) r.checked = true;
    if (o.c) f.querySelector('input[name=cover][value=sim]').checked = true;
    const nome = t(TEMA[o.t]) + ' (' + o.id + ')';
    f.ideia.value = t('msg.peca').replace('{t}', nome);
    fecha();
    $('#marcar').scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => f.nome.focus({ preventScroll: true }), 700);
  });

  /* ---------- formulário → WhatsApp ---------- */
  const form = $('#form');
  const txt = (sel) => { const el = form.querySelector(sel); return el ? el.textContent.trim() : ''; };
  form.addEventListener('submit', e => {
    e.preventDefault();
    const nome = form.nome.value.trim();
    const campo = form.nome.closest('.campo'), erro = campo.querySelector('.erro');
    if (!nome) { erro.hidden = false; campo.classList.add('invalido'); form.nome.focus(); return; }
    erro.hidden = true; campo.classList.remove('invalido');
    const tema = form.querySelector('input[name=tema]:checked');
    const cover = form.querySelector('input[name=cover]:checked').value === 'sim';
    const linhas = [
      t('msg.ola').replace('{n}', nome), '',
      `*${t('msg.tema')}:* ${t('c.' + tema.value)}`,
      `*${t('msg.cover')}:* ${cover ? t('c.sim') : t('c.nao2')}`,
      `*${t('msg.cidade')}:* ${form.querySelector('input[name=cidade]:checked').value}`
    ];
    if (form.local.value.trim()) linhas.push(`*${t('msg.local')}:* ${form.local.value.trim()}`);
    linhas.push(`*${t('msg.tam')}:* ${form.tamanho.selectedOptions[0].textContent.trim()}`);
    linhas.push(`*${t('msg.disp')}:* ${form.disp.selectedOptions[0].textContent.trim()}`);
    if (form.ideia.value.trim()) linhas.push(`*${t('msg.ideia')}:* ${form.ideia.value.trim()}`);
    linhas.push('', t('msg.site'));
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(linhas.join('\n'))}`, '_blank', 'noopener');
  });
  form.nome.addEventListener('input', () => {
    if (form.nome.value.trim()) { form.nome.closest('.campo').classList.remove('invalido'); form.querySelector('.erro').hidden = true; }
  });

  /* ---------- entrada ao rolar ---------- */
  const alvos = $$('.sec h2, .sec .lead, .filtros, .provas .prova, .sobre-foto, .sobre-txt, .cidade, .passos li, .form');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('on'); io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    alvos.forEach(a => { a.classList.add('ent'); io.observe(a); });
  }

  aplica(lang);
})();
