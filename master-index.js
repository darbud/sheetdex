// Master index builder

import fs from 'fs';
import normalize from 'nlcst-normalize';
import indexBookIndices from './book-indices';
import indexJameyAebersold from './jamey-aebersold';
import indexGuitarTechniques from './guitar-techniques';
import indexRealBookSongFinder from './realbook-songfinder';
import indexBobKeller from './bob-keller';
import indexJazzStandardsAZ from './jazz-standards-az';

// Global variable to report on conflicting information only once, in non-DEBUG mode.
let _conflict = false;

export default function index() {
  // Read cached index first.
  try {
    return JSON.parse(fs.readFileSync('./books/master-index.json', 'utf8'));
  }
  catch (e) {
    // It's ok: we'll create the index from scratch.
    if (process.env.DEBUG) console.log('DEBUG: Master index cache not found. Recreating...')
  }

  // Otherwise rebuild it and save it.
  const masterIndex = Array.from(indexBookIndices()
  .concat(indexRealBookSongFinder())
  .concat(indexBobKeller())
  .concat(indexJameyAebersold())
  .concat(indexGuitarTechniques())
  .concat(indexJazzStandardsAZ())
  .reduce((map, book) => {
    // Merge books and sheets from different indexes
    // Detect collision by book title normalized match
    // Don't lose information
    // Report on conflicting information
    const key = normalize(book.title);
    const existingBook = map.get(key);
    if (existingBook) {
      // Merge book notes
      // just concatenate them for now
      book.notes = (existingBook.notes || book.notes) ? [].concat(existingBook.notes, book.notes).filter(n => n) : undefined;

      // Merge sheets
      // Iterate on them and find collisions
      book.sheets = Array.from(existingBook.sheets.concat(book.sheets).reduce((sheetMap, sheet) => {
        // Merge sheets
        // Detect collision by sheet title normalized match
        const sheetKey = normalize(sheet.title);
        const existingSheet = sheetMap.get(sheetKey);
        if (existingSheet) {
          // Merge sheet page
          // Report conflict if they differ
          if (existingSheet.page && sheet.page && existingSheet.page !== sheet.page) {
            if (process.env.DEBUG) {
              console.error(`WARNING: Sheet "${sheet.title}" in book "${book.title}" in ${existingBook.index} has page ${existingSheet.page} whereas in index ${book.index} it has page ${sheet.page}.`);
            } else {
              if (!_conflict) {
                // Warn the user once.
                console.error('WARNING: At least one sheet has conflicts in the index. Turn on DEBUG envvar to see more details.');
                _conflict = true;
              }
            }
            sheet.page = [].concat(existingSheet.page, sheet.page);
          } else {
            sheet.page = existingSheet.page || sheet.page || undefined;
          }

          // Merge sheet notes
          // just concatenate them for now
          sheet.notes = (existingSheet.notes || sheet.notes) ? [].concat(existingSheet.notes, sheet.notes).filter(n => n) : undefined;
        }
        sheetMap.set(sheetKey, sheet);
        return sheetMap;
      }, new Map()).values());

      // Concat new index name
      book.index = [].concat(existingBook.index, book.index);
    }
    map.set(key, book);
    return map;
  }, new Map()).values());

  fs.writeFileSync('./books/master-index.json', JSON.stringify(masterIndex, null, 2));
  return masterIndex;
}
