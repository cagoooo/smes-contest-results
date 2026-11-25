"""把競賽 Excel（「頒獎」工作表格式）轉成網站用 JSON，並在轉檔當下完成姓名去識別化。

用法：python tools/build_data.py <excel路徑> <輸出json> --id <競賽代號> --title <標題> [--sheet 頒獎]
原始 Excel 含學生全名，請勿放進這個 repo（.gitignore 已排除 *.xlsx）。
"""
import argparse, json, pathlib, re, sys
import openpyxl

sys.stdout.reconfigure(encoding="utf-8")

RANK_TEXT = {1: "第一名", 2: "第二名", 3: "第三名", 4: "第四名", 5: "第五名"}
LEVEL_ORDER = {"特優": 1, "優等": 2, "甲等": 3, "佳作": 4}

def mask(name: str) -> str:
    """三字以上：保留頭尾、中間改○；兩字：最後一字改○。"""
    n = re.sub(r"\s+", "", str(name))
    if len(n) <= 1:
        return n
    if len(n) == 2:
        return n[0] + "○"
    return n[0] + "○" * (len(n) - 2) + n[-1]

def group_of(title: str) -> str:
    if "英語" in title:
        return "英語文"
    if "台語" in title or "臺語" in title or "閩語" in title or "客語" in title or "原住民" in title:
        return "本土語文"
    return "國語文"

def is_title(v):
    return isinstance(v, str) and v.strip() not in ("班級", "姓名", "名次", "") and "年級" in v

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("xlsx"); ap.add_argument("out")
    ap.add_argument("--id", required=True); ap.add_argument("--title", required=True)
    ap.add_argument("--sheet", default="頒獎"); ap.add_argument("--published", required=True)
    ap.add_argument("--subtitle", default="")
    a = ap.parse_args()

    ws = openpyxl.load_workbook(a.xlsx, data_only=True)[a.sheet]
    items = []
    for row in ws.iter_rows():
        for c in row:
            if not is_title(c.value):
                continue
            title = c.value.strip().replace("演講", "演說")
            r, col = c.row + 1, c.column
            results = []
            while r <= ws.max_row:
                cls = ws.cell(r, col).value
                if is_title(cls):
                    break
                name = ws.cell(r, col + 1).value
                award = ws.cell(r, col + 2).value
                if isinstance(cls, (int, float)) and name:
                    if isinstance(award, (int, float)):
                        award_text, order = RANK_TEXT.get(int(award), f"第{int(award)}名"), int(award)
                    else:
                        award_text = str(award).strip(); order = LEVEL_ORDER.get(award_text, 9)
                    results.append({"cls": str(int(cls)), "name": mask(name), "award": award_text, "order": order})
                r += 1
            m = re.match(r"(.+?年級)(.+)", title)
            grade, event = (m.group(1), m.group(2)) if m else ("", title)
            results.sort(key=lambda x: (x["order"], x["cls"]))
            items.append({"title": title, "grade": grade, "event": event,
                          "group": group_of(title), "results": results})

    # 套用人工更正（data/corrections.json；只用去識別化姓名比對）
    corr = pathlib.Path(__file__).resolve().parent.parent / "data" / "corrections.json"
    if corr.exists():
        for fx in json.load(open(corr, encoding="utf-8")).get("fixes", []):
            hit = False
            for it in items:
                if it["title"] != fx["item"]:
                    continue
                for r in it["results"]:
                    if r["name"] == fx["name"] and r["cls"] == fx["cls_from"]:
                        r["cls"] = fx["cls_to"]; hit = True
                it["results"].sort(key=lambda x: (x["order"], x["cls"]))
            print(("已套用更正：" if hit else "⚠️ 找不到要更正的資料：") + f'{fx["item"]} {fx["name"]} {fx["cls_from"]}→{fx["cls_to"]}')

    data = {"id": a.id, "title": a.title, "subtitle": a.subtitle,
            "published": a.published, "items": items}
    with open(a.out, "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, ensure_ascii=False, indent=2); f.write("\n")
    done = [i for i in items if i["results"]]
    print(f"已公布 {len(done)} 項、待公布 {len(items)-len(done)} 項、得獎 {sum(len(i['results']) for i in done)} 人次")
    for i in items:
        print(" ", i["title"], len(i["results"]), [x["name"] for x in i["results"]])

if __name__ == "__main__":
    main()
