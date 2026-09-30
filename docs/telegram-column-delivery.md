# 텔레그램 칼럼 HTML 수신

Repository Actions secrets: `OPENAI_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
`TELEGRAM_CHAT_ID`는 봇 이름이 아니라 수신자 본인의 개인 숫자 ID입니다.
수신자가 만든 봇 채팅방에서 Start를 눌러야 합니다. 토큰은 코드·로그에 넣지 않습니다.

## 동작

기존 자동발행 작업의 글 커밋과 main 푸시가 성공한 경우에만 해당 slug를 전달합니다.
발행 시간, 주제 플래너, 원문, 이미지, 홈페이지 디자인은 수정하지 않습니다.
각색 실패나 전송 실패는 이미 완료된 홈페이지 발행을 취소하지 않습니다.
푸시 직후 보내므로 홈페이지 배포가 완료되기 전에는 원문 링크가 잠시 열리지 않을 수 있습니다.

원문을 바탕으로 제목·도입·구성을 각색하고, 두 번째 AI 호출로 의학적 의미와 주의사항을 대조합니다.
검수를 통과하지 못하면 전송하지 않습니다. 이 자동 검수는 의료 전문가의 검토를 대신하지 않습니다.
HTML은 모델이 준 코드가 아니라 검증된 텍스트를 이스케이프하여 렌더링합니다.
외부 스크립트, 이미지, 웹폰트 없이 파일 하나로 열립니다.
각색본은 홈페이지나 공개 저장소에 커밋하지 않습니다.

## 첫 수신 테스트 / 재전송

병합 후 GitHub Actions → `Telegram Column HTML — Test or Resend` → Run workflow → main.
`column_slug`는 빈칸이면 최신 발행글, 지정하면 해당 발행글을 사용합니다.
새 홈페이지 글을 생성하지 않고, 기존 글의 각색본 한 편을 전송합니다.
각 수동 실행은 의도적인 새 전송이며 OpenAI 호출 비용이 발생합니다.

기본 모델은 기존 `OPENAI_WRITER_MODEL`을 따릅니다.
별도 모델을 원하면 Actions variable `OPENAI_TELEGRAM_MODEL`을 등록합니다.
모델은 chat/completions 및 JSON mode를 지원해야 합니다.

## 실패 확인

자동발행 실행의 `Deliver Adapted Column HTML to Telegram` 단계에서 실패 여부를 확인하세요.
- 401: API 키 또는 토큰 확인
- Telegram 400/403: 본인 ID, 봇 Start 여부, 봇 차단 여부 확인
- OpenAI 429: 잔액/사용 한도 확인
- 검수 미통과: 원문과 각색 지침 검토 후 수동 실행
- 시간 초과: 실제로 파일이 도착했는지 먼저 확인 후 수동 재전송

중복 수신을 줄이기 위해 모호한 네트워크 실패는 자동 재시도하지 않습니다.
전송 보장 및 영구 중복 방지 큐는 없으며, 실패 시 위 수동 실행으로 복구합니다.
로컬 검증: `node --test tests/test_telegram_delivery.js` (API 호출·발송·비용 없음).
