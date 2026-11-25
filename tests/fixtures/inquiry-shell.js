// Minimal built-shell fixture. The browser-flow regression also uses Hugo output
// when public/inquiry/index.html is available.
export const inquiryShell = `<!doctype html><html><head><link rel="stylesheet" href="/css/style.min.abc123.css"><script>window.HEALIM_CONFIG={SOCIAL_AUTH_DEPLOYED:false};</script></head><body>
<header><a href="/guide/">진료과목</a><button id="btn-header-login" onclick="openAuthModal('login')">로그인</button><div id="header-user-badge" style="display:none"><strong id="logged-user-name">회원</strong></div></header>
<div id="auth-modal"><div id="auth-view-login"></div><div id="auth-view-signup"></div><div id="auth-view-admin"></div><input id="login-email"></div>
<main id="main-content"></main>
<div id="inquiry-reply-editor-modal"><form onsubmit="handleDoctorReplySubmit(event)"><div id="reply-target-summary"></div><textarea id="doctor-reply-textarea"></textarea><button type="submit">답변 등록 및 완료 처리</button></form></div>
<footer>031-716-8575</footer><script src="/js/main.min.abc123.js"></script></body></html>`;
