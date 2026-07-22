export type Grade = "A" | "B" | "C" | "S" | "W";

export const PASS_GRADES: Grade[] = ["A", "B", "C", "S"];
export const ALL_GRADES: Grade[] = ["A", "B", "C", "S", "W"];

export const SUBJECT_KEYS = [
  "religion",
  "languageLiterature",
  "english",
  "science",
  "mathematics",
  "history",
  "subjectGroup1",
  "subjectGroup2",
  "subjectGroup3",
] as const;

export type SubjectKey = (typeof SUBJECT_KEYS)[number];

export const SUBJECT_LABELS: Record<SubjectKey, string> = {
  religion: "Religion",
  languageLiterature: "Language & Literature",
  english: "English Language",
  science: "Science",
  mathematics: "Mathematics",
  history: "History",
  subjectGroup1: "1st Subject Group",
  subjectGroup2: "2nd Subject Group",
  subjectGroup3: "3rd Subject Group",
};

export interface Student {
  id: string;
  name: string;
  attemptNo: string;
  gender: "M" | "F" | string;
  medium: string;
  indexNumber: string;
  subjects: Partial<Record<SubjectKey, Grade | null>>;
  rawSubjects: Partial<Record<SubjectKey, string>>;
  gradeCount: { A: number; B: number; C: number; S: number; W: number };
  passCount: number;
  failCount: number;
  /** Overall O/L pass: at least 6 subjects with S or above */
  isOverallPass: boolean;
}

export interface ParseResult {
  students: Student[];
  schoolName: string;
  examTitle: string;
  warnings: string[];
}

export interface AnalysisSummary {
  totalStudents: number;
  passCount: number;
  failCount: number;
  passPercent: number;
  failPercent: number;
  malePassPercent: number;
  femalePassPercent: number;
  maleCount: number;
  femaleCount: number;
  malePassCount: number;
  femalePassCount: number;
  subjectPassFail: {
    subject: SubjectKey;
    label: string;
    pass: number;
    fail: number;
    total: number;
    passPercent: number;
  }[];
  subjectGrades: {
    subject: SubjectKey;
    label: string;
    A: number;
    B: number;
    C: number;
    S: number;
    W: number;
  }[];
  overallGradeDist: Record<Grade, number>;
  averageAPasses: number;
}

export interface YearRecord {
  year: string;
  examTitle: string;
  schoolName: string;
  uploadedAt: string;
  studentCount: number;
  summary: AnalysisSummary;
  students: Student[];
}

export interface YearListItem {
  year: string;
  examTitle: string;
  schoolName: string;
  uploadedAt: string;
  studentCount: number;
  passCount: number;
  failCount: number;
  passPercent: number;
  failPercent: number;
  malePassPercent: number;
  femalePassPercent: number;
  averageAPasses: number;
}
