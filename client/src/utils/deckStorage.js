import localforage from 'localforage';

// Configure stores for different data types
const decksStore = localforage.createInstance({
  name: 'BandLogicDecks',
  storeName: 'decks'
});

const mediaStore = localforage.createInstance({
  name: 'BandLogicDecks',
  storeName: 'media'
});

// Media storage functions
export async function saveMedia(filename, blob) {
  await mediaStore.setItem(filename, blob);
}

export async function getMediaUrl(filename) {
  const blob = await mediaStore.getItem(filename);
  if (blob) {
    return URL.createObjectURL(blob);
  }
  return null;
}

export async function saveMediaBatch(mediaFilesMap) {
  const promises = Object.entries(mediaFilesMap).map(([filename, blob]) => 
    saveMedia(filename, blob)
  );
  await Promise.all(promises);
}

// Deck storage functions
export async function saveDeck(deckId, deckData) {
  // deckData should contain { id, title, models, cards }
  await decksStore.setItem(deckId, deckData);
  
  // Update manifest
  const manifest = await getManifest();
  const existingIndex = manifest.findIndex(m => m.id === deckId);
  
  const manifestEntry = {
    id: deckId,
    title: deckData.title,
    count: deckData.cards.length,
    timestamp: Date.now()
  };
  
  if (existingIndex >= 0) {
    manifest[existingIndex] = manifestEntry;
  } else {
    manifest.push(manifestEntry);
  }
  
  await decksStore.setItem('_manifest', manifest);
}

export async function getDeck(deckId) {
  return await decksStore.getItem(deckId);
}

export async function getManifest() {
  const manifest = await decksStore.getItem('_manifest');
  return manifest || [];
}

export async function deleteDeck(deckId) {
  await decksStore.removeItem(deckId);
  const manifest = await getManifest();
  const newManifest = manifest.filter(m => m.id !== deckId);
  await decksStore.setItem('_manifest', newManifest);
}

// Progress saving
export async function updateCardProgress(deckId, cardId, progressData) {
  const deck = await getDeck(deckId);
  if (!deck) return;
  
  // Find card and update it
  const cardIndex = deck.cards.findIndex(c => c.id === cardId);
  if (cardIndex >= 0) {
    deck.cards[cardIndex] = {
      ...deck.cards[cardIndex],
      ...progressData
    };
    await decksStore.setItem(deckId, deck);
  }
}
