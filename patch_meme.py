import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

start = js.find('function renderMemeFeed()')
end = js.find('\nfunction renderCalendar', start)

new_fn = r"""function renderMemeFeed() {
  const monthPrefix = `${calendarYear}-${String(calendarMonth+1).padStart(2,'0')}`;
  const monthIssues = allIssues.filter(date => date.startsWith(monthPrefix));

  let monthlyItems = [];
  monthIssues.forEach(dateStr => {
    const dayData = db[dateStr];
    if (dayData.meme_trends) {
      dayData.meme_trends.forEach(item => {
        if (!item.date && !item.time) item.date = dateStr;
        monthlyItems.push(item);
      });
    }
  });

  monthlyItems.sort((a, b) => {
    const da = a.date || a.time || '';
    const db2 = b.date || b.time || '';
    return db2.localeCompare(da);
  });

  const container = document.getElementById('meme-feed-container');
  if (!container) return;

  if (monthlyItems.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-en">NO TRENDS</div><div class="empty-cn">本月暂无社媒情报</div><div class="empty-line"></div></div>';
    return;
  }

  function stripEmoji(str) {
    return (str || '').replace(/[\u{1F300}-\u{1FFFF}|\u{2600}-\u{27BF}]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD00-\uDFFF]/gu, '').trim();
  }

  container.innerHTML = monthlyItems.map((item, index) => {
    const dateText = item.date || item.time || '';
    const srcText = (item.source || 'MEME TREND HUNTER').toUpperCase();

    const trendsHtml = (item.meme_trends || []).map((trend, i) => {
      const trendName = stripEmoji(trend.trend_name || '');
      const hotness   = stripEmoji((trend.hotness || '').replace(/\(.*?\)/g, '').trim());
      const aiQ       = stripEmoji(trend.ai_question || '');
      const trendUrl  = trend.url || '#';
      const trendDate = trend.publish_date || '';
      const gameTag   = trend.game || '';

      return `
        <div class="meme-trend-item" style="animation:cardEnter 0.5s cubic-bezier(0.2,0.8,0.2,1) both;animation-delay:${(index * 0.1) + (i * 0.07)}s;">
          <div class="meme-trend-header">
            <div>
              ${gameTag ? `<span class="meme-game-tag">${gameTag}</span>` : ''}
              <h4 class="meme-trend-title"><a href="${trendUrl}" target="_blank">${trendName}</a></h4>
            </div>
            <div class="meme-trend-right">
              <span class="meme-hotness">${hotness}</span>
              <span class="meme-date">${trendDate}</span>
            </div>
          </div>
          <div class="meme-trend-ai">
            <span class="ai-label">INSIGHT</span>
            <p>${aiQ}</p>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="meme-issue-block" style="animation:fadeIn 0.4s ease both;animation-delay:${index * 0.1}s;">
        <div class="meme-issue-meta">
          <span class="meta-tag">社媒情报站</span>
          <span>《${srcText}》</span>
          <span>·</span>
          <span>${dateText}</span>
        </div>
        <div class="meme-trends-list">${trendsHtml}</div>
      </div>`;
  }).join('');
}
"""

js = js[:start] + new_fn + js[end:]

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)

print('Done: renderMemeFeed updated — removed TREND index, added game tag, removed duplicate h3 title')

