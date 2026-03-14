# LRC Editor — Play Leaf

Whisper JSON(whisperweb.app / stable-ts) → LRC 변환 + 싱크 편집 도구

## 기능

- whisperweb.app / stable-ts JSON 자동 감지 파싱
- Suno 가사 중복 제거 + 자동 매칭
- 타임스탬프 인라인 클릭 편집 (`[MM:SS]`, `MM:SS`, 초(숫자) 형식 모두 지원)
- 오디오 재생 중 현재 가사 행 자동 하이라이트 + 스크롤
- 행 순서 변경 (▲ ▼ 버튼)
- 선택한 행 바로 아래에 줄 삽입 (+ 버튼)
- 전체 오프셋 슬라이더
- 오디오 업로드 + 재생 / 재생속도 조절 (0.7x ~ 1.2x)
- 타임스탬프 클릭 시 해당 위치로 오디오 이동
- LRC 복사 / 다운로드

## 로컬 실행

```bash
npm install
npm run dev
```

http://localhost:3000 에서 확인

## Vercel 배포

1. GitHub에 push
2. vercel.com → New Project → GitHub 레포 연결
3. 설정 변경 없이 Deploy 클릭

끝. 이후 push할 때마다 자동 배포됩니다.
