import fs from 'node:fs/promises';
import { SELECTIONS_FILE } from './config.js';
import type { SelectionState } from '../../shared/types.js';

export async function loadSelection(): Promise<SelectionState> {
  try {
    const txt = await fs.readFile(SELECTIONS_FILE, 'utf8');
    const parsed = JSON.parse(txt);
    if (parsed && typeof parsed === 'object' && parsed.byYear) return parsed as SelectionState;
  } catch {
    // not yet created
  }
  return { byYear: {} };
}

export async function saveSelection(state: SelectionState): Promise<void> {
  await fs.writeFile(SELECTIONS_FILE, JSON.stringify(state, null, 2));
}
