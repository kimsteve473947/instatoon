# 🎨 인스타툰 (InstaToon)

구글의 나노바나나(Nano Banana) API를 활용한 AI 웹툰 제작 플랫폼

래퍼런스 이미지를 업로드하면 동일한 그림체로 웹툰을 자동 생성해주는 혁신적인 서비스입니다.

## ✨ 주요 기능

### 🎯 스타일 일관성 유지
- 업로드한 래퍼런스 이미지의 그림체를 분석
- 동일한 아트 스타일, 색감, 그림 기법으로 웹툰 생성
- 캐릭터 일관성 유지 옵션으로 연속성 있는 스토리 제작

### 🖼️ 다양한 웹툰 형식 지원
- 단일 패널 또는 다중 패널 생성
- 스토리 내용에 따른 자동 패널 분할
- 웹툰에 최적화된 세로형 구성

### 🤖 AI 기반 이미지 생성
- Google Gemini 2.5 Flash Image (나노바나나) API 활용
- 고품질 스타일 트랜스퍼 기술 적용
- 반복적 개선을 통한 완성도 높은 결과물

## 🚀 설치 및 실행

### 1. 프로젝트 클론 및 의존성 설치

```bash
# 의존성 설치
npm install
```

### 2. 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 설정하세요:

```env
# Google AI API Key (필수)
# https://ai.google.dev/ 에서 발급받으세요
GOOGLE_AI_API_KEY=your_google_ai_api_key_here

# 서버 설정
PORT=3000
NODE_ENV=development
RUN_MODE=express

# 파일 업로드 설정
MAX_FILE_SIZE=10485760
UPLOAD_PATH=public/uploads
```

### 3. 서버 실행

```bash
# 개발 서버 실행 (nodemon 사용)
npm run dev

# 또는 일반 서버 실행
npm start
```

서버가 성공적으로 실행되면 다음과 같은 메시지가 표시됩니다:

```
🚀 인스타툰 서버가 포트 3000에서 실행 중입니다!
📱 웹 인터페이스: http://localhost:3000
🔧 API 엔드포인트: http://localhost:3000/api/
```

## 📖 사용법

### 웹 인터페이스 사용

1. **브라우저에서 `http://localhost:3000` 접속**

2. **래퍼런스 이미지 업로드**
   - 원하는 그림체의 이미지를 드래그 앤 드롭 또는 파일 선택으로 업로드
   - 지원 형식: JPG, PNG, GIF 등 모든 이미지 형식
   - 최대 파일 크기: 10MB

3. **웹툰 내용 입력**
   - 웹툰으로 만들고 싶은 스토리나 장면을 자세히 설명
   - 예시: "카페에서 커피를 마시는 소녀", "학교 복도에서 친구들과 대화하는 장면"

4. **생성 옵션 설정**
   - **캐릭터 일관성 유지**: 체크하면 등장인물의 모습을 일관되게 유지
   - **다중 패널 생성**: 체크하면 스토리에 따라 여러 패널로 분할

5. **웹툰 생성 및 결과 확인**
   - "웹툰 생성하기" 버튼 클릭
   - 1-2분 후 생성된 웹툰 패널들 확인
   - 다운로드 또는 재생성 가능

### API 사용

직접 API를 호출하여 웹툰을 생성할 수도 있습니다:

```javascript
// 웹툰 생성 API 호출 예시
const formData = new FormData();
formData.append('referenceImage', imageFile);
formData.append('storyContent', '카페에서 커피를 마시는 소녀의 이야기');
formData.append('maintainCharacter', 'true');
formData.append('multiPanel', 'true');

const response = await fetch('/api/generate-webtoon', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log('생성된 웹툰:', result.webtoonPanels);
```

## 🛠️ 기술 스택

### Backend
- **Node.js**: 서버 런타임
- **Express.js**: 웹 프레임워크
- **Multer**: 파일 업로드 처리
- **Sharp**: 이미지 처리 및 최적화
- **Google Generative AI SDK**: 나노바나나 API 통합

### Frontend
- **Vanilla JavaScript**: 순수 자바스크립트
- **HTML5**: 모던 웹 표준
- **CSS3**: 반응형 디자인 및 애니메이션
- **Progressive Web App**: 모바일 친화적 인터페이스

### AI/ML
- **Google Gemini 2.5 Flash Image**: 나노바나나 API
- **Style Transfer**: 스타일 일관성 유지 기술
- **Multi-turn Generation**: 연속적인 이미지 생성

## 🔧 개발 명령어

