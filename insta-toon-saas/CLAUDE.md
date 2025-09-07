# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the Insta-Toon SaaS platform.

## Project Overview

인스타툰 제작 SaaS 플랫폼 - 한국 시장을 타겟으로 한 웹툰 제작 도구
- AI 기반 캐릭터 일관성 유지 기능
- 토큰 기반 구독 시스템
- Gemini Flash 2.0을 활용한 이미지 생성

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: NextAuth.js with Supabase adapter
- **Payment**: Stripe
- **AI API**: Google Gemini Flash 2.0
- **State Management**: Zustand
- **UI Components**: Radix UI + Custom components
- **Form Handling**: React Hook Form + Zod

## Project Structure

```
insta-toon-saas/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── generation/   # AI generation endpoints
│   │   ├── payment/      # Stripe payment endpoints
│   │   └── subscription/ # Subscription management
│   ├── auth/             # Authentication pages
│   ├── dashboard/        # User dashboard
│   ├── editor/          # Webtoon editor
│   ├── gallery/         # Public gallery
│   └── pricing/         # Pricing page
├── components/           # React components
│   ├── ui/              # Reusable UI components
│   ├── auth/           # Auth-related components
│   ├── editor/         # Editor components
│   ├── gallery/        # Gallery components
│   └── layout/         # Layout components
├── hooks/               # Custom React hooks
├── lib/                # Library configurations
│   ├── supabase.ts    # Supabase client
│   ├── stripe.ts      # Stripe configuration
│   └── gemini.ts      # Gemini API client
├── types/              # TypeScript type definitions
└── utils/              # Utility functions

```

## Core Features

### 1. Character Consistency System
- 캐릭터 프로필 저장 및 관리
- AI 프롬프트 최적화를 통한 일관성 유지
- 캐릭터별 스타일 가이드라인

### 2. Token-Based Subscription
- 월간 토큰 충전 시스템
- 사용량 기반 과금
- 다양한 구독 플랜

### 3. Webtoon Editor
- 컷 단위 편집
- 말풍선 및 텍스트 추가
- 효과음 및 배경 처리

### 4. AI Generation
- Gemini Flash 2.0 API 통합
- 프롬프트 템플릿 시스템
- 이미지 생성 및 편집

## Database Schema

### Users
- id, email, name, created_at, subscription_tier

### Characters
- id, user_id, name, description, style_guide, reference_images

### Projects
- id, user_id, title, description, status, created_at

### Generations
- id, project_id, character_id, prompt, image_url, tokens_used

### Subscriptions
- id, user_id, stripe_customer_id, stripe_subscription_id, tokens_remaining

## API Endpoints

- `/api/auth/*` - NextAuth.js authentication
- `/api/generation/create` - Generate new image
- `/api/generation/edit` - Edit existing image
- `/api/payment/checkout` - Create Stripe checkout session
- `/api/subscription/usage` - Get token usage

## Environment Variables

```env
# Database
DATABASE_URL=
DIRECT_URL=

# Authentication
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Gemini API
GEMINI_API_KEY=

# Storage
NEXT_PUBLIC_STORAGE_URL=
```

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Type checking
npm run type-check
```

## Coding Standards

- Use TypeScript strict mode
- Follow ESLint configuration
- Use Prettier for formatting
- Component files: PascalCase
- Utility files: camelCase
- API routes: kebab-case

## Important Notes

- Always maintain character consistency in generated images
- Optimize token usage for cost efficiency
- Ensure Korean language support throughout UI
- Follow accessibility best practices
- Implement proper error handling and loading states