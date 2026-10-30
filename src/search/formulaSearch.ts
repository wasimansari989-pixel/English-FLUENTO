import { SentenceFormula, HelpingVerbGroup } from '../types/formula';
import { normalizeEnglish, normalizeHindi } from './normalize';
import formulasData from '../data/formulas.json';

export const allFormulas: SentenceFormula[] = formulasData as unknown as SentenceFormula[];

export interface SearchOptions {
  query?: string;
  category?: string;
  helpingVerb?: string;
  grammarTag?: string;
  limit?: number;
  offset?: number;
}

export function getAllFormulas(): SentenceFormula[] {
  return allFormulas;
}

export function getFormulaById(id: number): SentenceFormula | undefined {
  return allFormulas.find(f => f.id === id);
}

export function searchFormulas(options: SearchOptions = {}): SentenceFormula[] {
  const { query, category, helpingVerb, grammarTag, limit = 50, offset = 0 } = options;

  let results = allFormulas;

  // Filter by category
  if (category && category !== 'All') {
    results = results.filter(f => 
      f.category === category || (f.categories && f.categories.includes(category))
    );
  }

  // Filter by helping verb
  if (helpingVerb) {
    const hvNorm = helpingVerb.toLowerCase().trim();
    results = results.filter(f => 
      f.helpingVerbs && f.helpingVerbs.some(v => v.toLowerCase() === hvNorm)
    );
  }

  // Filter by grammar tag
  if (grammarTag) {
    const gtNorm = grammarTag.toLowerCase().trim();
    results = results.filter(f => 
      f.grammarTags && f.grammarTags.some(t => t.toLowerCase() === gtNorm)
    );
  }

  // Query search
  if (query && query.trim().length > 0) {
    const rawQ = query.trim();
    
    // Check if query is exact number like "207" or "#207" or "formula 207"
    const numMatch = rawQ.match(/^(?:#|formula\s*)?(\d+)$/i);
    if (numMatch) {
      const id = parseInt(numMatch[1], 10);
      const exact = results.find(f => f.id === id);
      if (exact) {
        return [exact];
      }
    }

    const normEngQ = normalizeEnglish(rawQ);
    const normHinQ = normalizeHindi(rawQ);

    const scored = results.map(formula => {
      let score = 0;

      // Exact ID match
      if (formula.id.toString() === rawQ) {
        score += 1000;
      }

      // Check English formula
      const normFormula = normalizeEnglish(formula.englishFormula);
      if (normFormula.includes(normEngQ)) {
        score += 500;
      }

      // Check Hindi meaning
      const normMeaning = normalizeHindi(formula.hindiMeaning);
      if (normMeaning.includes(normHinQ) || formula.hindiMeaning.includes(rawQ)) {
        score += 400;
      }

      // Check helping verbs
      if (formula.helpingVerbs && formula.helpingVerbs.some(hv => hv.toLowerCase().includes(normEngQ))) {
        score += 300;
      }

      // Check grammar tags
      if (formula.grammarTags && formula.grammarTags.some(gt => gt.toLowerCase().includes(normEngQ))) {
        score += 250;
      }

      // Check examples
      if (formula.examples) {
        for (let ex of formula.examples) {
          const exEng = normalizeEnglish(ex.originalEnglish || '');
          const exHin = normalizeHindi(ex.originalHindi || '');

          if (exEng.includes(normEngQ)) {
            score += 100;
            break;
          }
          if (exHin.includes(normHinQ) || (ex.originalHindi && ex.originalHindi.includes(rawQ))) {
            score += 100;
            break;
          }
        }
      }

      return { formula, score };
    });

    const filtered = scored.filter(s => s.score > 0);
    filtered.sort((a, b) => b.score - a.score || a.formula.id - b.formula.id);
    return filtered.slice(offset, offset + limit).map(s => s.formula);
  }

  return results.slice(offset, offset + limit);
}

export function getAllHelpingVerbs(): HelpingVerbGroup[] {
  const map: Record<string, number[]> = {};

  for (let f of allFormulas) {
    if (f.helpingVerbs) {
      for (let verb of f.helpingVerbs) {
        const v = verb.toLowerCase().trim();
        if (!map[v]) map[v] = [];
        if (!map[v].includes(f.id)) map[v].push(f.id);
      }
    }
  }

  return Object.keys(map)
    .sort()
    .map(verb => ({
      verb,
      count: map[verb].length,
      formulaIds: map[verb]
    }))
    .sort((a, b) => b.count - a.count);
}
