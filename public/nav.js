/* OpenFactory — shared nav bar with EN/ZH toggle */
(function () {
  var links = [
    { href: '/', en: 'Home', zh: '首页' },
    { href: '/lio-ready.html', en: 'Lio Integration', zh: 'Lio对接' },
    { href: '/agent.html', en: 'API Demo', zh: 'API演示' },
    { href: '/factories.html', en: 'Factories', zh: '工厂目录' },
    { href: '/onboard.html', en: 'List Factory', zh: '工厂入驻' }
  ];

  function getLang() {
    return localStorage.getItem('lang') || 'en';
  }

  function applyLang(lang) {
    document.querySelectorAll('[data-en]').forEach(function(el) {
      el.innerHTML = lang === 'zh' ? el.getAttribute('data-zh') : el.getAttribute('data-en');
    });
    document.querySelectorAll('[data-placeholder-en]').forEach(function(el) {
      el.placeholder = lang === 'zh' ? el.getAttribute('data-placeholder-zh') : el.getAttribute('data-placeholder-en');
    });
  }
  window.applyLang = applyLang;

  function render() {
    var lang = getLang();
    var path = location.pathname;

    // Remove existing nav
    var old = document.querySelector('nav');
    if (old) old.remove();

    // Build nav
    var nav = document.createElement('nav');
    nav.id = 'of-nav';

    // Left — logo
    var logo = document.createElement('a');
    logo.href = '/';
    logo.className = 'of-nav-logo';
    logo.textContent = '\u{1F3ED} OpenFactory';

    // Center — links
    var center = document.createElement('div');
    center.className = 'of-nav-links';
    links.forEach(function (l) {
      var a = document.createElement('a');
      a.href = l.href;
      a.textContent = lang === 'zh' ? l.zh : l.en;
      a.className = 'of-nav-link';
      var match = path === l.href || (l.href !== '/' && path.startsWith(l.href));
      if (l.href === '/' && path === '/') match = true;
      if (l.href === '/' && path === '/index.html') match = true;
      if (match) a.classList.add('active');
      center.appendChild(a);
    });

    // Right — lang toggle + GitHub
    var right = document.createElement('div');
    right.className = 'of-nav-right';

    var toggle = document.createElement('button');
    toggle.className = 'of-nav-lang';
    toggle.textContent = lang === 'zh' ? 'EN' : '中文';
    toggle.onclick = function () {
      localStorage.setItem('lang', lang === 'zh' ? 'en' : 'zh');
      render();
    };

    var gh = document.createElement('a');
    gh.href = 'https://github.com/fengweit/OpenFactory';
    gh.target = '_blank';
    gh.className = 'of-nav-gh';
    gh.title = 'GitHub';
    gh.innerHTML = '<svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';

    right.appendChild(toggle);
    right.appendChild(gh);

    nav.appendChild(logo);
    nav.appendChild(center);
    nav.appendChild(right);

    // Insert as first child of body
    document.body.insertBefore(nav, document.body.firstChild);
    document.body.style.paddingTop = '52px';

    applyLang(lang);
  }

  // Inject styles once
  var style = document.createElement('style');
  style.textContent =
    '#of-nav{position:fixed;top:0;left:0;right:0;height:52px;background:#0a0a0a;border-bottom:1px solid #1e1e1e;display:flex;align-items:center;justify-content:space-between;padding:0 24px;z-index:1000;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}' +
    '.of-nav-logo{font-weight:700;font-size:15px;color:#e5e5e5;text-decoration:none;white-space:nowrap}' +
    '.of-nav-logo:hover{color:#fff}' +
    '.of-nav-links{display:flex;gap:2px;align-items:center}' +
    '.of-nav-link{color:#888;font-size:13px;padding:5px 12px;border-radius:6px;text-decoration:none;transition:color .15s,background .15s;white-space:nowrap}' +
    '.of-nav-link:hover{color:#e5e5e5;background:#1e1e1e}' +
    '.of-nav-link.active{color:#c4b5fd;background:#1a1025}' +
    '.of-nav-right{display:flex;align-items:center;gap:10px}' +
    '.of-nav-lang{background:#1e1e1e;color:#ccc;border:1px solid #333;padding:3px 10px;border-radius:5px;font-size:12px;cursor:pointer;white-space:nowrap}' +
    '.of-nav-lang:hover{background:#2a2a2a;color:#fff}' +
    '.of-nav-gh{color:#888;display:flex;align-items:center}' +
    '.of-nav-gh:hover{color:#e5e5e5}';
  document.head.appendChild(style);

  // Render on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
