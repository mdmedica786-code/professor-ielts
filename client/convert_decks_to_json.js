import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Since the project is using Vite/ESModules, we can import them dynamically if we create a quick package.json
// But it's easier to just read the file and strip the "export const NAME = " part.

// Actually, since client is type=module, we can just import them!
import { IELTS_STARTER_DECK } from './src/data/ieltsVocab.js';
import { COLLOCATIONS_DECK } from './src/data/collocationsDeck.js';
import { CAMBRIDGE_VOCABULARY_FOR_IELTS_ADVANCED_DECK } from './src/data/Cambridge_Vocabulary_for_IELTS_AdvancedDeck.js';

fs.writeFileSync('./public/decks/starter.json', JSON.stringify(IELTS_STARTER_DECK, null, 2));
fs.writeFileSync('./public/decks/collocations.json', JSON.stringify(COLLOCATIONS_DECK, null, 2));
fs.writeFileSync('./public/decks/cambridge_advanced.json', JSON.stringify(CAMBRIDGE_VOCABULARY_FOR_IELTS_ADVANCED_DECK, null, 2));

console.log("Successfully converted all decks to JSON!");
