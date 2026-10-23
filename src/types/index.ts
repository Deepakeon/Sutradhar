export type UserRole = 'candidate' | 'interviewer';

export interface SkillItem {
  id: string;
  name: string;
  category: string;
  proficiency: 'Intermediate' | 'Advanced' | 'Expert';
  yearsOfExperience: number;
}

export interface ExperienceItem {
  id: string;
  title: string;
  company: string;
  period: string;
  highlights: string[];
}

export interface CandidateProfile {
  headline: string;
  targetRoles: string[];
  domains: string[];
  context: {
    careerObjectives: string;
    preferredTimezone: string;
    weeklyAvailabilityHours: number;
    targetCompanies: string[];
    interviewFocus: string[];
    portfolioUrl?: string;
    resumeNotes?: string;
  };
  skills: SkillItem[];
  experience: ExperienceItem[];
}

export type SkillProficiency = 'Beginner' | 'Intermediate' | 'Expert';

export interface InterviewerSkillItem {
  id: string;
  name: string;
  category?: string;
  proficiency: SkillProficiency;
  level?: 'Staff Bar Raiser' | 'Senior Assessor' | 'Domain Specialist' | string;
  interviewsConducted?: number;
}

export interface InterviewerProfile {
  headline: string;
  objectives: string;
  targetRoles: string[];
  timezone: string;
  weeklyAvailability: string;
  domains: string[];
  context: {
    interviewPhilosophy: string;
    sessionFormats: string[];
    availabilitySchedule: string;
    preferredTimezone: string;
    maxSessionsPerWeek: number;
    hourlyHonorarium?: string;
  };
  skills: InterviewerSkillItem[];
  experience: {
    totalInterviewsConducted: number;
    averageRating: number;
    primaryCompany: string;
    yearsInterviewing: number;
    certifications: string[];
  };
  jobDescriptions?: JobDescription[];
}

export type SkillImportance = 'Important' | 'Additional' | 'Bonus';

export interface JDSkillItem {
  id: string;
  name: string;
  classification: SkillImportance;
}

export interface JobDescription {
  id: string;
  roleTitle: string;
  note: string;
  timingAvailable: string;
  skills: JDSkillItem[];
  createdAt: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  avatar: string;
  activeRole: UserRole;
  candidateProfile: CandidateProfile;
  interviewerProfile: InterviewerProfile;
}

export interface MatchingInterviewer {
  id: string;
  name: string;
  avatar: string;
  currentTitle: string;
  company: string;
  yearsExperience: number;
  rating: number;
  interviewsCount: number;
  domains: string[];
  keySkills: string[];
  formats: string[];
  availability: string;
  compatibilityScore: number;
  compatibilityReason: string;
  bio: string;
}

export interface CandidateSkillWithProficiency {
  name: string;
  proficiency: SkillProficiency;
}

export interface MatchingCandidate {
  id: string;
  name: string;
  avatar: string;
  headline?: string;
  targetRole: string;
  objective?: string;
  currentCompany: string;
  yearsExperience: number;
  availability?: string;
  domains: string[];
  keySkills: string[];
  skills?: CandidateSkillWithProficiency[];
  preferredFormat: string;
  compatibilityScore: number;
  compatibilityReason: string;
  careerGoals: string;
}

export interface InterviewQuestionnaire {
  problemSolvingRating: number; // 1-5
  technicalDepthRating: number; // 1-5
  communicationRating: number; // 1-5
  systemArchitectureRating: number; // 1-5
  overallRecommendation: 'Strong Hire' | 'Hire' | 'Lean Hire' | 'Lean No Hire' | 'No Hire';
  strengths: string;
  areasForGrowth: string;
  detailedFeedback: string;
  submittedAt: string;
}

export interface InterviewSession {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateAvatar: string;
  candidateRole: string;
  interviewerId: string;
  interviewerName: string;
  interviewerAvatar: string;
  interviewerCompany: string;
  format: string;
  scheduledAt: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';
  originatorRole: UserRole; // which role created the request
  meetingUrl?: string;
  candidateNotes?: string;
  interviewerNotes?: string;
  questionnaire?: InterviewQuestionnaire;
}
