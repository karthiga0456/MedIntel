import re
import io
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from PIL import Image
import pytesseract
import pypdf

from app.core.logging import get_logger
from app.db.models import LabReport, LabResult, Patient
from app.modules.labs.schemas import LabResultItem, LabReportUploadResponse, LabReportResponse

logger = get_logger(__name__)

LAB_DISCLAIMER = (
    "⚠️ Automated lab report interpretation is an AI-assisted informational triage tool "
    "and does NOT constitute a final medical diagnosis. Clinical findings must always be "
    "reviewed by a qualified physician or registered medical laboratory professional."
)

# Reference definitions: (min_normal, max_normal, critical_low, critical_high, unit, default_range_str)
REFERENCE_RANGES: Dict[str, Dict[str, Any]] = {
    "hemoglobin": {"name": "Hemoglobin", "min": 12.0, "max": 17.5, "crit_low": 7.0, "crit_high": 20.0, "unit": "g/dL", "range_str": "12.0 - 17.5 g/dL"},
    "wbc": {"name": "WBC Count", "min": 4000, "max": 11000, "crit_low": 2000, "crit_high": 30000, "unit": "/mcL", "range_str": "4,000 - 11,000 /mcL"},
    "platelets": {"name": "Platelet Count", "min": 150000, "max": 450000, "crit_low": 50000, "crit_high": 1000000, "unit": "/mcL", "range_str": "150,000 - 450,000 /mcL"},
    "fasting glucose": {"name": "Fasting Blood Glucose", "min": 70.0, "max": 99.0, "crit_low": 50.0, "crit_high": 300.0, "unit": "mg/dL", "range_str": "70 - 99 mg/dL"},
    "postprandial glucose": {"name": "Post-Prandial Glucose", "min": 70.0, "max": 140.0, "crit_low": 50.0, "crit_high": 350.0, "unit": "mg/dL", "range_str": "70 - 140 mg/dL"},
    "hba1c": {"name": "HbA1c", "min": 4.0, "max": 5.6, "crit_low": 3.0, "crit_high": 10.0, "unit": "%", "range_str": "4.0 - 5.6 %"},
    "cholesterol": {"name": "Total Cholesterol", "min": 125.0, "max": 200.0, "crit_low": 90.0, "crit_high": 300.0, "unit": "mg/dL", "range_str": "125 - 200 mg/dL"},
    "triglycerides": {"name": "Triglycerides", "min": 50.0, "max": 150.0, "crit_low": 30.0, "crit_high": 500.0, "unit": "mg/dL", "range_str": "50 - 150 mg/dL"},
    "creatinine": {"name": "Serum Creatinine", "min": 0.6, "max": 1.2, "crit_low": 0.3, "crit_high": 4.0, "unit": "mg/dL", "range_str": "0.6 - 1.2 mg/dL"},
    "urea": {"name": "Blood Urea", "min": 15.0, "max": 40.0, "crit_low": 10.0, "crit_high": 100.0, "unit": "mg/dL", "range_str": "15 - 40 mg/dL"},
    "bilirubin": {"name": "Total Bilirubin", "min": 0.2, "max": 1.2, "crit_low": 0.1, "crit_high": 5.0, "unit": "mg/dL", "range_str": "0.2 - 1.2 mg/dL"},
    "sgpt": {"name": "SGPT / ALT", "min": 7.0, "max": 56.0, "crit_low": 3.0, "crit_high": 200.0, "unit": "U/L", "range_str": "7 - 56 U/L"},
    "sgot": {"name": "SGOT / AST", "min": 10.0, "max": 40.0, "crit_low": 5.0, "crit_high": 200.0, "unit": "U/L", "range_str": "10 - 40 U/L"},
    "tsh": {"name": "TSH", "min": 0.4, "max": 4.0, "crit_low": 0.1, "crit_high": 15.0, "unit": "mIU/L", "range_str": "0.4 - 4.0 mIU/L"},
}


def classify_biomarker(test_key: str, value: float) -> str:
    ref = REFERENCE_RANGES.get(test_key)
    if not ref:
        return "NORMAL"
    if value <= ref["crit_low"] or value >= ref["crit_high"]:
        return "CRITICAL"
    if value < ref["min"]:
        return "LOW"
    if value > ref["max"]:
        return "HIGH"
    return "NORMAL"


