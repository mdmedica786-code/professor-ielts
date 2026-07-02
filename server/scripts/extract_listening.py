import PyPDF2
import os

pdf_path = os.path.abspath(r"D:\NERD speaking\ielts-audios\80 IELTS Listening Tests.pdf")
out_path = os.path.abspath("listening_raw.txt")

text = []
try:
    with open(pdf_path, 'rb') as f:
        reader = PyPDF2.PdfReader(f)
        # Extract all pages
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text.append(page_text)
                
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(text))
    print(f"Extracted {len(text)} pages to {out_path}")
except Exception as e:
    print(f"Error: {e}")
