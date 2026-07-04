/**
 * @fileoverview Generic repeatable-array helpers for the resume wizard steps.
 * Replaces the ~6 hand-rolled add/update/remove function sets that existed
 * per section (workExperience, education, projects, certifications, languages,
 * and nested description bullets) in the old ResumeTemplateBuilder.
 */

/** For arrays of objects (workExperience, education, projects). */
export function useFieldArray<T>(list: T[], onChange: (next: T[]) => void) {
  const add = (item: T) => onChange([...list, item]);

  const update = (index: number, patch: Partial<T>) => {
    const next = [...list];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(list.filter((_, i) => i !== index));
  };

  return { add, update, remove };
}

/** For arrays of primitive strings (skills, certifications, languages, description bullets). */
export function useStringArrayField(list: string[], onChange: (next: string[]) => void) {
  const add = (value = "") => onChange([...list, value]);

  const update = (index: number, value: string) => {
    const next = [...list];
    next[index] = value;
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(list.filter((_, i) => i !== index));
  };

  return { add, update, remove };
}
