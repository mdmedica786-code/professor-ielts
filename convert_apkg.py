import sqlite3
import zipfile
import tempfile
import os
import glob
import re

def strip_html(text):
    clean = re.compile('<.*?>')
    return re.sub(clean, '', text).replace('&nbsp;', ' ').strip()

def process_apkg(apkg_path):
    print(f"\nProcessing {apkg_path}...")
    base_name = os.path.splitext(os.path.basename(apkg_path))[0]
    
    with tempfile.TemporaryDirectory() as tmpdirname:
        # Extract the .apkg (it's just a zip file)
        with zipfile.ZipFile(apkg_path, 'r') as zip_ref:
            zip_ref.extractall(tmpdirname)
        
        # Look for the SQLite database
        db_path = os.path.join(tmpdirname, 'collection.anki2')
        if not os.path.exists(db_path):
            db_path = os.path.join(tmpdirname, 'collection.anki21')
            
        if not os.path.exists(db_path):
            print("Error: Could not find Anki database in the .apkg file.")
            return

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT flds FROM notes")
        notes = cursor.fetchall()
        
        cards = []
        for index, note in enumerate(notes):
            fields = note[0].split('\x1f')
            
            front = strip_html(fields[0]) if len(fields) > 0 else ""
            back = strip_html(fields[1]) if len(fields) > 1 else ""
            
            # If the deck has more fields (like examples), append them to the back
            if len(fields) > 2:
                extra = []
                for f in fields[2:]:
                    clean_f = strip_html(f)
                    if clean_f:
                        extra.append(clean_f)
                if extra:
                    back += " | " + " | ".join(extra)
            
            if front and back:
                cards.append({
                    "id": f"{base_name.lower().replace(' ', '_')}_{index}",
                    "word": front,
                    "definition": back,
                    "example": "",
                    "collocations": [],
                    "tags": [base_name]
                })

        # Generate JSON file
        import json
        
        output_filename = f"{base_name.replace(' ', '')}.json"
        output_path = os.path.join('client', 'public', 'decks', output_filename)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(cards, f, indent=2)
            
        # Update manifest.json
        manifest_path = os.path.join('client', 'public', 'decks', 'manifest.json')
        manifest = []
        if os.path.exists(manifest_path):
            with open(manifest_path, 'r', encoding='utf-8') as f:
                manifest = json.load(f)
                
        deck_id = base_name.lower().replace(' ', '_')
        
        # Remove if already exists
        manifest = [m for m in manifest if m['id'] != deck_id]
        
        manifest.append({
            "id": deck_id,
            "title": base_name.replace('_', ' '),
            "count": len(cards),
            "file": output_filename
        })
        
        with open(manifest_path, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=2)
            
        print(f"Success! Extracted {len(cards)} cards.")
        print(f"Saved to: {output_path}")

if __name__ == '__main__':
    apkg_files = glob.glob('decks/*.apkg')
    if not apkg_files:
        print("No .apkg files found in the 'decks' folder.")
        print("Please place your Anki decks in 'd:\\NERD speaking\\bandlogic-real\\decks\\' and run this script again.")
    else:
        for f in apkg_files:
            try:
                process_apkg(f)
            except Exception as e:
                print(f"Error processing {f}: {e}")
