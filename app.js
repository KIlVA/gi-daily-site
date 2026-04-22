let db = {};
let currentData = null;
let allIssues = [];
let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth();

let globalReleases = [];

document.addEventListener('DOMContentLoaded', () => {
  Promise.all([
    fetch('data/database.json?t=' + Date.now()).then(r => r.json()),
    fetch('data/releases_calendar.json?t=' + Date.now()).then(r => r.json()).catch(() => [])
  ]).then(([dbData, releasesData]) => {
    db = dbData;
    
    if (releasesData && releasesData.length > 0) {
        globalReleases = releasesData;
    } else {
        const releaseMap = new Map();
        Object.keys(db).forEach(dateStr => {
          if (!dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return;
          const issue = db[dateStr];
          if (issue.releases && Array.isArray(issue.releases)) {
            issue.releases.forEach(r => {
              if (r && r.title && r.date) {
                const key = r.title + '|' + r.date;
                releaseMap.set(key, r);
              }
            });
          }
        });
        globalReleases = Array.from(releaseMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    }
    
    allIssues = Object.keys(db).filter(k => k.match(/^\d{4}-\d{2}-\d{2}$/)).sort().reverse();
    if (allIssues.length > 0) {
      initIssueSelector();
      loadIssue(allIssues[0]);
    }
    initNavigation();

    const platFilter = document.getElementById('platform-filter');
    if (platFilter) {
      platFilter.addEventListener('change', (e) => {
        currentPlatformFilter = e.target.value;
        renderCalendar(calendarYear, calendarMonth);
      });
    }

    const backToTop = document.getElementById('back-to-top');
    if (backToTop) {
      window.addEventListener('scroll', () => {
        if (window.scrollY > 500) {
          backToTop.style.display = 'block';
        } else {
          backToTop.style.display = 'none';
        }
      });
      backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    setTimeout(() => {
      const loader = document.getElementById('global-loader');
      if (loader) {
        loader.style.opacity = '0';
        loader.style.transition = 'opacity 0.4s ease';
        setTimeout(() => loader.style.display = 'none', 400);
      }
    }, 200);
  }).catch(err => {
    console.error("Data load error:", err);
    const loader = document.getElementById('global-loader');
    if (loader) {
      loader.innerHTML = '<div style="text-align:center;line-height:2;"><span style="font-size:24px;color:#ef4444;">⚠️ 加载失败</span><br>请不要双击打开 HTML 文件<br>请双击运行 <b style="color:#60A5FA;">start_website.bat</b> 来启动本地服务器。</div>';
    }
  });
});

let currentPlatformFilter = 'all';

function initIssueSelector() {
  const sel = document.getElementById('issue-selector');
  if(!sel) return;
  sel.innerHTML = allIssues.map(date => `<option value="${date}">VOL.${db[date].vol} | ${date}</option>`).join('');
  sel.addEventListener('change', (e) => {
    loadIssue(e.target.value);
  });
}

function loadIssue(dateStr) {
  currentData = db[dateStr];
  if (!currentData) return;
  
  // Sync selector
  const sel = document.getElementById('issue-selector');
  if(sel) sel.value = dateStr;

  const hot = currentData.ticker || currentData.hotlist || [];
  if (hot.length > 0) {
    document.getElementById('ticker-inner').innerHTML = '<span class="live-dot"></span> LIVE <span>|</span> ' + hot.join(' <span>|</span> ');
  }

  const metaEl = document.getElementById('hero-meta');
  if(metaEl) metaEl.textContent = currentData.date + ' / ' + currentData.weekday;
  
  const volEl = document.getElementById('hero-vol');
  if(volEl) volEl.textContent = currentData.vol;
  
  if(currentData.hero) {
    const titleEl = document.getElementById('hero-title');
    if(titleEl) titleEl.innerHTML = currentData.hero.title || '';
    
    const summaryEl = document.getElementById('hero-summary');
    if(summaryEl) summaryEl.innerHTML = currentData.hero.summary || '';
    
    const tagsEl = document.getElementById('hero-tags');
    if(tagsEl && currentData.hero.tags) {
        tagsEl.innerHTML = currentData.hero.tags.map(t => {
            const cleanTag = t.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\p{Emoji_Presentation}/gu, '').trim();
            return `<span class="tag">${cleanTag}</span>`;
        }).join('');
    } else if(tagsEl) {
        tagsEl.innerHTML = '';
    }
  }

  const d = new Date(currentData.date);
  calendarYear = d.getFullYear();
  calendarMonth = d.getMonth();
  renderCalendar(calendarYear, calendarMonth);
  
  // Render Home Feed
  renderHomeFeed();

  // Refresh active tab if it's feed
  const activeNav = document.querySelector('.nav-item.active');
  if(activeNav) {
      const pageId = activeNav.getAttribute('data-page');
      if (pageId === 'feed') {
         const cat = activeNav.getAttribute('data-cat');
         renderFeed(cat);
      } else if (pageId === 'meme') {
         renderMemeFeed();
      }
  }
}

function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      el.classList.add('active');
      
      const pageId = el.getAttribute('data-page');
      document.querySelectorAll('.page').forEach(p => {p.style.display = 'none'; p.classList.remove('active')});
      const activePage = document.getElementById('page-' + pageId);
      if(activePage) {
          activePage.style.display = 'block';
          activePage.classList.remove('active');
          void activePage.offsetWidth;
          activePage.classList.add('active');
      }
      
      if (pageId === 'feed') {
        const cat = el.getAttribute('data-cat');
        const ftText = el.textContent;
        document.getElementById('feed-title').innerHTML = ftText.replace(/([A-Za-z\s]+)$/, '<span class="en-part">$1</span>');
        renderFeed(cat);
      } else if (pageId === 'releases') {
        renderCalendar(calendarYear, calendarMonth);
      } else if (pageId === 'meme') {
        renderMemeFeed();
      }
    });
  });
  
  document.getElementById('cal-prev').addEventListener('click', () => {
    calendarMonth--;
    if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
    renderCalendar(calendarYear, calendarMonth);
    refreshActiveCategoryTab();
  });
  document.getElementById('cal-next').addEventListener('click', () => {
    calendarMonth++;
    if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
    renderCalendar(calendarYear, calendarMonth);
    refreshActiveCategoryTab();
  });
}