class LabAnalyzerService:
    def extract_text(self, filename: str, content: bytes) -> str:
        ext = filename.split(".")[-1].lower()
        text = ""
        if ext == "pdf":
            try:
                reader = pypdf.PdfReader(io.BytesIO(content))
                for page in reader.pages:
                    text += (page.extract_text() or "") + "\n"
            except Exception as e:
                logger.error(f"Error reading PDF: {e}")
        elif ext in ["png", "jpg", "jpeg"]:
            try:
                img = Image.open(io.BytesIO(content))
                text = pytesseract.image_to_string(img)
            except Exception as e:
                logger.error(f"Error in OCR: {e}")
        elif ext in ["txt", "csv", "log"]:
            text = content.decode("utf-8", errors="ignore")
        return text

    def parse_biomarkers(self, text: str) -> List[LabResultItem]:
        results: List[LabResultItem] = []
        text_lower = text.lower()

        # Regular expressions matching biomarker labels followed by numbers
        for key, meta in REFERENCE_RANGES.items():
            pattern = rf"(?:{key}|{meta['name'].lower()})\s*[:\-=]?\s*([0-9]+(?:\.[0-9]+)?)"
            match = re.search(pattern, text_lower)
            if match:
                try:
                    val = float(match.group(1))
                    status = classify_biomarker(key, val)
                    results.append(
                        LabResultItem(
                            test_name=meta["name"],
                            value=val,
                            unit=meta["unit"],
                            reference_range=meta["range_str"],
                            status=status,
                        )
                    )
                except ValueError:
                    continue

        # If standard report parsing yielded fewer than expected markers, scan for generic key: value pairs
        if not results:
            lines = text.split("\n")
            for line in lines:
                parts = re.split(r"[:\t|]", line)
                if len(parts) >= 2:
                    k = parts[0].strip()
                    num_match = re.search(r"([0-9]+(?:\.[0-9]+)?)", parts[1])
                    if num_match and len(k) > 2 and len(k) < 30:
                        try:
                            val = float(num_match.group(1))
                            results.append(
                                LabResultItem(
                                    test_name=k.title(),
                                    value=val,
                                    unit="units",
                                    reference_range="Standard Range",
                                    status="NORMAL" if val < 200 else "HIGH",
                                )
                            )
                        except ValueError:
                            pass

        return results

    def process_and_save_report(
        self,
        db: Session,
        patient_id: str,
        filename: str,
        content: bytes,
        test_type: str = "Complete Blood Count (CBC)"
    ) -> LabReportUploadResponse:
        text = self.extract_text(filename, content)
        extracted_results = self.parse_biomarkers(text)

        # Build automated clinical summary
        abnormal = [r for r in extracted_results if r.status in ["LOW", "HIGH", "CRITICAL"]]
        if abnormal:
            abnormal_notes = ", ".join([f"{r.test_name} ({r.value} {r.unit} - {r.status})" for r in abnormal])
            summary = f"Detected {len(abnormal)} biomarker(s) outside reference ranges: {abnormal_notes}."
        else:
            summary = "All detected lab biomarkers fall within standard reference intervals."

        # Create LabReport record
        report = LabReport(
            patient_id=patient_id,
            title=filename,
            test_type=test_type,
            report_date=datetime.utcnow(),
            ocr_extracted_text=text[:1000] if text else "Raw file archived",
            summary=summary,
        )
        db.add(report)
        db.commit()
        db.refresh(report)

        # Create LabResult child records
        for res in extracted_results:
            lab_res = LabResult(
                lab_report_id=report.id,
                patient_id=patient_id,
                test_name=res.test_name,
                value=res.value,
                unit=res.unit,
                reference_range=res.reference_range,
                status=res.status,
                date=datetime.utcnow(),
            )
            db.add(lab_res)
        db.commit()

        return LabReportUploadResponse(
            id=report.id,
            patient_id=patient_id,
            title=report.title,
            test_type=report.test_type,
            report_date=report.report_date,
            summary=summary,
            disclaimer=LAB_DISCLAIMER,
            results=extracted_results,
        )

    def get_patient_lab_history(self, db: Session, patient_id: str) -> Dict[str, Any]:
        reports = db.query(LabReport).filter(LabReport.patient_id == patient_id).order_by(LabReport.report_date.desc()).all()
        report_list = []
        for r in reports:
            items = [
                LabResultItem(
                    test_name=res.test_name,
                    value=res.value,
                    unit=res.unit,
                    reference_range=res.reference_range or "Standard",
                    status=res.status,
                )
                for res in r.results
            ]
            report_list.append(
                LabReportResponse(
                    id=r.id,
                    patient_id=r.patient_id,
                    title=r.title,
                    test_type=r.test_type,
                    report_date=r.report_date,
                    summary=r.summary,
                    created_at=r.created_at,
                    results=items,
                )
            )

        # Group biomarker trends chronologically
        results = db.query(LabResult).filter(LabResult.patient_id == patient_id).order_by(LabResult.date.asc()).all()
        trends: Dict[str, List[Dict[str, Any]]] = {}
        for res in results:
            if res.test_name not in trends:
                trends[res.test_name] = []
            trends[res.test_name].append({
                "date": res.date.strftime("%Y-%m-%d"),
                "value": res.value,
                "unit": res.unit,
                "status": res.status,
            })

        return {
            "patient_id": patient_id,
            "reports": report_list,
            "biomarker_trends": trends,
        }


lab_analyzer_service = LabAnalyzerService()
