const fs = require('fs');
const path = require('path');

const history = require('../../data/auto_column_history.json');
const { getConditionPageForCategory } = require('./internal_linker');

const BLOG_DIR = path.join(__dirname, '../../content/blog');
const KNOWLEDGE_DIR = path.join(__dirname, 'medical_knowledge');
const LASTMOD = '2026-09-30T09:00:00+09:00';

function normalizeUrl(url) {
  return String(url || '').split('#')[0].split('?')[0].replace(/\/$/, '');
}

function getVerifiedSources(diseaseId) {
  const knowledgePath = path.join(KNOWLEDGE_DIR, `${diseaseId}.json`);
  if (!fs.existsSync(knowledgePath)) return [];
  const knowledge = JSON.parse(fs.readFileSync(knowledgePath, 'utf8'));
  const seen = new Set();
  return (knowledge.evidenceNotes || [])
    .filter(note => note.sourceVerified === true && note.productionUsable === true)
    .map(note => ({
      title: note.sourceTitle || note.source?.name || '공식 의학 자료',
      url: note.sourceUrl || note.source?.url || ''
    }))
    .filter(source => {
      const normalized = normalizeUrl(source.url);
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .slice(0, 2);
}

function yamlQuoted(value) {
  return `"${String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function updateFrontMatter(markdown, item, conditionPage) {
  let updated = markdown;
  updated = updated.replace(/^author:\s*["']?손지웅 대표원장["']?\s*$/m, 'author: "해아림한의원 의료 콘텐츠팀"');

  if (!/^content_author:/m.test(updated)) {
    updated = updated.replace(
      /^author:.*$/m,
      '$&\ncontent_author: "해아림한의원 의료 콘텐츠팀"\nmedical_information_reviewer: "손지웅 대표원장"\nreview_scope: "사전 승인 질환별 의료정보 기준"'
    );
  }
  if (!/^lastmod:/m.test(updated)) {
    updated = updated.replace(/^date:.*$/m, `$&\nlastmod: ${LASTMOD}`);
  }
  if (!/^search_intent:/m.test(updated)) {
    updated = updated.replace(/^lastmod:.*$/m, '$&\nsearch_intent: "long_tail_column"');
  }
  if (!/^condition_pillar:/m.test(updated)) {
    updated = updated.replace(
      /^search_intent:.*$/m,
      `$&\ncondition_pillar: "${conditionPage?.url || ''}"`
    );
  }
  if (!/^article_review_status:/m.test(updated)) {
    updated = updated.replace(/^condition_pillar:.*$/m, '$&\narticle_review_status: "medical_standard_based"');
  }

  const titleMatch = updated.match(/^title:\s*["']?(.+?)["']?\s*$/m);
  const title = titleMatch ? titleMatch[1].replace(/^"|"$/g, '') : item.title || '';
  const bracketMatch = title.match(/^\[[^\s\]]+\s+([^\]]+)\]\s+(.+)$/);
  const diseaseLabel = bracketMatch ? bracketMatch[1].trim() : item.disease;
  const topic = bracketMatch ? bracketMatch[2].trim() : title;
  const cleanDisease = diseaseLabel.replace(/[^가-힣a-zA-Z0-9]/g, '');
  const hashtags = [
    item.displayRegion,
    `${cleanDisease}정보`,
    `${cleanDisease}관찰`,
    '증상관찰',
    '해아림의학칼럼'
  ];
  const keywords = [
    topic,
    `${diseaseLabel} ${topic}`,
    `${item.displayRegion} ${topic}`,
    `${diseaseLabel} 증상 관찰`
  ];
  updated = updated.replace(
    /^hashtags:\s*\n(?:\s+-.*\n)+/m,
    `hashtags:\n${hashtags.map(value => `  - ${yamlQuoted(value)}`).join('\n')}\n`
  );
  updated = updated.replace(
    /^keywords:\s*\n(?:\s+-.*\n)+/m,
    `keywords:\n${keywords.map(value => `  - ${yamlQuoted(value)}`).join('\n')}\n`
  );
  return updated;
}

function appendTrustLinks(markdown, diseaseId, conditionPage) {
  let updated = markdown.trimEnd();
  const frontMatterEnd = updated.indexOf('\n---', 4);
  const bodyOnly = frontMatterEnd >= 0 ? updated.slice(frontMatterEnd + 4) : updated;
  const normalizedBody = bodyOnly.replace(/\/$/gm, '');

  if (conditionPage && !normalizedBody.includes(normalizeUrl(conditionPage.url))) {
    updated += `\n\n---\n\n### 관련 질환 자세히 보기\n\n- [${conditionPage.title}](${conditionPage.url})`;
  }

  const sources = getVerifiedSources(diseaseId);
  const missingSources = sources.filter(source => !updated.includes(normalizeUrl(source.url)));
  if (missingSources.length > 0) {
    updated += '\n\n### 참고한 공식 의학 자료\n\n';
    updated += missingSources
      .map(source => `- [${String(source.title).replace(/[\[\]]/g, '')}](${source.url})`)
      .join('\n');
  }

  return `${updated}\n`;
}

let updatedCount = 0;
let missingCount = 0;

for (const item of history) {
  const filePath = path.join(BLOG_DIR, `${item.slug}.md`);
  if (!fs.existsSync(filePath)) {
    missingCount += 1;
    continue;
  }

  const conditionPage = getConditionPageForCategory(item.disease);
  const original = fs.readFileSync(filePath, 'utf8');
  let updated = updateFrontMatter(original, item, conditionPage);
  updated = appendTrustLinks(updated, item.disease, conditionPage);
  if (updated !== original) {
    fs.writeFileSync(filePath, updated, 'utf8');
    updatedCount += 1;
  }
}

console.log(`Updated ${updatedCount} existing auto-published columns; ${missingCount} history entries had no matching file.`);
