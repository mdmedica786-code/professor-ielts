import PyPDF2
import os

pdf_path = os.path.abspath("../../../Kiran_Makkar's_Speaking_Cue_Cards_May_Aug_2023_Final_Version_22.pdf")
out_path = os.path.abspath("makkar_raw.txt")

text = []
with open(pdf_path, 'rb') as f:
    reader = PyPDF2.PdfReader(f)
    print(f"Extracting {len(reader.pages)} pages...")
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text.append(page_text)

with open(out_path, 'w', encoding='utf-8') as f:
    f.write("\n".join(text))

print(f"Raw text saved to {out_path}")
