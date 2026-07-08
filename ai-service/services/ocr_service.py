import os
import re

class OCRService:
    """
    OCR (Optical Character Recognition) service using EasyOCR.
    Extracts text fragments, serial numbers, ID card codes, brand labels.
    Provides graceful stubs if easyocr/torch is not installed.
    """
    def __init__(self):
        self.use_stub = True
        try:
            import easyocr
            self.reader = easyocr.Reader(['en'])
            self.use_stub = False
            print("📄 OCRService: EasyOCR reader initialized successfully.")
        except Exception:
            print("⚠️  OCRService: EasyOCR load failed. Using metadata-regex text scanner stub.")

    def extract_text(self, image_path: str) -> str:
        """
        Extracts alphanumeric strings and readable text from an image.
        Returns a single space-separated string of findings.
        """
        if not os.path.exists(image_path):
            return ""

        if self.use_stub:
            # High-fidelity stub: scan filename, directory path and generate fake serial numbers/text
            # matching classic ID forms or metadata signatures.
            filename = os.path.basename(image_path).lower()
            text_findings = []
            
            # Simulate OCR findings based on item categories
            if "phone" in filename or "electronics" in filename:
                text_findings.extend(["S/N: Apple iPhone 15", "IMEI: 358487920194883", "MODEL: A3106"])
            elif "wallet" in filename or "card" in filename or "id" in filename:
                text_findings.extend(["STATE IDENTITY CARD", "NAME: DEMO USER", "ID: DL-87429104", "DOB: 12/04/1995"])
            elif "passport" in filename:
                text_findings.extend(["REPUBLIC OF INDIA PASSPORT", "P127492A", "NATIONALITY: IND"])
            else:
                # Mock generic serial numbers/markings
                text_findings.extend(["MADE IN CHINA", "S/N: 2026-XQ58291", "QC PASSED"])
            
            return " | ".join(text_findings)
        else:
            try:
                # Execute EasyOCR
                results = self.reader.readtext(image_path)
                # results is a list of tuples: (bbox, text, prob_score)
                lines = [res[1] for res in results if res[2] > 0.45]
                return " ".join(lines)
            except Exception as e:
                print(f"Error in EasyOCR execution: {str(e)}")
                return ""

ocr_service = OCRService()