function refreshActiveCategoryTab() {
  const activeNav = document.querySelector('.nav-item.active');
  if(activeNav) {
      if(activeNav.getAttribute('data-page') === 'feed') {
          const ftText = activeNav.textContent;
          document.getElementById('feed-title').innerHTML = ftText.replace(/([A-Za-z\s]+)$/, '<span class="en-part">$1</span>');
          renderFeed(activeNav.getAttribute('data-cat'));
      } else if (activeNav.getAttribute('data-page') === 'meme') {
          renderMemeFeed();
      }
  }
}

// ── Tag-structured body formatter ──────────────────────────────────────────
// Transforms inline [品牌动作]/[社媒反馈]/[商业思考] tags into clean sections.
const BODY_TAG_CONFIG = {
  '品牌动作': { en: 'BRAND', cls: 'body-tag-brand' },
  '社媒反馈': { en: 'SOCIAL', cls: 'body-tag-social' },
  '商业思考': { en: 'INSIGHT', cls: 'body-tag-insight' },
};
const BODY_TAG_RE = /\[(品牌动作|社媒反馈|商业思考)\]/;

function formatBodyWithTags(body) {
  if (!body || !BODY_TAG_RE.test(body)) return { html: body || '', hasStructure: false };

  // Split on tag boundaries, keeping the tag as start of each part
  const parts = body.split(/(?=\[(?:品牌动作|社媒反馈|商业思考)\])/);
  let html = '<div class="body-tagged">';

  parts.forEach(part => {
    const m = part.match(/^\[(品牌动作|社媒反馈|商业思考)\]([\s\S]*)/);
    if (m) {
      const tagName = m[1];
      const content = m[2].trim();
      const cfg = BODY_TAG_CONFIG[tagName] || { en: tagName.toUpperCase(), cls: 'body-tag-default' };
      html += `<div class="body-tag-section ${cfg.cls}">` +
        `<div class="body-tag-label"><span class="tag-cn">${tagName}</span><span class="tag-en">${cfg.en}</span></div>` +
        `<p class="body-tag-text">${content}</p>` +
        `</div>`;
    } else if (part.trim()) {
      html += `<p class="body-tag-intro">${part.trim()}</p>`;
    }
  });

  html += '</div>';
  return { html, hasStructure: true };
}
// ────────────────────────────────────────────────────────────────────────────

