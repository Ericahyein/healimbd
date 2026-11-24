// Shared reads for the public archive. Credentials remain on the server.
export async function listAllInquiryDocuments(projectId, accessToken) {
  const documents = [];
  const tokens = new Set();
  let pageToken = '';
  do {
    const url = new URL(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/online_inquiries?pageSize=300`);
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const response = await fetch(url.href, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) throw new Error(`Inquiry archive read failed: ${response.status}`);
    const payload = await response.json();
    documents.push(...(payload.documents || []));
    pageToken = payload.nextPageToken || '';
    if (pageToken && tokens.has(pageToken)) throw new Error('Repeated inquiry continuation token');
    if (pageToken) tokens.add(pageToken);
  } while (pageToken);
  return documents;
}

// The unfiltered board reads just one page of documents, plus a count. Ordering
// on the document name breaks timestamp ties consistently across page requests.
export async function readInquiryPage(projectId, accessToken, requestedPage, pageSize) {
  const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  const structuredQuery = {
    from: [{ collectionId: 'online_inquiries' }],
    orderBy: [
      { field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' },
      { field: { fieldPath: '__name__' }, direction: 'DESCENDING' }
    ]
  };
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
  const countResponse = await fetch(`${base}:runAggregationQuery`, {
    method: 'POST', headers,
    body: JSON.stringify({ structuredAggregationQuery: {
      structuredQuery, aggregations: [{ alias: 'total', count: {} }]
    } })
  });
  if (!countResponse.ok) throw new Error(`Inquiry count failed: ${countResponse.status}`);
  const counts = await countResponse.json();
  const total = Number(counts.find(item => item.result?.aggregateFields?.total)?.result.aggregateFields.total.integerValue);
  if (!Number.isSafeInteger(total) || total < 0) throw new Error('Invalid inquiry count');
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * pageSize;
  if (!total) return { documents: [], total, page, totalPages, offset };
  const response = await fetch(`${base}:runQuery`, {
    method: 'POST', headers,
    body: JSON.stringify({ structuredQuery: { ...structuredQuery, offset, limit: pageSize },
      ...(counts.find(item => item.readTime)?.readTime ? { readTime: counts.find(item => item.readTime).readTime } : {})
    })
  });
  if (!response.ok) throw new Error(`Inquiry page failed: ${response.status}`);
  const rows = await response.json();
  if (rows.some(row => row.error)) throw new Error('Inquiry query returned an error');
  return { documents: rows.flatMap(row => row.document ? [row.document] : []), total, page, totalPages, offset };
}

export function inquiryUnavailableResponse() {
  return new Response('<!doctype html><html lang="ko"><meta charset="utf-8"><title>온라인 상담 일시 연결 오류 | 해아림한의원 분당점</title><main><h1>상담글을 잠시 불러올 수 없습니다.</h1><p>잠시 후 다시 시도해 주세요.</p><a href="/inquiry/">온라인 상담 다시 보기</a></main></html>', {
    status: 503,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Retry-After': '60' }
  });
}
