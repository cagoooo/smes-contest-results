# 石門國小競賽榮譽榜

桃園市龍潭區石門國民小學各項競賽成績公告網站（牛皮紙・水墨書卷風）。

🔗 網站：https://cagoooo.github.io/smes-contest-results/

## 隱私原則

- 學生姓名一律去識別化：三個字以上保留頭尾、中間改「○」；兩個字把最後一個字改「○」。
- **原始成績 Excel 含學生全名，絕對不放進本 repo**（`.gitignore` 已排除 `*.xlsx`）。
- 部署前 GitHub Actions 會執行 `tools/check_privacy.py`，只要有一筆姓名沒遮就停止部署。

## 網站圖示與分享卡片

- `favicon.ico`、`assets/icon-*.png`：用 `python tools/make_icons.py` 重新產生（朱紅印章「榮」字）。
- `assets/og.jpg`（1200×630）：LINE／Facebook 分享卡片，用 `python tools/make_og.py` 重新產生。
- LINE 與 Facebook 會快取分享卡片；換圖後若沒更新，可到 Facebook 分享偵錯工具重新抓取。

## 版本更新提示

- `sw.js` 的版本字串由部署流程自動注入為「`version.json` 版號-commit 前 7 碼」。
- 頁面偵測到新版 Service Worker 時會先比對版本，確定比較新才在下方跳出提示，避免假更新反覆跳出。
- 本機（localhost）預覽時會自動解除 Service Worker，不影響開發。

## 新增一場競賽

1. 把 Excel 整理成「頒獎」工作表的格式（每個項目：標題列「〇年級＋項目」，下方三欄「班級／姓名／名次」）。
2. 轉檔（轉檔當下就去識別化）：

   ```bash
   python tools/build_data.py <Excel路徑> data/<代號>.json --id <代號> --title "<競賽名稱>" --subtitle "<副標>" --published YYYY-MM-DD
   ```

3. 在 `data/contests.json` 加一行 `{ "id": "<代號>", "file": "data/<代號>.json" }`。
4. commit + push 到 `main`，GitHub Actions 自動部署。

5. 把 `version.json` 的 `version` 往上加（例 1.0.1 → 1.0.2），`notes` 寫這次更新了什麼；已經開著網站的人會在下方看到「榮譽榜有新版本」提示，按「立刻更新」就會載入最新成績。

名次欄可填數字（1、2、3 → 第一名、第二名、第三名）或文字（特優、優等、佳作）。沒有得獎資料的項目會顯示在「成績整理中」。

---

Made with ❤️ by [阿凱老師](https://cagoooo.github.io/Akai/)
