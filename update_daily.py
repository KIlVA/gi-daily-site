import json
import os
import sys
import urllib.request
from urllib.parse import urljoin
import re
from concurrent.futures import ThreadPoolExecutor, as_completed

DATA_DIR = 'data'
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

def fetch_og_image(item):
    """自动抓取新闻网页中的 og:image 首图，并在后端完成 URL 清洗"""
    url = item.get("url", "")
    if not url or "image" in item or not url.startswith("http"): 
        return item
        
    print(f"   📸 并发提取图片: {item.get('title', '')[:15]}...")
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        html = urllib.request.urlopen(req, timeout=8).read().decode('utf-8', errors='ignore')
        
        match = re.search(r'<meta[^>]*property=["\']og:image["\'][^>]*content=["\']([^"\']+)["\']', html, re.IGNORECASE)
        if not match:
            match = re.search(r'<meta[^>]*content=["\']([^"\']+)["\'][^>]*property=["\']og:image["\']', html, re.IGNORECASE)
            
        if match:
            img_url = match.group(1).replace('&amp;', '&')
            # 🛠️ 优化点 1：把前端的 url 补全逻辑移到后端
            if img_url.startswith('//'):
                img_url = 'https:' + img_url
            elif img_url.startswith('/'):
                img_url = urljoin(url, img_url)
                
            item["image"] = img_url
            print(f"      -> 成功: {item['image'][:30]}...")
    except Exception as e:
        # 🛠️ 优化点 2：捕获所有异常，防止线程假死
        print(f"      -> 提取失败 ({url[:30]}...): {str(e)[:30]}")
        pass
    return item

def clean_item_data(item):
    """清洗单条新闻数据，防止前端出现乱码或需要正则替换的情况"""
    # 清洗业务影响前缀（如 🔥 热度: ）
    if "business_impact" in item and isinstance(item["business_impact"], str):
        impact = item["business_impact"]
        impact = re.sub(r'^(🔥 热度:\s*.*?\|?\s*📢 阵地:\s*|🔥 热度: 高 &nbsp;\|&nbsp; 📢 阵地: )', '', impact)
        item["business_impact"] = impact.strip()
        
    # 清洗发售平台的脏数据，将字符串统一处理为列表
    if "platforms" in item and isinstance(item["platforms"], str):
        plats_str = item["platforms"]
        if plats_str.startswith('['):
            plats = re.sub(r'[\[\]\']', '', plats_str).split(',')
        else:
            plats = plats_str.split('/')
        item["platforms"] = [p.strip() for p in plats if p.strip()]
        
    return item

def merge_global_releases(database):
    """盘点合并全局发售日历，并独立输出为单独的 JSON 文件供前端轻量级读取"""
    all_releases = {}
    for date_str, issue in database.items():
        for r in issue.get("releases", []):
            if "title" in r: 
                all_releases[r["title"] + r.get("date", "")] = r
                
    merged = list(all_releases.values())
    merged.sort(key=lambda x: x.get("date", "9999-99-99"))
    
    # 🛠️ 优化点 3：独立分离发售日历，避免前端全量遍历 database
    releases_file = os.path.join(DATA_DIR, 'releases_calendar.json')
    with open(releases_file, 'w', encoding='utf-8') as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)
        
    print(f"📅 全局发售日历已独立生成至 {releases_file}，共 {len(merged)} 款")
    return merged

def load_flexible_json(file_path):
    """自动清理大模型输出的 Markdown 标记 (`json)"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read().strip()
    
    if content.startswith("```"):
        content = re.sub(r'^```(?:json)?\n?', '', content)
        content = re.sub(r'\n?```$', '', content)
    elif content.startswith("`"):
        content = re.sub(r'^`(?:json)?\n?', '', content)
        content = re.sub(r'\n?`$', '', content)
        
    return json.loads(content)

def process_batch(json_file_path):
    print(f"🔍 读取数据: {json_file_path}")
    try:
        batch_data = load_flexible_json(json_file_path)
    except Exception as e:
        print(f"❌ JSON解析失败: {e}")
        return

    db_file = os.path.join(DATA_DIR, 'database.json')
    database = {}
    if os.path.exists(db_file):
        try:
            with open(db_file, 'r', encoding='utf-8') as f:
                database = json.load(f)
        except Exception as e:
            print(f"读取 database.json 失败: {e}")

    for date_str, daily_content in batch_data.items():
        if not isinstance(daily_content, dict) or "hero" not in daily_content:
            continue 
        
        print(f"\n🚀 处理单日数据: {date_str}")

        # 遍历新闻类别
        list_keys = [k for k, v in daily_content.items() if isinstance(v, list) and k != 'ticker' and k != 'hotlist']
        
        with ThreadPoolExecutor(max_workers=5) as executor:
            for cat in list_keys:
                items = daily_content.get(cat, [])
                if items:
                    items = [clean_item_data(item) for item in items]
                    if cat != "releases":
                        futures = [executor.submit(fetch_og_image, item) for item in items]
                        daily_content[cat] = [future.result() for future in as_completed(futures)]
                    else:
                        daily_content[cat] = items

        database[date_str] = daily_content

    with open(db_file, 'w', encoding='utf-8') as f:
        json.dump(database, f, ensure_ascii=False, indent=2)
        
    merge_global_releases(database)
    
    print(f"\n✅ 网站更新完成！数据已整合到 database.json。")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("💡 用法: python update_daily.py <文件路径>")
        sys.exit(1)
    process_batch(sys.argv[1])
