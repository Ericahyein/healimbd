// Public columns are informational. Keep verified medical notes for internal
// drafting, but never invent or display an external reference in new copy.
function checkPublicCitations(text) {
  const value = String(text || '');
  const errors = [];
  if (/https?:\/\/|www\.|\b(?:doi\s*:|PMID\s*:|PMCID\s*:)/i.test(value)) {
    errors.push('외부 링크·DOI·PMID 등 출처 표기를 넣지 마십시오. 본원 내부 링크는 허용됩니다.');
  }
  if (/^#{2,6}[ \t]*(?:참고(?:한[ \t]*공식[ \t]*의학[ \t]*자료|[ \t]*문헌|[ \t]*자료)?|출처|references?|sources?|근거[ \t]*자료)[ \t]*$/im.test(value)) {
    errors.push('참고문헌·출처 목록을 만들지 마십시오.');
  }
  if (/(?:논문|연구)|(?:자료|지침|가이드라인)\s*(?:에\s*따르면|에서\s*(?:밝혔|제시|보고|강조|권고|설명))/i.test(value)) {
    errors.push('출처 없는 연구·논문·지침 인용을 피하고 확인된 일반 건강정보로 설명하십시오.');
  }
  if (/\b(?:NICE|NHS|PubMed|Cochrane|PMID|PMCID|DSM-5)\b/i.test(value)) {
    errors.push('외부 기관·문헌명을 출처로 표기하지 마십시오.');
  }
  return errors;
}

module.exports = { checkPublicCitations };
