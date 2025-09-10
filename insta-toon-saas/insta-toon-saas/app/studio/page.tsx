'use client';

import { Suspense } from 'react';
import StudioContent from './components/StudioContent';

export const dynamic = 'force-dynamic';

export default function StudioPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-gray-600">스튜디오를 로딩 중...</p>
      </div>
    </div>}>
      <StudioContent />
    </Suspense>
  );
}