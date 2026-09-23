import { totalGrade } from './grade';

describe('totalGrade', () => {
  it('adds up the graded modules and ignores the others', () => {
    const grade = totalGrade([
      { score: 1, maxScore: 1 },
      null,
      { score: 0, maxScore: 1 },
      { score: 1, maxScore: 1 },
    ]);

    expect(grade).toEqual({ score: 2, maxScore: 3, percentage: 67 });
  });

  it('returns null when no module is graded', () => {
    expect(totalGrade([null, null])).toBeNull();
    expect(totalGrade([])).toBeNull();
  });

  it('gives 100% for a perfect score and 0% for none', () => {
    expect(totalGrade([{ score: 2, maxScore: 2 }])?.percentage).toBe(100);
    expect(totalGrade([{ score: 0, maxScore: 2 }])?.percentage).toBe(0);
  });
});
