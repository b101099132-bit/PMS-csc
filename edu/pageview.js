/**
 * ============================================================
 *  ✅  已 部 署 — URL 已 設 定  ✅
 *
 *  Web App URL 已帶入下方 APPS_SCRIPT_URL 常數。
 *  若日後 Apps Script 重新部署為「全新部署」(非編輯既有部署),
 *  Web App URL 會變動,需更新該常數值。
 *
 *  「編輯既有部署 > 新版本」URL 不變,無需修改。
 * ============================================================
 *
 *  心臟加速康復團隊 — 衛教頁面瀏覽追蹤
 *  edu/pageview.js
 * ============================================================
 *
 *  功能:
 *  - 頁面載入時記錄一次「瀏覽」(無停留秒數)
 *  - 離開頁面時記錄一次「離開」(含停留秒數)
 *  - 從 URL 抓取 ?pk=...&line=... 識別病人身分
 *  - 從檔名自動解析單張代號(例:3-1-cabg-comparison.html → "3-1")
 *  - Session ID 串連同一次連續瀏覽的多個單張
 *  - 失敗完全靜默,不影響閱讀
 *
 *  部署:
 *  1. 把此檔放在 /edu/pageview.js
 *  2. 修改下方 APPS_SCRIPT_URL 為你的實際 Web App URL
 *  3. 每份 /edu/*.html 末尾(</body> 前)加:
 *       <script src="pageview.js" defer></script>
 *
 *  隱私:
 *  - 不記錄病人姓名、身分證、病歷號
 *  - 只記錄內部 pk + LINE userId(若同意推播即已同意)
 *  - UA / Referrer 為標準 Web 統計欄位
 * ============================================================
 */

(function () {
  'use strict';

  // ============================================================
  //  ⚠️  部署設定 — 改為你的 Apps Script Web App URL
  // ============================================================
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzr5eDnHyyq2hWZJ1pD4x5z7h8LkabeZMNDcl6o1lWx0e3bE4CLDCkmqYCzPA1qagU2ug/exec';

  // 若 URL 還是 PLACEHOLDER 就不送(避免部署前的測試誤觸發)
  if (APPS_SCRIPT_URL.indexOf('PLACEHOLDER') >= 0) {
    console.warn('[pageview] APPS_SCRIPT_URL 尚未設定,瀏覽紀錄不會被送出');
    return;
  }

  // ============================================================
  //  資料解析
  // ============================================================

  // 從 URL 參數抓 pk 與 line(從 LINE / Email 點進來時會帶)
  const params = new URLSearchParams(window.location.search);
  const pk = params.get('pk') || '';
  const lineUserId = params.get('line') || '';

  // 從檔名解析單張代號(例:"3-1-cabg-comparison.html" → "3-1")
  const filename = window.location.pathname.split('/').pop() || '';
  const code = parseCode(filename);

  function parseCode(fname) {
    if (!fname || fname === 'index.html' || fname === '') return 'index';
    // 抓開頭的「X-Y」或「X-Ya」「X-Yb」這類數字+字母的代號
    const m = fname.match(/^(\d+-\d+[a-z]?)/);
    return m ? m[1] : fname.replace(/\.html$/, '');
  }

  // Session ID(同一個 tab 連續瀏覽多份單張串連)
  let sid;
  try {
    sid = sessionStorage.getItem('eduSid');
    if (!sid) {
      sid = 'sess_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      sessionStorage.setItem('eduSid', sid);
    }
  } catch (e) {
    // 若 sessionStorage 不可用(極少數,如極端隱私模式)
    sid = 'sess_nostorage_' + Math.random().toString(36).slice(2, 8);
  }

  const startTime = Date.now();

  // ============================================================
  //  送出紀錄
  // ============================================================
  function sendPageView(duration) {
    try {
      const qs = [
        'action=pageview',
        'code=' + encodeURIComponent(code),
        'file=' + encodeURIComponent(filename),
        'pk=' + encodeURIComponent(pk),
        'line=' + encodeURIComponent(lineUserId),
        'ua=' + encodeURIComponent(navigator.userAgent.slice(0, 200)),
        'ref=' + encodeURIComponent(document.referrer.slice(0, 200)),
        'dur=' + (duration || ''),
        'sid=' + encodeURIComponent(sid)
      ].join('&');

      const url = APPS_SCRIPT_URL + '?' + qs;

      // ★★★ 用 <img> 像素追蹤(Image beacon)送出 ★★★
      // 理由:這是最簡單、最可靠的跨域 GET 方式,Google Analytics / Facebook Pixel
      // 等所有分析服務 30 年來都用這個技術。
      // - 絕對是 GET 方法,不會 400
      // - 沒有 CORS 限制(image src 是天生允許跨域的)
      // - 沒有 preflight、沒有 sendBeacon 強制 POST 問題
      // - 不會被 ad-blocker 阻擋(因為是合法的 image 載入)
      // - 不需要 fetch、不需要 XHR、不需要任何現代 API
      const img = new Image();
      img.src = url;
      // 即使 Apps Script 回的是 JSON(不是真的圖片),img.onerror 也會觸發,
      // 但「請求已送達」這個事實不變 — 這就是我們要的。
      img.onload = img.onerror = function () { img.src = ''; };
    } catch (e) {
      // 完全靜默,不影響閱讀
    }
  }

  // ============================================================
  //  事件綁定
  // ============================================================

  // 進頁面立即記錄一次(無 duration)
  if (document.readyState === 'complete') {
    sendPageView();
  } else {
    window.addEventListener('load', function () { sendPageView(); });
  }

  // 離開頁面時記錄停留時間
  // 用 visibilitychange + beforeunload 兩個事件(行動裝置 beforeunload 不可靠)
  let leaveSent = false;
  function onLeave() {
    if (leaveSent) return;
    leaveSent = true;
    const duration = Math.round((Date.now() - startTime) / 1000);
    sendPageView(duration);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') onLeave();
  });
  window.addEventListener('pagehide', onLeave);
  window.addEventListener('beforeunload', onLeave);

})();
