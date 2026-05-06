import json
with open('data/database.json', encoding='utf-8') as f:
    db = json.load(f)

for target_date in ['2026-04-29', '2026-04-30', '2026-05-01', '2026-05-02', '2026-05-03']:
    entry = db.get(target_date, {})
    print(f'=== {target_date} IMAGE AUDIT ===')
    for section in ['news', 'marketing', 'events']:
        for i, item in enumerate(entry.get(section, [])):
            img = item.get('image', '')
            flag = 'GCAP' in img or 'SIE-Banner' in img or 'nintendo-switch-21' in img
            status = 'GENERIC' if flag else 'OK'
            print(f'[{status}] [{section}][{i}] {item["title"][:50]}')
            print(f'   {img[:100]}')
    print()
