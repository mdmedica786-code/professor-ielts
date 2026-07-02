import fitz  # PyMuPDF
import os
import json
import re

pdf_path = os.path.abspath(r"D:\NERD speaking\ielts-audios\80 IELTS Listening Tests.pdf")
json_path = os.path.abspath("listening_parsed.json")
output_dir = os.path.abspath("extracted_images")

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

# Load the parsed JSON
with open(json_path, 'r', encoding='utf-8') as f:
    tests = json.load(f)

doc = fitz.open(pdf_path)

current_test = None
test_regex = re.compile(r'TEST\s+(\d+)', re.IGNORECASE)

image_count = 0

for page_num in range(len(doc)):
    page = doc.load_page(page_num)
    text = page.get_text("text")
    
    # Try to find which test this page belongs to
    # A page might have "TEST X". We find the last one on the page.
    matches = test_regex.findall(text)
    if matches:
        current_test = int(matches[-1])
        
    if current_test is None:
        continue
        
    # Get all images on this page
    image_list = page.get_images(full=True)
    
    if image_list:
        print(f"[+] Found {len(image_list)} images on page {page_num} for Test {current_test}")
        for img_index, img in enumerate(image_list):
            xref = img[0]
            base_image = doc.extract_image(xref)
            image_bytes = base_image["image"]
            image_ext = base_image["ext"]
            
            # Avoid extracting tiny logos or artifacts (e.g. less than 5KB or very small dimensions)
            # The "Proper English School" logo might be on every page.
            if len(image_bytes) < 5000:
                continue
                
            image_name = f"Test_{current_test}_map_{img_index}.{image_ext}"
            image_filepath = os.path.join(output_dir, image_name)
            
            with open(image_filepath, "wb") as img_file:
                img_file.write(image_bytes)
                
            # Add to our JSON structure
            test_obj = next((t for t in tests if t['testNumber'] == current_test), None)
            if test_obj:
                if 'images' not in test_obj:
                    test_obj['images'] = []
                test_obj['images'].append(image_filepath)
                image_count += 1

# Save the updated JSON
with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(tests, f, indent=2)

print(f"Extraction complete! Extracted {image_count} meaningful images and linked them to listening_parsed.json.")
