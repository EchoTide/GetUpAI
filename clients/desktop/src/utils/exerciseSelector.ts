import { ExerciseAction, EXERCISE_LIBRARY } from '../data/exerciseLibrary';

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function selectExercises(
  standDurationSeconds: number,
  locale: 'zh' | 'en'
): ExerciseAction[] {
  const minDuration = standDurationSeconds * 0.8;
  const maxDuration = standDurationSeconds * 1.1;
  const shuffled = shuffle(EXERCISE_LIBRARY);
  const selected: ExerciseAction[] = [];
  let lastCategory: string | null = null;

  for (const exercise of shuffled) {
    if (lastCategory !== null && exercise.category === lastCategory) {
      continue;
    }

    const potentialTotal = selected.reduce((sum, e) => sum + e.duration, 0) + exercise.duration;

    if (potentialTotal <= maxDuration || selected.length < 3) {
      selected.push(exercise);
      lastCategory = exercise.category;

      if (potentialTotal >= minDuration && selected.length >= 3) {
        break;
      }
    }

    if (selected.length >= 5) {
      break;
    }
  }

  const currentTotal = selected.reduce((sum, e) => sum + e.duration, 0);
  if (currentTotal < minDuration && selected.length < 3) {
    const remaining = shuffled.filter(e => !selected.includes(e));
    for (const exercise of remaining) {
      if (selected.length >= 5) break;
      if (!selected.includes(exercise)) {
        selected.push(exercise);
      }
    }
  }

  return selected.map(exercise => ({
    ...exercise,
    name: locale === 'zh' ? exercise.name : exercise.nameEn,
    instruction: locale === 'zh' ? exercise.instruction : exercise.instructionEn,
  }));
}
