# Supabase MCP 설정 가이드

## 1. Supabase Personal Access Token 생성

1. [Supabase 설정](https://supabase.com/dashboard/account/tokens) 페이지로 이동
2. 새로운 Personal Access Token 생성
3. 토큰 이름 입력 (예: "Instatoon MCP Server")
4. 생성된 토큰을 안전한 곳에 복사해두기

## 2. Claude Desktop 설정 업데이트

`claude-desktop-config.json` 파일에서 다음 부분을 수정:

```json
"SUPABASE_ACCESS_TOKEN": "YOUR_SUPABASE_ACCESS_TOKEN"
```

위 부분을 실제 토큰으로 교체:

```json
"SUPABASE_ACCESS_TOKEN": "sbp_xxxxxxxxxxxxx"
```

## 3. (선택) 프로젝트 특정 모드

특정 Supabase 프로젝트에만 접근하도록 제한하려면:

1. Supabase 대시보드에서 프로젝트 설정으로 이동
2. Project ID 복사
3. `claude-desktop-config.json`의 args 배열에 추가:

```json
"args": [
  "-y",
  "@supabase/mcp-server-supabase@latest",
  "--read-only",
  "--project-ref=YOUR_PROJECT_ID"
]
```

## 4. Claude Desktop 재시작

설정 파일 수정 후 Claude Desktop을 재시작하여 변경사항을 적용합니다.

## 보안 권장사항

- **읽기 전용 모드**: 기본적으로 `--read-only` 플래그가 활성화되어 있습니다
- **개발 환경 사용**: 프로덕션이 아닌 개발 프로젝트에 연결하는 것을 권장합니다
- **프로젝트 스코핑**: 특정 프로젝트에만 접근하도록 제한하는 것을 권장합니다

## 사용 가능한 도구

Supabase MCP를 통해 다음과 같은 작업이 가능합니다:

- 테이블 조회 및 데이터 쿼리
- 마이그레이션 관리
- TypeScript 타입 생성
- Edge Functions 배포
- 프로젝트 로그 조회
- 문서 검색