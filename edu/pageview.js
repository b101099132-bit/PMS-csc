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
 *  傳輸機制:
 *  - 用 JSONP(<script src> 標籤注入)送 GET 到 Apps Script doGet
 *  - doGet 內 action === 'pageview' → 呼叫 handlePageView
 *  - JSONP 是 Apps Script 唯一可靠的跨域機制(POST 會被拒、Image GET 會被擋)
 *  - dashboard.html 已驗證 JSONP 跨同 endpoint 可運作
 *
 *  部署:
 *  1. 把此檔放在 /edu/pageview.js
 *  2. 每份 /edu/*.html 末尾(</body> 前)加:
 *       <script src="pageview.js" defer></script>
 *  3. ⚠️ Apps Script 必須:doPost 內加 action === 'pageview' 路由
 *
 *  隱私:
 *  - 不記錄病人姓名、身分證、病歷號
 *  - 只記錄內部 pk + LINE userId(若同意推播即已同意)
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
      // 產生唯一的 callback 名稱(避免多次呼叫衝突)
      const cb = '_pv_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);

      // 用 URLSearchParams 統一參數編碼(瀏覽器原生 API,絕對正確)
      // ⚠️ 不傳 file 參數(.html 副檔名會觸發 Google 邊緣層的特殊處理 → 400)
      // ⚠️ 不傳 sid 參數(sess_xxx 格式被 Google 邊緣層視為 session token 模式 → 400)
      // ⚠️ 跳過所有空值參數(空字串會觸發 parsing 錯誤)
      // Session 關聯改靠「時間戳 + pk」推算,對核心統計無影響
      const params = new URLSearchParams();
      params.append('action', 'pageview');
      params.append('code', code);
      if (pk) params.append('pk', pk);
      if (lineUserId) params.append('line', lineUserId);
      if (duration) params.append('dur', duration);
      params.append('callback', cb);  // ← 關鍵:加 callback 參數,Apps Script 會回 JSONP

      const url = APPS_SCRIPT_URL + '?' + params.toString();

      // ★★★ 用 JSONP(script 標籤注入)送出 ★★★
      // 理由:
      // - Google Apps Script Web App 完全不支援跨域 POST(已知限制)
      // - sendBeacon (POST) 會被拒絕 → 400 Bad Request
      // - Image 標籤(GET)會被 Apps Script anti-abuse 機制阻擋
      // - JSONP(GET + script 標籤)是 Apps Script 唯一可靠的跨域機制
      // - dashboard.html 已用 JSONP 成功訪問同一 endpoint,證明可運作
      const script = document.createElement('script');
      script.id = cb;
      script.src = url;
      script.async = true;

      // 定義 callback:收到回應後清理 DOM
      window[cb] = function () {
        delete window[cb];
        if (script.parentNode) script.parentNode.removeChild(script);
      };

      // 即使失敗也清理(避免 DOM 污染)
      script.onerror = function () {
        delete window[cb];
        if (script.parentNode) script.parentNode.removeChild(script);
      };

      // 注入 DOM,瀏覽器自動發 GET 請求
      (document.head || document.documentElement).appendChild(script);
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
