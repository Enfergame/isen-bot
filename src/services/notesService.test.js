const test = require('node:test');
const assert = require('node:assert/strict');

const { summarizeNotes, getNewNotes, makeGradeSignature } = require('./notesService');

test('summarizeNotes formats a grade payload', () => {
  const grades = [
    {
      date: '2026-09-10',
      name: 'DS 2',
      subject: 'Mathématiques',
      note: 15.5,
      max: 20,
      coefficient: 2,
      code: 'MATH-DS2',
      teachers: ['M. Dupont'],
    },
  ];

  const result = summarizeNotes(grades);
  assert.equal(result.length, 1);
  assert.equal(result[0].subject, 'Mathématiques');
  assert.equal(result[0].assessment, 'DS 2');
  assert.equal(result[0].grade, 15.5);
  assert.equal(result[0].max_grade, 20);
  assert.equal(result[0].coefficient, 2);
  assert.equal(result[0].date, '2026-09-10');
});

test('getNewNotes ignores duplicates and keeps only new ones', () => {
  const current = [
    { date: '2026-09-10', name: 'DS 2', subject: 'Mathématiques', note: 15.5, max: 20, code: 'MATH-DS2' },
    { date: '2026-09-12', name: 'DS 3', subject: 'Mathématiques', note: 18, max: 20, code: 'MATH-DS3' },
  ];
  const previous = [
    { date: '2026-09-10', name: 'DS 2', subject: 'Mathématiques', note: 15.5, max: 20, code: 'MATH-DS2' },
  ];

  const result = getNewNotes(current, previous);
  assert.equal(result.length, 1);
  assert.equal(result[0].code, 'MATH-DS3');
});

test('makeGradeSignature remains stable for equivalent grades', () => {
  const a = { date: '2026-09-10', name: 'DS 2', subject: 'Mathématiques', code: 'MATH-DS2' };
  const b = { date: '2026-09-10', name: 'DS 2', subject: 'Mathématiques', code: 'MATH-DS2' };

  assert.equal(makeGradeSignature(a), makeGradeSignature(b));
});
