/* GA4: public pageviews and contact-link clicks; never read form or auth data. */
(() => {
  'use strict';
  const script = document.currentScript;
  if (!script) return;
  const config = script.dataset;
  const id = config.measurementId;
  if (!/^G-[A-Z0-9]+$/.test(id || '') || location.hostname !== config.hostname ||
      window.__healimAnalyticsInitialized || navigator.globalPrivacyControl ||
      navigator.doNotTrack === '1' || window.doNotTrack === '1' ||
      window['ga-disable-' + id]) return;
  window.__healimAnalyticsInitialized = true;

  // Collapse private inquiry/review paths and unknown URLs to section-level pages.
  // Keep public disease and column paths, without query strings or fragments.
  const path = location.pathname;
  const section = path.split('/').filter(Boolean)[0] || 'home';
  const publicSections = new Set(['conditions', 'blog', 'areas', 'location', 'philosophy',
    'guide', 'privacy', 'fees']);
  const pagePath = path === '/' ? '/' : publicSections.has(section) &&
    /^\/[a-z0-9\/-]+$/.test(path) ? path :
    ['inquiry', 'reviews'].includes(section) ? '/' + section + '/' : '/other/';
  let referrer = '';
  try {
    // Attribution only needs the referring origin, not the caller's private URL.
    referrer = new URL(document.referrer).origin;
  } catch (_) { /* Direct visit or invalid referrer. */ }
  const options = {
    send_page_view: false,
    page_location: location.origin + pagePath,
    page_referrer: referrer,
    page_title: '해아림한의원 분당점 | ' + (publicSections.has(section) ? section :
      ['home', 'inquiry', 'reviews'].includes(section) ? section : 'other'),
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_expires: 60 * 60 * 24 * 90
  };
  // Preserve known AI source tags without sending arbitrary campaign/search text.
  const source = new URLSearchParams(location.search).get('utm_source');
  const aiSources = new Set(['chatgpt', 'chatgpt.com', 'perplexity', 'perplexity.ai',
    'claude', 'claude.ai', 'gemini', 'gemini.google.com', 'copilot', 'copilot.microsoft.com']);
  if (source && aiSources.has(source.toLowerCase())) {
    options.campaign_source = source.toLowerCase();
    options.campaign_medium = 'referral';
  }
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', {
    ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'
  });
  window.gtag('js', new Date());
  window.gtag('config', id, options);
  window.gtag('event', 'page_view', { send_to: id });

  const tag = document.createElement('script');
  tag.async = true;
  tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
  document.head.appendChild(tag);

  const phone = 'tel:' + config.phone.replace(/[^0-9+]/g, '');
  const naver = new URL(config.naverUrl);
  const kakao = new URL(config.kakaoUrl);
  const normalizePath = value => value.replace(/\/$/, '');
  document.addEventListener('click', event => {
    const link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (!link || event.defaultPrevented || link.closest('[data-nosnippet]')) return;
    let url;
    try { url = new URL(link.href, location.href); } catch (_) { return; }
    let name;
    if (url.protocol === 'tel:' && 'tel:' + url.pathname.replace(/[^0-9+]/g, '') === phone) {
      name = 'phone_click';
    } else if (url.origin === naver.origin && normalizePath(url.pathname) === normalizePath(naver.pathname)) {
      name = 'naver_booking_click';
    } else if (url.origin === kakao.origin && [normalizePath(kakao.pathname),
      normalizePath(kakao.pathname) + '/chat'].includes(normalizePath(url.pathname))) {
      name = 'kakao_click';
    }
    if (!name) return;
    const placement = link.closest('.floating-quick-bar') ? 'floating_bar' :
      link.closest('.clinic-visit-summary') ? 'visit_summary' :
      link.closest('.modal-opt-card') ? 'contact_modal' : 'page_content';
    window.gtag('event', name, { send_to: id, contact_placement: placement });
    // Never cancel navigation, await GA, or infer a completed call/booking.
  }, true);
})();
