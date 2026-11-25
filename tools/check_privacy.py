"""發布前防呆：確認 data/ 裡每個姓名都已去識別化（含「○」）。任何一筆沒遮就讓部署失敗。"""
import glob, json, sys
sys.stdout.reconfigure(encoding="utf-8")

bad = []
for path in glob.glob("data/*.json"):
    if path.endswith("contests.json"):
        continue
    data = json.load(open(path, encoding="utf-8"))
    for item in data.get("items", []):
        for r in item.get("results", []):
            if "○" not in r.get("name", ""):
                bad.append(f"{path}｜{item.get('title')}｜{r.get('cls')} 班")
if bad:
    print("以下資料姓名尚未去識別化，停止部署：")
    print("\n".join(bad))
    sys.exit(1)
print("姓名去識別化檢查通過")
