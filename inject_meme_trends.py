import json
import sys
import os

def main():
    if len(sys.argv) < 2:
        print("Usage: python inject_meme_trends.py <json_file_path>")
        sys.exit(1)

    json_file = sys.argv[1]
    
    try:
        with open(json_file, "r", encoding="utf-8-sig") as f:
            new_item = json.load(f)
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}")
        sys.exit(1)

    db_path = os.path.join("data", "database.json")
    with open(db_path, "r", encoding="utf-8") as f:
        db = json.load(f)

    # 找到最近更新的一天
    dates = sorted([k for k in db.keys() if k.count("-") == 2])
    if not dates:
        print("No dates found in database.json")
        sys.exit(1)
        
    latest_date = dates[-1]
    print(f"Injecting into latest date: {latest_date}")

    if "meme_trends" not in db[latest_date]:
        db[latest_date]["meme_trends"] = []

    # 去重
    db[latest_date]["meme_trends"] = [
        item for item in db[latest_date]["meme_trends"] 
        if item.get("type") != "社媒情报站"
    ]

    # 放入最前列
    db[latest_date]["meme_trends"].insert(0, new_item)

    with open(db_path, "w", encoding="utf-8") as f:
        json.dump(db, f, ensure_ascii=False, indent=2)

    print("Success! Meme trend injected to meme_trends array.")

if __name__ == "__main__":
    main()
