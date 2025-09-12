# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) enabled project that connects AI with various tools. The project includes both an MCP server implementation and integration with Claude Desktop for enhanced AI capabilities.

## Commands

### Development Commands
- `npm install` - Install project dependencies
- `npm start` - Run the main index.js server
- `npm run dev` - Run server in development mode with nodemon for auto-reload
- `node test-mcp.js` - Test MCP server functionality
- `node simple-mcp-server.js` - Run the standalone MCP server for Claude Desktop

## Architecture

### Core Components

1. **MCP Server (`simple-mcp-server.js`)**: Standalone MCP server that implements file operations tools (read_file, write_file, list_files) for Claude Desktop integration.

2. **Main Server (`index.js`)**: Express server combined with MCP capabilities, providing both HTTP endpoints and MCP tool handlers.

3. **MCP Configuration**: 
   - Local project config: `mcp-config.json` defines available MCP servers (filesystem, sqlite, web/puppeteer)
   - Claude Desktop config: `claude-desktop-config.json` contains the configuration for Claude Desktop integration

### Available MCP Tools

The project implements the following MCP tools:
- `read_file`: Read content from files
- `write_file`: Write content to files  
- `list_files`: List files in directories
- `get_project_info`: Get project information (in index.js)
- `create_file`: Create new files with content (in index.js)

### External MCP Servers

The project is configured to use these MCP servers:
- **filesystem**: File system access via @modelcontextprotocol/server-filesystem
- **sqlite**: Database operations via @modelcontextprotocol/server-sqlite
- **web/puppeteer**: Web scraping via @modelcontextprotocol/server-puppeteer

## Claude Desktop Integration

To use this MCP server with Claude Desktop, the configuration needs to be added to:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

The server runs on stdio transport when executed directly (`node simple-mcp-server.js`).
- 인스타툰 제작 SaaS 플랫폼

## 🎨 프로젝트 개요
- **목적**: AI 기반 인스타그램 웹툰 제작 플랫폼
- **타겟**: 한국 개인 창작자 및 기업
- **핵심 가치**: 캐릭터 일관성 유지, 간편한 스토리텔링

## 🛠 기술 스택
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + Shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **ORM**: Prisma
- **Storage**: Vercel Blob
- **AI**: Google Gemini 2.5 Flash Image (gemini-2-5-flash-image-preview)
- **Payment**: Toss Payments (한국 결제)
- **Auth**: Clerk
- **Deployment**: Vercel
- **Monitoring**: Sentry + Vercel Analytics

## 📐 아키텍처 원칙
1. **모듈화**: 기능별 독립적인 모듈 구성
2. **타입 안정성**: TypeScript strict mode, Zod validation
3. **에러 처리**: 모든 API에 try-catch 및 사용자 친화적 에러 메시지
4. **성능**: 이미지 최적화, 캐싱, lazy loading
5. **보안**: API rate limiting, input sanitization

## 🗂 프로젝트 구조
insta-toon-saas/
├── app/                      # Next.js App Router
│   ├── (auth)/              # 인증 관련 페이지
│   ├── (marketing)/         # 랜딩, 가격 페이지
│   ├── dashboard/           # 사용자 대시보드
│   │   ├── projects/        # 웹툰 프로젝트 관리
│   │   ├── characters/      # 캐릭터 세트 관리
│   │   └── billing/         # 구독 및 결제 관리
│   ├── api/                 # API 라우트
│   │   ├── ai/             # Gemini API 통합
│   │   ├── payments/       # Toss Payments
│   │   └── webhooks/       # 외부 서비스 웹훅
│   └── studio/             # 웹툰 제작 스튜디오
├── components/
│   ├── ui/                 # Shadcn 컴포넌트
│   ├── studio/            # 제작 도구 컴포넌트
│   └── dashboard/         # 대시보드 컴포넌트
├── lib/
│   ├── ai/               # AI 서비스 로직
│   ├── db/               # 데이터베이스 유틸
│   ├── payments/         # 결제 로직
│   └── storage/          # 파일 스토리지
├── prisma/
│   └── schema.prisma     # 데이터베이스 스키마
├── hooks/                # Custom React hooks
├── types/               # TypeScript 타입 정의
└── utils/              # 유틸리티 함수

## 💰 비즈니스 모델
### 구독 플랜
1. **개인 (3만원/월)**: 50만 토큰, 캐릭터 3개 등록
2. **헤비유저 (10만원/월)**: 200만 토큰, 캐릭터 5개 등록
3. **기업 (20만원/월)**: 500만 토큰, 캐릭터 무제한 등록

### 토큰 소비
- 이미지 생성: 패널당 2토큰
- 고해상도 출력: +1토큰
- 캐릭터 저장: 1토큰

## 🔑 핵심 기능
1. **캐릭터 레퍼런스 시스템**
   - 최대 5개 캐릭터 동시 관리
   - 일관된 외모 유지
   - 캐릭터 설명 메타데이터

2. **인스타툰 생성 파이프라인**
   - 컷별 프롬프트 입력
   - 실시간 미리보기
   - 일괄 생성 및 개별 수정

3. **토큰 기반 사용량 관리**
   - 실시간 토큰 추적
   - 사용 내역 대시보드
   - 자동 충전 옵션

4. **추천인 시스템**
   - 고유 추천 코드 생성
   - 양방향 보상 (추천인 50토큰, 가입자 20토큰)

## 📝 코딩 컨벤션
```typescript
// 컴포넌트 - PascalCase
export function CharacterUploader() {}

// 함수 - camelCase
function processImageUpload() {}

// 상수 - UPPER_SNAKE_CASE
const MAX_CHARACTERS = 5;

// 타입/인터페이스 - PascalCase
interface CharacterData {}

// API 라우트 - kebab-case
// /api/webtoon/generate-panel

// 한국어 주석 사용
// 복잡한 로직은 반드시 설명 추가