export interface Criterion {
  name: string;
  maxScore: number;
}

export interface GradeScores {
  [criterionName: string]: number;
}
