import re
from typing import Dict, List, Any, Optional
import pandas as pd
import numpy as np

def clean_cell_str(val: Any) -> str:
    if val is None or pd.isna(val):
        return ""
    s = str(val).strip()
    if s.lower() in ["nan", "none", "null", "—", "-", "n/a", "not verified"]:
        return ""
    # Remove float decimal if it looks like a phone number or int, e.g. "8632343000.0"
    if re.match(r"^\d+\.0$", s):
        s = s[:-2]
    return s

def normalize_response(raw_val: Any) -> Dict[str, str]:
    cleaned = clean_cell_str(raw_val)
    if not cleaned:
        return {
            "standard": "Pending / Unrecorded",
            "raw": "",
            "category": "Pending",
            "color": "slate"
        }
    
    val_lower = cleaned.lower()
    
    if any(k in val_lower for k in ["share", "details", "brochure", "info", "curriculum"]):
        return {
            "standard": "Share Me The Details",
            "raw": cleaned,
            "category": "Positive & Interested",
            "color": "emerald"
        }
    elif any(k in val_lower for k in ["interested", "intrested", "ready", "positive", "scheduled"]) and "not" not in val_lower:
        return {
            "standard": "Interested",
            "raw": cleaned,
            "category": "Positive & Interested",
            "color": "emerald"
        }
    elif any(k in val_lower for k in ["busy", "call me back", "call back", "callback", "later", "reach out tomorrow"]):
        return {
            "standard": "Call Me Back (Busy)",
            "raw": cleaned,
            "category": "Follow-up Needed",
            "color": "amber"
        }
    elif "switch off" in val_lower or "switched off" in val_lower:
        return {
            "standard": "Switch Off",
            "raw": cleaned,
            "category": "Unreachable",
            "color": "slate"
        }
    elif "not reachable" in val_lower or "out of network" in val_lower or "unreachable" in val_lower:
        return {
            "standard": "Not Reachable",
            "raw": cleaned,
            "category": "Unreachable",
            "color": "slate"
        }
    elif any(k in val_lower for k in ["no answer", "no response", "did not pick", "ringing"]):
        return {
            "standard": "No Answer",
            "raw": cleaned,
            "category": "Unreachable",
            "color": "slate"
        }
    elif "closed" in val_lower or "shutdown" in val_lower:
        return {
            "standard": "College Is Closed",
            "raw": cleaned,
            "category": "Disqualified",
            "color": "rose"
        }
    elif any(k in val_lower for k in ["not interested", "not intrested", "declined", "reject", "do not call"]):
        return {
            "standard": "Not Interested",
            "raw": cleaned,
            "category": "Not Interested",
            "color": "rose"
        }
    else:
        # Title case generic response
        std_name = cleaned.title()
        return {
            "standard": std_name,
            "raw": cleaned,
            "category": "Other Responses",
            "color": "blue"
        }

