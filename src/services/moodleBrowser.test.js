const test = require('node:test');
const assert = require('node:assert/strict');

const { parseGradeRowsFromHtml } = require('./moodleBrowser');

test('parseGradeRowsFromHtml extracts real Moodle grade rows and ignores summary rows', () => {
  const html = `
    <table>
      <tr><th>Élément d’évaluation</th><th>Note</th><th>Valeurs possibles</th></tr>
      <tr><td>Devoir Installation pratique de Debian GNU/Linux</td><td>0,00 % (vide)</td><td>0–20</td></tr>
      <tr><td>Test QCM #1 Archi OS Cyber1</td><td>7,23 Actions Analyse de l’évaluation</td><td>0–20</td></tr>
      <tr><td>Moyenne des notes</td><td>7,23</td><td>0–20</td></tr>
    </table>
  `;

  const result = parseGradeRowsFromHtml(html, 'S01 Architecture OS B1 Cyber');
  assert.equal(result.length, 2);
  assert.equal(result[0].assessment, 'Installation pratique de Debian GNU/Linux');
  assert.equal(result[1].assessment, 'QCM #1 Archi OS Cyber1');
  assert.equal(result[1].grade, 7.23);
  assert.equal(result[1].max_grade, 20);
});
