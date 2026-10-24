import type { Database } from './database.types';

export type InterviewRow = Database['private']['Tables']['interviews']['Row'];
export type InterviewInsert = Database['private']['Tables']['interviews']['Insert'];
export type InterviewUpdate = Database['private']['Tables']['interviews']['Update'];

export type InterviewChunkRow = Database['private']['Tables']['interview_chunks']['Row'];
export type InterviewChunkInsert = Database['private']['Tables']['interview_chunks']['Insert'];

export type InterviewStatus = Database['private']['Enums']['interview_status'];

export interface RoomParticipant {
  id: string;
  role: 'candidate' | 'interviewer';
  name?: string;
  avatarUrl?: string;
  joinedAt?: string;
}

export interface SignalingPayload {
  type: 'offer' | 'answer' | 'ice-candidate' | 'call-ended' | 'peer-status';
  senderId: string;
  recipientId?: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  timestamp: number;
}

export interface ChunkUploadMetadata {
  interviewId: string;
  profileId: string;
  role: 'candidate' | 'interviewer';
  chunkIndex: number;
  startOffsetMs: number;
  endOffsetMs?: number;
}

export interface ChunkUploadResponse {
  success: boolean;
  chunk: InterviewChunkRow;
}