def analyze_college_responses(df: pd.DataFrame) -> Dict[str, Any]:
    if df.empty:
        return {
            "is_college_data": False,
            "total_institutions": 0,
            "institutions": [],
            "responses_summary": [],
            "category_summary": [],
            "districts": []
        }

    cols = list(df.columns)
    
    # 1. Detect College Column
    college_col = None
    for pattern in ["college/university", "college", "university", "institution", "school", "institute", "academy", "company", "name"]:
        found = next((c for c in cols if pattern in str(c).lower()), None)
        if found:
            college_col = found
            break
            
    if not college_col:
        college_col = cols[0]

    # 2. Detect Response Column
    response_col = None
    for pattern in ["response", "disposition", "call status", "outcome", "status", "feedback", "stage"]:
        found = next((c for c in cols if pattern in str(c).lower()), None)
        if found:
            response_col = found
            break

    # 3. Detect Auxiliary Columns
    def find_col(patterns: List[str], exclude: List[str] = []) -> Optional[str]:
        for p in patterns:
            found = next((c for c in cols if p in str(c).lower() and c not in exclude), None)
            if found:
                return found
        return None

    district_col = find_col(["district", "city", "location", "region", "state", "place"])
    dept_col = find_col(["school / department", "department", "dept", "branch", "faculty"])
    desig_col = find_col(["designation", "role", "title", "position"])
    contact_col = find_col(["contact person", "contact name", "person name", "contact", "person", "incharge", "lead"], exclude=[college_col])
    phone_col = find_col(["phone", "mobile", "contact number", "cell", "tel"])
    email_col = find_col(["email", "mail"])
    nirf_col = find_col(["nirf"])
    qs_col = find_col(["qs"])
    gender_col = find_col(["gender", "sex"])

    # Filter out empty or repeated header rows
    valid_rows = []
    districts_set = set()
    raw_responses_counts: Dict[str, int] = {}
    standard_counts: Dict[str, int] = {}
    category_counts: Dict[str, int] = {}

    for idx, row in df.iterrows():
        c_name = clean_cell_str(row.get(college_col, ""))
        if not c_name or c_name.lower() in ["college/university name", "college name", "institution name", "university name"]:
            continue
            
        r_raw = row.get(response_col, "") if response_col else ""
        norm = normalize_response(r_raw)
        
        std_resp = norm["standard"]
        cat_resp = norm["category"]
        color_resp = norm["color"]
        
        # Track statistics
        standard_counts[std_resp] = standard_counts.get(std_resp, 0) + 1
        category_counts[cat_resp] = category_counts.get(cat_resp, 0) + 1
        if norm["raw"]:
            raw_responses_counts[norm["raw"]] = raw_responses_counts.get(norm["raw"], 0) + 1

        district_val = clean_cell_str(row.get(district_col, "")) if district_col else ""
        if district_val:
            districts_set.add(district_val)

        item = {
            "id": f"inst-{idx}",
            "row_index": int(idx),
            "college_name": c_name,
            "response": std_resp,
            "raw_response": norm["raw"],
            "category": cat_resp,
            "color": color_resp,
            "district": district_val,
            "department": clean_cell_str(row.get(dept_col, "")) if dept_col else "",
            "designation": clean_cell_str(row.get(desig_col, "")) if desig_col else "",
            "contact_person": clean_cell_str(row.get(contact_col, "")) if contact_col else "",
            "phone": clean_cell_str(row.get(phone_col, "")) if phone_col else "",
            "email": clean_cell_str(row.get(email_col, "")) if email_col else "",
            "nirf_rank": clean_cell_str(row.get(nirf_col, "")) if nirf_col else "",
            "qs_rank": clean_cell_str(row.get(qs_col, "")) if qs_col else "",
            "gender": clean_cell_str(row.get(gender_col, "")) if gender_col else "",
        }
        valid_rows.append(item)

    total_count = len(valid_rows)
    
    # Format responses summary sorted by count descending
    responses_summary = []
    # Palette lookup for standard responses
    color_map = {
        "Share Me The Details": "emerald",
        "Interested": "emerald",
        "Call Me Back (Busy)": "amber",
        "No Answer": "slate",
        "Switch Off": "slate",
        "Not Reachable": "slate",
        "Not Interested": "rose",
        "College Is Closed": "rose",
        "Pending / Unrecorded": "slate"
    }

    for std_name, cnt in sorted(standard_counts.items(), key=lambda x: x[1], reverse=True):
        responses_summary.append({
            "name": std_name,
            "count": cnt,
            "percentage": round((cnt / total_count * 100), 1) if total_count > 0 else 0,
            "color": color_map.get(std_name, "blue")
        })

    category_summary = []
    for cat_name, cnt in sorted(category_counts.items(), key=lambda x: x[1], reverse=True):
        cat_color = "emerald" if "Positive" in cat_name else "amber" if "Follow-up" in cat_name else "rose" if "Not Interested" in cat_name or "Disqualified" in cat_name else "slate"
        category_summary.append({
            "name": cat_name,
            "count": cnt,
            "percentage": round((cnt / total_count * 100), 1) if total_count > 0 else 0,
            "color": cat_color
        })

    return {
        "is_college_data": total_count > 0 and (response_col is not None or "college" in college_col.lower()),
        "total_institutions": total_count,
        "college_column": college_col,
        "response_column": response_col or "None",
        "districts": sorted(list(districts_set)),
        "responses_summary": responses_summary,
        "category_summary": category_summary,
        "institutions": valid_rows
    }
