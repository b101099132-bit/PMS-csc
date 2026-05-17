# `_shared/` — 衛教共用資源

這個資料夾放所有 `edu/` 衛教 HTML 共用的基底資源,**不是給病人看的內容**。

底線開頭 `_shared` 是工程慣例,代表「基礎建設、非內容」。

## 檔案清單

| 檔名 | 用途 |
|------|------|
| `edu-base.css` | 所有衛教 HTML 共用的基底樣式(色彩、字型、版型、卡片、提示框) |
| `_template.html` | 新衛教的範本檔。寫新篇時複製這個檔改內容即可 |
| `README.md` | 本檔 |

## 在新衛教檔內怎麼用

在每個 `edu-x-x.html` 的 `<head>` 中加入:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@500;600;700&family=Noto+Sans+TC:wght@400;500;600&display=swap" rel="stylesheet">

<link rel="stylesheet" href="_shared/edu-base.css">
```

接著就能直接使用 `.lead` / `.card` / `.callout` / `.section-title` / `.divider` 等預定義的元件,
不必重複定義基本樣式。

## 設計 token (CSS variables)

`edu-base.css` 暴露了完整的色彩、字型、邊距 token,任何頁面都可以用 `var(--token-name)`:

| Token | 值 | 用途 |
|---|---|---|
| `--cream` | `#FAF7F2` | 頁面背景 |
| `--paper` | `#FFFFFF` | 卡片底色 |
| `--ink` / `--ink-soft` / `--ink-faint` | 黑灰階 | 內文顏色 |
| `--teal` / `--teal-tint` / `--teal-soft` | 鴨綠系 | 主色:醫療穩重感 |
| `--gold` / `--gold-soft` | 金棕 | 副色:重點與強調 |
| `--border` / `--border-strong` | 邊框灰 | 卡片邊框 |
| `--highlight-bg` / `--caution-bg` | 暖黃 | 提示框背景 |
| `--safe` | `#4A7A5A` | 綠色(安全 / 良好) |
| `--danger` | `#B85450` | 紅色(警告 / 危險) |
| `--font-serif` / `--font-sans` | Noto 字型 | 中文襯線 / 黑體 |
| `--radius-sm` / `--radius-md` | `3px` / `4px` | 圓角 |
| `--container-w` | `680px` | 主容器寬度 |

如果單篇衛教需要不同的主色,可以在自己的 `<style>` 內重新覆蓋:

```css
:root {
  --teal: #4A7A5A;  /* 本篇用綠色而非鴨綠 */
}
```

## 修改基底樣式的注意事項

⚠️ **改 `edu-base.css` 會同步影響所有 ~49 個衛教 HTML**。

建議流程:
1. 改動前在分支或本機測試(至少打開 3 個不同類型的衛教 HTML,看版面有沒有被改壞)
2. 改動內容用 commit message 寫清楚(例:「edu-base.css: 把 callout 的金棕色加深 5% 提高對比度」)
3. 推到 main 後,GitHub Pages 約 1-2 分鐘會自動部署

## 寫新衛教的步驟

1. 把 `_template.html` 複製為 `../{章}-{號}-{slug}.html`(例:`6-1-icu-preview.html`)
2. 把檔案內 `【...】` 標示處全部換成實際內容
3. `git add` → `git commit` → `git push`
4. 在「衛教內容庫」工作表新增一列,填入編號、標題、階段、距手術日、URL、啟用 = TRUE