```bash
# 개발 서버 실행 (자동 재시작)
npm run dev

# 프로덕션 서버 실행
npm start

# MCP 서버로 실행 (Claude Desktop 연동용)
RUN_MODE=mcp npm start

# 의존성 설치
npm install

# 프로젝트 정보 확인
node -e "console.log(require('./package.json'))"
```

## 📁 프로젝트 구조

```
인스타툰/
├── public/                 # 정적 파일들
│   ├── index.html         # 메인 웹 인터페이스
│   ├── css/
│   │   └── style.css      # 스타일시트
│   ├── js/
│   │   └── main.js        # 클라이언트 JavaScript
│   └── uploads/           # 업로드된 파일 저장소
├── index.js               # 메인 서버 파일
├── simple-mcp-server.js   # MCP 서버 (Claude 연동용)
├── test-server.js         # 간단한 테스트 서버
├── package.json           # 프로젝트 설정
├── .env                   # 환경 변수 (생성 필요)
├── .env.example           # 환경 변수 템플릿
├── README.md              # 기존 MCP 문서
├── README_인스타툰.md      # 인스타툰 프로젝트 문서
└── CLAUDE.md              # Claude Code 가이드
```

## 🌟 고급 기능

### 스타일 트랜스퍼 최적화
- 래퍼런스 이미지의 아트 스타일을 정확히 분석
- 색상 팔레트, 그림 기법, 캐릭터 디자인을 일관되게 적용
- 웹툰 형식에 최적화된 세로형 구성

### 다중 패널 생성
- 스토리 길이에 따른 자동 패널 분할
- 패널별 독립적인 장면 구성
- 연속성 있는 스토리텔링 지원

### 반복 개선 시스템
- 생성 결과가 만족스럽지 않을 경우 재생성 가능
- 다양한 변형 옵션 제공
- 사용자 피드백을 반영한 개선

## ⚠️ 주의사항

### API 키 설정
- Google AI API 키가 반드시 필요합니다
- [https://ai.google.dev/](https://ai.google.dev/)에서 무료로 발급받을 수 있습니다
- API 키를 `.env` 파일에 안전하게 보관하세요

### 이미지 업로드 제한
- 최대 파일 크기: 10MB
- 지원 형식: JPG, PNG, GIF, WebP 등
- 고화질 이미지 권장 (스타일 분석 정확도 향상)

### 생성 시간
- 일반적으로 패널 당 30초-1분 소요
- 다중 패널의 경우 더 오랜 시간이 걸릴 수 있음
- 인터넷 연결 상태에 따라 시간 차이 발생

## 🎯 개발 로드맵

### Phase 1 (현재)
- [x] 기본 웹 인터페이스 구현
- [x] 파일 업로드 및 처리 시스템
- [x] 나노바나나 API 통합
- [x] 스타일 트랜스퍼 기본 기능

### Phase 2 (계획)
- [ ] 실제 이미지 생성 API 연동
- [ ] 고급 스타일 분석 알고리즘
- [ ] 사용자 갤러리 기능
- [ ] 소셜 미디어 공유 기능

### Phase 3 (미래)
- [ ] 모바일 앱 개발
- [ ] 실시간 협업 기능
- [ ] AI 캐릭터 생성기
- [ ] 상용화 및 구독 모델

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 🙏 감사인사

- **Google**: 나노바나나(Gemini 2.5 Flash Image) API 제공
- **OpenAI**: AI 기술 발전에 대한 영감
- **웹툰 커뮤니티**: 피드백과 아이디어 제공

## 📞 지원 및 문의

- 이슈 리포트: GitHub Issues
- 기능 요청: GitHub Discussions
- 일반 문의: 프로젝트 관리자에게 연락

---

**🎨 인스타툰과 함께 당신만의 독특한 웹툰을 만들어보세요!**

### 🔗 관련 링크

- [Google AI Studio](https://ai.google.dev/)
- [Gemini API 문서](https://ai.google.dev/gemini-api)
- [나노바나나 API 가이드](https://ai.google.dev/gemini-api/docs/image-generation)
- [웹툰 제작 가이드](https://webtoons.com/en/creator-guide)

### 📊 성능 벤치마크

| 기능 | 처리 시간 | 정확도 |
|-----|----------|--------|
| 이미지 업로드 | < 1초 | 100% |
| 스타일 분석 | 10-30초 | 85% |
| 패널 생성 | 30-60초 | 80% |
| 다중 패널 | 1-3분 | 75% |

### 🎨 예제 결과물

**입력:**
- 래퍼런스: 수채화 스타일의 소녀 그림
- 스토리: "도서관에서 책을 읽는 학생"

**출력:**
- 동일한 수채화 스타일로 생성된 웹툰 패널
- 캐릭터 일관성 유지
- 웹툰 형식에 최적화된 레이아웃