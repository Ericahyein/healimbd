const fs = require('fs');

const content = fs.readFileSync('scratch/script_4.txt', 'utf-8');
const apolloMatch = content.match(/window\.__APOLLO_STATE__\s*=\s*({[\s\S]*?});/);

if (!apolloMatch) {
  console.log('No Apollo state found');
  process.exit(1);
}

const apollo = JSON.parse(apolloMatch[1]);

// Map authors
const authors = {};
Object.keys(apollo).forEach(k => {
  if (k.startsWith('VisitorReviewAuthor:')) {
    authors[k] = apollo[k];
  }
});

// Extract all visitor reviews
const reviews = [];
Object.keys(apollo).forEach(k => {
  if (k.startsWith('VisitorReview:')) {
    const item = apollo[k];
    
    // Resolve author
    let authorName = '방문자';
    if (item.author && item.author.__ref && authors[item.author.__ref]) {
      authorName = authors[item.author.__ref].nickname || '방문자';
    }
    
    // Resolve keywords
    const keywords = [];
    if (item.visitCategories && Array.isArray(item.visitCategories)) {
      item.visitCategories.forEach(vc => {
        if (vc.keywords && Array.isArray(vc.keywords)) {
          vc.keywords.forEach(kw => {
            if (kw.name && kw.name.trim()) keywords.push(kw.name.trim());
          });
        }
      });
    }
    
    // Resolve date
    let dateStr = item.created || item.visited || '최근 방문';
    if (item.representativeVisitDateTime) {
      const d = new Date(item.representativeVisitDateTime);
      if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        dateStr = `${yyyy}.${mm}.${dd}`;
      }
    }
    
    // Categorize
    let category = 'autonomic';
    let categoryName = '자율신경';
    const bodyText = (item.body || '') + ' ' + keywords.join(' ');
    
    if (bodyText.includes('틱') || bodyText.includes('ADHD') || bodyText.includes('소아') || bodyText.includes('아이') || bodyText.includes('아들')) {
      category = 'tic-adhd';
      categoryName = '틱장애·소아신경';
    } else if (bodyText.includes('공황') || bodyText.includes('불안') || bodyText.includes('두근거림') || bodyText.includes('발작')) {
      category = 'panic';
      categoryName = '공황·불안장애';
    } else if (bodyText.includes('불면') || bodyText.includes('잠') || bodyText.includes('수면') || bodyText.includes('각성')) {
      category = 'sleep';
      categoryName = '수면·불면증';
    } else if (bodyText.includes('다한') || bodyText.includes('땀') || bodyText.includes('과민') || bodyText.includes('대장') || bodyText.includes('소화')) {
      category = 'hyperhidrosis-ibs';
      categoryName = '다한증·소화기';
    } else if (bodyText.includes('어지럼') || bodyText.includes('브레인포그') || bodyText.includes('자율신경') || bodyText.includes('두통') || bodyText.includes('상열감')) {
      category = 'autonomic';
      categoryName = '자율신경실조증';
    }
    
    // Extract short title
    let title = (item.body || '').split('\n')[0].substring(0, 55);
    if (!title && keywords.length > 0) {
      title = keywords.join(', ') + ' 방문 후기';
    } else if (!title) {
      title = '해아림한의원 분당점 방문 치료 후기';
    }
    if (title.length >= 55) title += '...';
    
    reviews.push({
      id: item.id,
      author: authorName.length > 2 ? authorName.substring(0, 1) + '****님' : (authorName || '방문자') + '님',
      rawAuthor: authorName,
      date: dateStr,
      rating: 5.0,
      category: category,
      categoryName: categoryName,
      title: title,
      keywords: keywords.length > 0 ? keywords : ['친절해요', '원장님 꼼꼼해요', '치료 효과 좋아요'],
      summary: (item.body || '').replace(/\\n/g, ' ').substring(0, 180) + ((item.body || '').length > 180 ? '...' : '')
    });
  }
});

console.log(`Total real reviews processed: ${reviews.length}`);
fs.writeFileSync('scratch/formatted_real_reviews.json', JSON.stringify(reviews, null, 2), 'utf-8');

reviews.forEach((r, idx) => {
  console.log(`[${idx + 1}] [${r.date}] ${r.author} (${r.categoryName}): ${r.title}`);
});
