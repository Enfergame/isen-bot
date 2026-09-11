function normalizeText(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function toNumber(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  const normalized = String(value).replace(',', '.').replace(/\s+/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pickDate(value) {
  const candidates = [
    value?.date,
    value?.datetime,
    value?.dateNote,
    value?.createdAt,
    value?.evaluationDate,
    value?.dateEvaluation,
    value?.rawDate,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const text = normalizeText(candidate);
    if (text) return text;
  }

  return '';
}

function pickSubject(value) {
  return normalizeText(
    value?.subject ||
      value?.matiere ||
      value?.course ||
      value?.courseName ||
      value?.module ||
      value?.discipline ||
      value?.className ||
      value?.matter
  );
}

function pickAssessment(value) {
  return normalizeText(
    value?.assessment ||
      value?.name ||
      value?.evaluation ||
      value?.label ||
      value?.activity ||
      value?.test ||
      value?.title ||
      value?.item
  );
}

function pickCode(value) {
  return normalizeText(
    value?.code ||
      value?.id ||
      value?.identifier ||
      value?.activityId ||
      value?.itemId ||
      value?.gradeId ||
      value?.uuid ||
      value?.noteId
  );
}

function pickGrade(value) {
  const percentValue =
    toNumber(value?.grade) ??
    toNumber(value?.note) ??
    toNumber(value?.value) ??
    toNumber(value?.score) ??
    toNumber(value?.result) ??
    toNumber(value?.mark) ??
    toNumber(value?.note_obtenue) ??
    toNumber(value?.obtenue) ??
    toNumber(value?.gradeValue);

  return percentValue;
}

function pickMaxGrade(value) {
  return (
    toNumber(value?.max_grade) ??
    toNumber(value?.maxGrade) ??
    toNumber(value?.maximum) ??
    toNumber(value?.max) ??
    toNumber(value?.total) ??
    toNumber(value?.totalGrade) ??
    toNumber(value?.grade_max)
  );
}

function pickCoefficient(value) {
  return (
    toNumber(value?.coefficient) ??
    toNumber(value?.coef) ??
    toNumber(value?.weight) ??
    toNumber(value?.coeff)
  );
}

function normalizeGrade(rawGrade) {
  if (!rawGrade || typeof rawGrade !== 'object') return null;

  const subject = pickSubject(rawGrade) || 'Matière';
  const assessment = pickAssessment(rawGrade) || 'Évaluation';
  const grade = pickGrade(rawGrade);
  const maxGrade = pickMaxGrade(rawGrade);
  const coefficient = pickCoefficient(rawGrade);
  const date = pickDate(rawGrade) || 'Date inconnue';
  const code = pickCode(rawGrade) || `${subject}::${assessment}::${date}`;

  return {
    subject,
    assessment,
    grade,
    max_grade: maxGrade,
    coefficient,
    date,
    code,
  };
}

function summarizeNotes(rawGrades = []) {
  return (Array.isArray(rawGrades) ? rawGrades : [])
    .map(normalizeGrade)
    .filter(Boolean)
    .sort((a, b) => {
      const dateA = Date.parse(a.date) || 0;
      const dateB = Date.parse(b.date) || 0;
      return dateB - dateA;
    });
}

function makeGradeSignature(grade) {
  const source = grade || {};
  const subject = normalizeText(source.subject || source.course || source.matiere || '').toLowerCase();
  const assessment = normalizeText(source.assessment || source.name || source.evaluation || source.label || '').toLowerCase();
  const code = normalizeText(source.code || source.id || source.identifier || source.activityId || '').toLowerCase();
  const date = normalizeText(source.date || '').toLowerCase();
  return JSON.stringify([code || `${subject}|${assessment}|${date}`, subject, assessment, date]);
}

function getNewNotes(currentGrades = [], previousGrades = []) {
  const previousKeys = new Set(
    summarizeNotes(previousGrades).map((grade) => makeGradeSignature(grade))
  );

  return summarizeNotes(currentGrades).filter(
    (grade) => !previousKeys.has(makeGradeSignature(grade))
  );
}

module.exports = {
  normalizeGrade,
  summarizeNotes,
  makeGradeSignature,
  getNewNotes,
};