function generateCardHtml(item, index, defaultDate) {
  let imgSrc = item.image;
  const hasImg = imgSrc && typeof imgSrc === 'string' && imgSrc.startsWith('http');
  const bg = hasImg ? `style="background-image:url('${imgSrc}')"` : '';
  const noImgClass = hasImg ? '' : 'no-img';
  
  const firstCharMatch = (item.title || 'Game').match(/[\u4e00-\u9fa5]/);
  const char = firstCharMatch ? firstCharMatch[0] : 'G';
  const placeholder = hasImg ? '' : `<div class="placeholder-char">${char}</div>`;

  const tagText = item.type || item.region || '快讯';
  const srcText = item.source || 'GAME INDUSTRY DAILY';
  const dateText = item.date || item.time || defaultDate;

  const rawBody = item.body || item.summary || '';
  const { html: bodyHtml, hasStructure } = formatBodyWithTags(rawBody);
  const bodyClass = hasStructure ? 'card-body card-body--tagged' : 'card-body';

  const impactText = item.social_metric || item.business_impact;
  const impactLabel = item.social_metric ? 'SOCIAL' : 'IMPACT';
  // When the body already has structured tags, the social/impact info is shown
  // inline — suppress the footer badge to avoid duplication.
  const impact = (impactText && !hasStructure) ? `<div class="business-impact"><strong>${impactLabel}</strong><span>${impactText}</span></div>` : '';

  const urlStr = item.url ? `<a href="${item.url}" target="_blank" style="color:inherit;text-decoration:none">${item.title}</a>` : item.title;

  return `
    <div class="news-card" style="animation: cardEnter 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both; animation-delay: ${index * 0.08}s;">
      <div class="news-card-img ${noImgClass}" ${bg}>
        ${placeholder}
      </div>
      <div class="news-card-content">
        <div class="card-meta">
          <span class="meta-tag">${tagText}</span>
          <span>《${srcText}》</span>
          <span>·</span>
          <span>${dateText}</span>
        </div>
        <h3 class="card-title">${urlStr}</h3>
        <div class="${bodyClass}">${bodyHtml}</div>
        <div class="card-footer">
          ${impact}
          <a href="${item.url||'#'}" target="_blank" class="read-more-link">READ FULL STORY ↗</a>
        </div>
      </div>
    </div>
  `;
}

function renderHomeFeed() {
  const container = document.getElementById('home-feed-container');
  if(!container) return;
  
  let allItems = [];
  const keys = ['news', 'markets_and_rivals', 'marketing', 'growth_and_campaigns', 'events', 'macro_and_rules'];
  keys.forEach(k => {
      if(currentData[k]) allItems = allItems.concat(currentData[k]);
  });
  
  if (allItems.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-en">NO UPDATES</div><div class="empty-cn">今日暂无快讯</div><div class="empty-line"></div></div>';
    return;
  }
  
  let html = `<div class="feed-header" style="margin-top: 16px; margin-bottom: 64px; border-bottom: 3px solid #111827; padding-bottom: 12px;">
                <h2 style="font-family: var(--font-serif); font-size: 28px; font-weight: 900; letter-spacing: -0.02em; color:#111827;">今日全部快讯 <span style="font-size:12px; font-family:var(--font-mono); color:var(--text-muted); font-weight:bold; margin-left:12px; letter-spacing: 0.05em; text-transform: uppercase;">TODAY'S UPDATES</span></h2>
              </div>`;
  html += `<div class="feed-list" style="display:flex; flex-direction:column; gap:0;">` + allItems.map((item, i) => generateCardHtml(item, i, currentData.date)).join('') + `</div>`;
  
  container.innerHTML = html;
}

function renderFeed(category) {
  // Category tab mapping for old/new keys
  const legacyMap = {
      'news': ['news', 'markets_and_rivals'],
      'events': ['events', 'macro_and_rules'],
      'marketing': ['marketing', 'growth_and_campaigns']
  };
  const targetKeys = legacyMap[category] || [category];
  
  const monthPrefix = `${calendarYear}-${String(calendarMonth+1).padStart(2,'0')}`;
  const monthIssues = allIssues.filter(date => date.startsWith(monthPrefix));
  
  let monthlyItems = [];
  monthIssues.forEach(dateStr => {
      const dayData = db[dateStr];
      let dayItems = [];
      targetKeys.forEach(k => {
          if(dayData[k]) dayItems = dayItems.concat(dayData[k]);
      });
      dayItems.forEach(item => {
          if(!item.date && !item.time) item.date = dateStr;
      });
      monthlyItems = monthlyItems.concat(dayItems);
  });
  
  monthlyItems.sort((a,b) => {
      const da = a.date || a.time || '';
      const db = b.date || b.time || '';
      return db.localeCompare(da);
  });

  const container = document.getElementById('news-feed-container');
  if (monthlyItems.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-en">NO UPDATES</div><div class="empty-cn">本月该类目暂无更新</div><div class="empty-line"></div></div>';
    return;
  }
  
  container.innerHTML = monthlyItems.map((item, i) => generateCardHtml(item, i, item.date)).join('');
}

