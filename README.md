# 石門國小競賽榮譽榜

桃園市龍潭區石門國民小學各項競賽成績公告網站（牛皮紙・水墨書卷風）。

🔗 網站：https://cagoooo.github.io/smes-contest-results/

## 隱私原則

- 學生姓名一律去識別化：三個字以上保留頭尾、中間改「○」；兩個字把最後一個字改「○」。
- **原始成績 Excel 含學生全名，絕對不放進本 repo**（`.gitignore` 已排除 `*.xlsx`）。
- 部署前 GitHub Actions 會執行 `tools/check_privacy.py`，只要有一筆姓名沒遮就停止部署。

## 新增一場競賽

1. 把 Excel 整理成「頒獎」工作表的格式（每個項目：標題列「〇年級＋項目」，下方三欄「班級／姓名／名次」）。
2. 轉檔（轉檔當下就去識別化）：

   ```bash
   python tools/build_data.py <Excel路徑> data/<代號>.json --id <代號> --title "<競賽名稱>" --subtitle "<副標>" --published YYYY-MM-DD
   ```

3. 在 `data/contests.json` 加一行 `{ "id": "<代號>", "file": "data/<代號>.json" }`。
4. commit + push 到 `main`，GitHub Actions 自動部署。

名次欄可填數字（1、2、3 → 第一名、第二名、第三名）或文字（特優、優等、佳作）。沒有得獎資料的項目會顯示在「成績整理中」。

---

Made with ❤️ by [阿凱老師](https://cagoooo.github.io/Akai/)
