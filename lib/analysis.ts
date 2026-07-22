import {
  type AnalysisSummary,
  type Grade,
  type Student,
  ALL_GRADES,
  SUBJECT_KEYS,
  SUBJECT_LABELS,
} from "./types";

export function analyzeStudents(students: Student[]): AnalysisSummary {
  const totalStudents = students.length;
  const passCount = students.filter((s) => s.isOverallPass).length;
  const failCount = totalStudents - passCount;

  const males = students.filter((s) => s.gender === "M");
  const females = students.filter((s) => s.gender === "F");
  const malePassCount = males.filter((s) => s.isOverallPass).length;
  const femalePassCount = females.filter((s) => s.isOverallPass).length;

  const subjectPassFail = SUBJECT_KEYS.map((subject) => {
    let pass = 0;
    let fail = 0;
    for (const s of students) {
      const g = s.subjects[subject];
      if (!g) continue;
      if (g === "W") fail += 1;
      else pass += 1;
    }
    const total = pass + fail;
    return {
      subject,
      label: SUBJECT_LABELS[subject],
      pass,
      fail,
      total,
      passPercent: total ? Math.round((pass / total) * 1000) / 10 : 0,
    };
  });

  const subjectGrades = SUBJECT_KEYS.map((subject) => {
    const counts: Record<Grade, number> = { A: 0, B: 0, C: 0, S: 0, W: 0 };
    for (const s of students) {
      const g = s.subjects[subject];
      if (g && ALL_GRADES.includes(g)) counts[g] += 1;
    }
    return { subject, label: SUBJECT_LABELS[subject], ...counts };
  });

  const overallGradeDist: Record<Grade, number> = {
    A: 0,
    B: 0,
    C: 0,
    S: 0,
    W: 0,
  };
  for (const s of students) {
    for (const g of ALL_GRADES) {
      overallGradeDist[g] += s.gradeCount[g];
    }
  }

  const totalA = students.reduce((sum, s) => sum + s.gradeCount.A, 0);

  return {
    totalStudents,
    passCount,
    failCount,
    passPercent: totalStudents
      ? Math.round((passCount / totalStudents) * 1000) / 10
      : 0,
    failPercent: totalStudents
      ? Math.round((failCount / totalStudents) * 1000) / 10
      : 0,
    malePassPercent: males.length
      ? Math.round((malePassCount / males.length) * 1000) / 10
      : 0,
    femalePassPercent: females.length
      ? Math.round((femalePassCount / females.length) * 1000) / 10
      : 0,
    maleCount: males.length,
    femaleCount: females.length,
    malePassCount,
    femalePassCount,
    subjectPassFail,
    subjectGrades,
    overallGradeDist,
    averageAPasses: totalStudents
      ? Math.round((totalA / totalStudents) * 10) / 10
      : 0,
  };
}
