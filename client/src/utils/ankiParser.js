import initSqlJs from 'sql.js';
import JSZip from 'jszip';

export async function parseApkg(file) {
  // 1. Load the ZIP file
  const zip = new JSZip();
  await zip.loadAsync(file);

  // 2. Find the database file
  let dbFile = zip.file('collection.anki21');
  if (!dbFile) {
    dbFile = zip.file('collection.anki2');
  }
  
  if (!dbFile) {
    throw new Error('Invalid .apkg file: could not find collection.anki2');
  }

  const dbData = await dbFile.async('uint8array');

  // 3. Initialize sql.js
  const SQL = await initSqlJs({
    locateFile: file => `/${file}` // Fetches sql-wasm.wasm from /public
  });
  
  const db = new SQL.Database(dbData);

  // 4. Extract Models (Templates)
  const colQuery = db.exec("SELECT models FROM col");
  const modelsJson = JSON.parse(colQuery[0].values[0][0]);
  const models = Object.values(modelsJson).reduce((acc, model) => {
    acc[model.id] = model;
    return acc;
  }, {});

  // 5. Extract Notes and Cards
  const cardsQuery = db.exec(`
    SELECT c.id, c.nid, c.did, c.ord, c.mod, c.usn, c.type, c.queue, c.due, c.ivl, c.factor, c.reps, c.lapses, c.left, c.odue, c.odid, c.flags, c.data,
           n.mid, n.flds, n.sfld, n.csum, n.flags, n.data
    FROM cards c
    JOIN notes n ON c.nid = n.id
  `);
  
  const cards = [];
  if (cardsQuery.length > 0) {
    const columns = cardsQuery[0].columns;
    const values = cardsQuery[0].values;
    
    for (const row of values) {
      const card = {};
      columns.forEach((col, idx) => {
        card[col] = row[idx];
      });
      cards.push(card);
    }
  }

  // 6. Extract Media mapping
  const mediaFile = zip.file('media');
  let mediaMap = {};
  if (mediaFile) {
    const mediaContent = await mediaFile.async('string');
    try {
      mediaMap = JSON.parse(mediaContent); // e.g. {"0": "image.jpg", "1": "audio.mp3"}
    } catch (e) {
      console.warn('Failed to parse media mapping:', e);
    }
  }

  // 7. Extract actual Media Blobs
  const mediaFiles = {};
  for (const [zipKey, filename] of Object.entries(mediaMap)) {
    const mFile = zip.file(zipKey);
    if (mFile) {
      mediaFiles[filename] = await mFile.async('blob');
    }
  }

  db.close();

  return {
    models,
    cards,
    mediaMap,
    mediaFiles
  };
}
