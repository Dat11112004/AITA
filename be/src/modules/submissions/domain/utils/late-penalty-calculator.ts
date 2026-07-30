export interface LatePenaltyResult {
  rawScore: number;
  latePenaltyAmount: number;
  finalScore: number;
  isLate: boolean;
}

export function calculateLatePenalty({
  rawScore,
  submittedAt,
  originalDueDate,
  override,
  examPenaltyType,
  examPenaltyValue,
  maxLatePenalty,
}: {
  rawScore: number;
  submittedAt: Date | null;
  originalDueDate: Date | null;
  override?: {
    extendedDueDate?: Date | null;
    penaltyMode?: string | null;
    customPenaltyRate?: number | null;
    flatPenaltyAmount?: number | null;
    scoreCap?: number | null;
  } | null;
  examPenaltyType?: string | null;
  examPenaltyValue?: number | null;
  maxLatePenalty?: number | null;
}): LatePenaltyResult {
  if (!submittedAt) {
    return { rawScore, latePenaltyAmount: 0, finalScore: rawScore, isLate: false };
  }

  const effectiveDueDate = override?.extendedDueDate
    ? new Date(override.extendedDueDate)
    : (originalDueDate ? new Date(originalDueDate) : null);

  if (!effectiveDueDate || submittedAt <= effectiveDueDate) {
    let finalScore = rawScore;
    if (override?.penaltyMode === 'SCORE_CAP' && override.scoreCap !== null && override.scoreCap !== undefined) {
      finalScore = Math.min(rawScore, Number(override.scoreCap));
    }
    return { rawScore, latePenaltyAmount: 0, finalScore, isLate: false };
  }

  const isLate = true;
  const penaltyMode = override?.penaltyMode || 'SYSTEM_DEFAULT';
  let latePenaltyAmount = 0;

  if (penaltyMode === 'WAIVE') {
    latePenaltyAmount = 0;
  } else if (penaltyMode === 'FLAT_AMOUNT') {
    latePenaltyAmount = Number(override?.flatPenaltyAmount || 0);
  } else if (penaltyMode === 'CUSTOM_RATE') {
    const diffMs = submittedAt.getTime() - effectiveDueDate.getTime();
    const daysLate = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const rate = Number(override?.customPenaltyRate || 0);
    latePenaltyAmount = daysLate * rate;
  } else if (penaltyMode === 'SCORE_CAP') {
    latePenaltyAmount = 0;
  } else {
    const penaltyType = examPenaltyType || 'NONE';
    const penaltyValue = Number(examPenaltyValue || 0);

    if (penaltyType === 'DAILY_POINTS') {
      const diffMs = submittedAt.getTime() - effectiveDueDate.getTime();
      const daysLate = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      latePenaltyAmount = daysLate * penaltyValue;
    } else if (penaltyType === 'DAILY_PERCENT') {
      const diffMs = submittedAt.getTime() - effectiveDueDate.getTime();
      const daysLate = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      latePenaltyAmount = (daysLate * penaltyValue / 100) * rawScore;
    } else if (penaltyType === 'FLAT_POINTS') {
      latePenaltyAmount = penaltyValue;
    }
  }

  if (maxLatePenalty !== undefined && maxLatePenalty !== null && latePenaltyAmount > maxLatePenalty) {
    latePenaltyAmount = Number(maxLatePenalty);
  }

  let finalScore = Math.max(0, rawScore - latePenaltyAmount);

  if (penaltyMode === 'SCORE_CAP' && override?.scoreCap !== null && override?.scoreCap !== undefined) {
    finalScore = Math.min(finalScore, Number(override.scoreCap));
  }

  return { rawScore, latePenaltyAmount, finalScore, isLate };
}
