export interface Admin {
  username: string;
  pin: string;
}

export interface TryoutPackage {
  id: string;
  name: string;
  description: string;
  password?: string; // Stored in cleartext or checked simple
  duration: number; // in minutes
  passingGrade: number; // target score, default 65
  isActive: boolean;
  createdAt: any; // Firestore Timestamp or ISO string
}

export interface Question {
  id: string;
  packageId: string;
  text: string;
  imageUrl?: string; // Optional image URL or base64 data for the question
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
    E?: string; // Optional 5th option
  };
  correctAnswer: "A" | "B" | "C" | "D" | "E";
  scoreWeight: number; // custom weight of the question
  explanation?: string;
}

export interface Participant {
  id: string;
  name: string;
  institution: string;
  packageId: string;
}

export interface TryoutResult {
  id: string;
  participantName: string;
  institution: string;
  packageId: string;
  packageName: string;
  firstScore: number;
  secondScore: number | null;
  finalScore: number;
  firstAttemptCorrect: number;
  firstAttemptIncorrect: number;
  secondAttemptCorrect: number | null;
  secondAttemptIncorrect: number | null;
  status: "PASS" | "FAIL";
  attemptCount: number; // 1 or 2
  incorrectQuestions: string[]; // List of question IDs that were wrong on 1st attempt
  answersFirst: Record<string, string>; // questionId -> response
  answersSecond: Record<string, string> | null; // questionId -> response for incorrect questions
  createdAt: any;
  durationSpent?: number; // total time spent in seconds
}

export interface BrandingSettings {
  title: string;
  description: string;
  logoTextPrefix: string;
  logoTextSuffix: string;
  logoSubtext: string;
  logoType: "icon" | "url";
  logoIconName: string; // e.g. "BookOpen"
  logoUrl?: string; // custom logo image url
}
