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

        # Generate JS file
        js_content = f"// Auto-generated from {base_name}.apkg\n\nexport const {base_name.upper().replace(' ', '_')}_DECK = [\n"
        for card in cards:
            js_content += "  {\n"
            js_content += f"    id: `{card['id']}`,\n"
            # Escape backticks and backslashes
            front_esc = card['word'].replace('\\', '\\\\').replace('`', '\\`')
            back_esc = card['definition'].replace('\\', '\\\\').replace('`', '\\`')
            js_content += f"    word: `{front_esc}`,\n"
            js_content += f"    definition: `{back_esc}`,\n"
            js_content += f"    example: ``,\n"
            js_content += f"    collocations: [],\n"
            js_content += f"    tags: ['{card['tags'][0]}']\n"
            js_content += "  },\n"
        js_content += "];\n"

        output_path = os.path.join('client', 'src', 'data', f"{base_name.replace(' ', '')}Deck.js")
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(js_content)
            
        print(f"Success! Extracted {len(cards)} cards.")
        print(f"Saved to: {output_path}")

if __name__ == '__main__':
    apkg_files = glob.glob('decks/*.apkg')
    if not apkg_files:
        print("No .apkg files found in the 'decks' folder.")
        print("Please place your Anki decks in 'd:\\NERD speaking\\bandlogic-real\\decks\\' and run this script again.")
    else:
        for f in apkg_files:
            process_apkg(f)
