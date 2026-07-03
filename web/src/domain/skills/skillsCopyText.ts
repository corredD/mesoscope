/**
 * Port of js/main.js: getMesoscopeBaseUrl, buildRecipeSkillsCopyText,
 * confirmSkillsSafetyDisclaimer (main.js:1731-1817). Pure string-building,
 * decoupled from the fetch/clipboard/confirm() calls in
 * components/skills/SkillMenu.tsx.
 */

export function getMesoscopeBaseUrl(loc: { origin: string; pathname: string } = window.location): string {
  const origin = loc.origin
  let path = loc.pathname || '/'
  if (path.lastIndexOf('/') !== path.length - 1) path = path.substring(0, path.lastIndexOf('/') + 1)
  return origin + path
}

export function buildRecipeSkillsCopyText(skillText: string, baseUrl: string): string {
  return [
    'Use the following Mesoscope recipe skill to generate a recipe I can load in Mesoscope.',
    '',
    'Required final outputs:',
    '1. A serialized JSON recipe file named codex_recipe_serialized.json.',
    '2. A review CSV named codex_recipe.csv.',
    '3. A compact import CSV named codex_recipe_import.csv.',
    '4. A notes file named codex_recipe_notes.md.',
    '5. A Mesoscope direct URL using this exact pattern for small recipes:',
    `${baseUrl}?recipe_json=<encodeURIComponent(JSON.stringify(serializedRecipeJson))>&recipe_format=serialized`,
    '',
    'For larger recipes, tell me to POST the serialized JSON to:',
    `${baseUrl}recipe_json`,
    '',
    'When using a recipe file URL, pass only an absolute http:// or https:// URL. Do not use local filesystem paths or file:// URLs.',
    '',
    'After generating the JSON, also provide a minified URL-encoded version in the recipe_json parameter so I can paste the URL directly into Mesoscope.',
    '',
    '--- BEGIN MESOSCOPE SKILL ---',
    skillText,
    '--- END MESOSCOPE SKILL ---',
  ].join('\n')
}

export const SKILLS_SAFETY_DISCLAIMER = [
  'Mesoscope LLM Recipe Skill — Safety Notice',
  '',
  'This skill is strictly for computational 3D visualization and educational',
  'modeling. All outputs are static digital scene files (CSV, JSON, MD) for',
  'Mesoscope, cellPACK, Mol*, Blender, Unity, etc. No wet-lab protocols,',
  'genetic sequences for synthesis, or engineering instructions are produced.',
  '',
  'Heads up: recent safety-tuned LLMs (e.g. Claude Opus 4.7, Claude Haiku 4.5,',
  'GPT-5.5) may still flag or refuse this prompt — especially when a smaller',
  'model is dispatched (Opus 4.7 routing to Haiku 4.5, etc.) — because it',
  'references viruses, genomes, and nucleic acids. If your model refuses,',
  'try a model with a longer/structural-biology context, or run it with the',
  "prompt's safety disclaimer kept in place.",
  '',
  'Continue and copy/open the skill?',
].join('\n')
