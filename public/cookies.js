/**
 * Koureo — Cookie info banner (non-blocking).
 *
 * Koureo uses ONLY strictly necessary cookies (auth session, referral code).
 * No analytics, no marketing trackers, no third-party tracking.
 * Per CNIL guidance, strictly necessary cookies do not require consent —
 * but a transparent notice is good practice.
 *
 * Banner shows once per device, stored in localStorage under `koureo_cookie_ack`.
 */
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var STORAGE_KEY = 'koureo_cookie_ack';

  try {
    if (window.localStorage && window.localStorage.getItem(STORAGE_KEY) === '1') return;
  } catch (e) { /* localStorage may be blocked in some browsers */ }

  function inject() {
    if (document.getElementById('koureo-cookie-banner')) return;

    var styleTag = document.createElement('style');
    styleTag.textContent = [
      '#koureo-cookie-banner{',
        'position:fixed;bottom:16px;left:16px;right:16px;max-width:520px;margin:0 auto;',
        'background:#FFFFFF;color:#1A1714;border:1px solid #ECE6DE;border-radius:12px;',
        'padding:14px 16px;display:flex;gap:12px;align-items:center;',
        'box-shadow:0 8px 24px rgba(26,23,20,0.10);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;',
        'font-size:13px;line-height:1.5;z-index:2147483647;animation:koureoCookieIn .25s ease-out;',
      '}',
      '#koureo-cookie-banner p{margin:0;flex:1;color:#5C5751}',
      '#koureo-cookie-banner a{color:#43c4b0;text-decoration:none;font-weight:500}',
      '#koureo-cookie-banner a:hover{text-decoration:underline}',
      '#koureo-cookie-banner button{',
        'background:#43c4b0;color:#FFFFFF;border:0;border-radius:8px;',
        'padding:8px 14px;font:inherit;font-weight:600;cursor:pointer;flex-shrink:0;',
      '}',
      '#koureo-cookie-banner button:hover{background:#2faf9b}',
      '#koureo-cookie-banner button:focus{outline:2px solid #1A1714;outline-offset:2px}',
      '@keyframes koureoCookieIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}',
      '@media (max-width:480px){#koureo-cookie-banner{flex-direction:column;align-items:stretch;text-align:left}#koureo-cookie-banner button{width:100%}}',
    ].join('');
    document.head.appendChild(styleTag);

    var banner = document.createElement('div');
    banner.id = 'koureo-cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Information cookies');
    banner.innerHTML = [
      '<p>Koureo utilise uniquement des cookies techniques nécessaires au fonctionnement (session, préférences). ',
      'Aucun traceur publicitaire. <a href="/privacy">En savoir plus</a></p>',
      '<button type="button" id="koureo-cookie-ok">OK</button>',
    ].join('');
    document.body.appendChild(banner);

    document.getElementById('koureo-cookie-ok').addEventListener('click', function () {
      try { window.localStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
      banner.style.transition = 'opacity .2s ease-out, transform .2s ease-out';
      banner.style.opacity = '0';
      banner.style.transform = 'translateY(8px)';
      setTimeout(function () { banner.remove(); }, 220);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject, { once: true });
  } else {
    inject();
  }
})();
