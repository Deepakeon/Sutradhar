import { Suspense } from 'react';
import { Metadata } from 'next';
import { InterviewRoomContainer } from '@/components/room/interview-room-container';

export const metadata: Metadata = {
  title: 'Interview Room — Sutradhar',
  description: '1-on-1 private video interview room with automated recording',
};

export const instant = false;

interface PageProps {
  params: Promise<{ id: string }>;
}

async function RoomContent({ params }: PageProps) {
  const { id } = await params;
  return <InterviewRoomContainer interviewId={id} />;
}

export default function RoomPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#101010] flex items-center justify-center p-4">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#00d992] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-mono text-[#8b949e]">Loading Room...</p>
          </div>
        </div>
      }
    >
      <RoomContent {...props} />
    </Suspense>
  );
}