function renderMemeFeed() {
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
        <div class="meme-issue-meta" style="display:none;">
            <span class="meta-tag">社媒情报站</span>
            <span>《${srcText}》</span>
            <span>·</span>
            <span>${dateText}</span>
          </div>
        <div class="meme-trends-list">${trendsHtml}</div>
      </div>`;
  }).join('');
}

function renderCalendar(year, month) {
  const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  const calMonthEl = document.getElementById('cal-month');
  if (calMonthEl) calMonthEl.textContent = year + '年 ' + MONTHS[month];

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let cells = '';
  for (let i = 0; i < firstDay; i++) cells += '<div class="day empty"></div>';

  const monthPrefix = `${year}-${String(month+1).padStart(2,'0')}`;
  
  // Highlighting days that have an ISSUE (not just releases)
  const issueDates = new Set(allIssues);
  const selDate = currentData ? currentData.date : '';

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${monthPrefix}-${String(d).padStart(2,'0')}`;
    const isIssue = issueDates.has(dateStr);
    const isSelected = dateStr === selDate;
    
    let cls = 'day';
    if(isIssue) cls += ' has-issue';
    if(isSelected) cls += ' selected-day';
    
    cells += `<div class="${cls}" data-date="${dateStr}">${d}</div>`;
  }
  
  const calGridEl = document.getElementById('cal-grid');
  if (calGridEl) {
    calGridEl.innerHTML = cells;
    
    calGridEl.onclick = (e) => {
      if (e.target.classList.contains('has-issue')) {
        const targetDate = e.target.getAttribute('data-date');
        loadIssue(targetDate);
        
        // Jump back to home page if not already there
        const homeNav = document.querySelector('.nav-item[data-page="home"]');
        if(homeNav && !homeNav.classList.contains('active')) {
          homeNav.click(); 
        }

        setTimeout(() => {
          const feedSection = document.querySelector('.home-feed-section');
          if (feedSection) {
            feedSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    };
  }
  
  // Render Releases for the Releases Page
  const container = document.getElementById('releases-feed');
  if(!container) return;

  const allReleases = globalReleases || [];
  const rels = [];
  allReleases.forEach(r => {
      if(r && r.date && r.date.startsWith(monthPrefix)) {
          let platsStr = JSON.stringify(r.platforms || []).toLowerCase();
          if (currentPlatformFilter === 'all') {
              rels.push(r);
          } else if (currentPlatformFilter === 'Mobile' && (platsStr.includes('ios') || platsStr.includes('android') || platsStr.includes('mobile'))) {
              rels.push(r);
          } else if (platsStr.includes(currentPlatformFilter.toLowerCase())) {
              rels.push(r);
          }
      }
  });

  if (allReleases.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-en">NO RELEASES</div><div class="empty-cn">暂无定档信息</div><div class="empty-line"></div></div>';
    return;
  }
  
  if(rels.length === 0) {
     container.innerHTML = '<div class="empty-state"><div class="empty-en">NO RELEASES</div><div class="empty-cn">本月暂无定档信息</div><div class="empty-line"></div></div>';
     return;
  }
  
  container.innerHTML = rels.map(r => {
    let plats = r.platforms || [];
    if (typeof plats === 'string') {
      if (plats.startsWith('[')) plats = plats.replace(/[\[\]']/g, '').split(',').map(s => s.trim());
      else plats = plats.split('/').map(s => s.trim());
    }
    const platsHtml = plats.map(p => `<span>${p}</span>`).join('');
    const devHtml = r.developer ? `<div class="rel-dev">${r.developer}</div>` : '';
    
    const engMonths = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const mIndex = parseInt(r.date.split('-')[1]) - 1;
    const monStr = engMonths[mIndex] || (mIndex + 1 + '月');

    return `
    <div class="release-item" id="release-${r.date}" style="transition: background-color 0.5s;">
      <div class="rel-date">
        <div class="day">${r.date.split('-')[2]}</div>
        <div class="month">${monStr}</div>
      </div>
      <div class="rel-content">
        <div class="rel-title">${r.title}</div>
        <div class="rel-plats">${platsHtml}</div>
        ${devHtml}
      </div>
    </div>
  `}).join('');
}
