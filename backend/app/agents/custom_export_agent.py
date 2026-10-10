import io
import re
import uuid
import datetime
from typing import Dict, List, Any, Optional, Tuple
import pandas as pd
import numpy as np
import openpyxl
from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from backend.app.core.config import settings
from backend.app.tools.data_loader import get_dataset, get_metadata
from backend.app.schemas.custom_export import (
    CustomExportRequest, CustomExportPreview, ParsedPromptResult
)

# In-memory storage for generated workbooks
# key: export_id -> {"buffer": bytes, "filename": str, "created_at": datetime, "total_rows": int}
EXPORTED_WORKBOOKS_STORE: Dict[str, Dict[str, Any]] = {}

def sanitize_formula_injection(val: Any) -> Any:
    """Prepend single quote to prevent spreadsheet formula execution."""
    if isinstance(val, str):
        val_str = val.strip()
        if val_str and val_str[0] in ('=', '+', '-', '@', '\t', '\r'):
            return f"'{val}"
    return val

def clean_cell_value(val: Any) -> str:
    if val is None or pd.isna(val):
        return ""
    s = str(val).strip()
    if s.lower() in ("nan", "none", "null", "—", "-"):
        return ""
    if re.match(r"^\d+\.0$", s):
        s = s[:-2]
    return s

def match_column_name(target_col: str, available_columns: List[str]) -> Optional[str]:
    """Fuzzy matches a user-requested column name against actual dataset columns."""
    target_clean = target_col.strip()
    target_lower = target_clean.lower()

    # 1. Exact match
    for col in available_columns:
        if col.lower() == target_lower:
            return col

    # 2. Substring or semantic alias matches
    aliases = {
        "college": ["college/university name", "college name", "institution", "university", "college"],
        "college name": ["college/university name", "college name", "institution", "university"],
        "university": ["college/university name", "university name", "university"],
        "name": ["college/university name", "name", "contact person name"],
        "contact": ["contact person name", "contact person", "contact name", "contact"],
        "contact person": ["contact person name", "contact person", "contact"],
        "phone": ["phone number", "mobile", "phone", "contact number"],
        "phone number": ["phone number", "mobile", "phone"],
        "mobile": ["phone number", "mobile"],
        "email": ["email address", "email", "mail"],
        "email address": ["email address", "email"],
        "district": ["district", "city", "location", "region"],
        "department": ["school / department", "department", "dept", "branch"],
        "courses": ["school / department", "department", "courses"],
        "designation": ["designation", "role", "title", "position"],
        "response": ["response", "status", "disposition", "outcome"],
        "nirf": ["nirf ranking", "nirf", "rank"],
        "qs": ["qs ranking", "qs", "qs rank"],
        "website": ["website", "url", "portal", "web address"],
        "gender": ["gender (male/female)", "gender", "sex"]
    }

    if target_lower in aliases:
        for alias in aliases[target_lower]:
            for col in available_columns:
                if alias in col.lower():
                    return col

    # 3. Direct substring match
    for col in available_columns:
        if target_lower in col.lower() or col.lower() in target_lower:
            return col

    return None

def parse_natural_language_prompt(prompt: str, available_columns: List[str]) -> ParsedPromptResult:
    """Intelligently extracts columns, sequence, sorting, limits, and validation rules from user prompt."""
    prompt_clean = prompt.strip()
    prompt_lower = prompt_clean.lower()

    requested_columns: List[str] = []
    column_sequence: List[str] = []
    sort_column: Optional[str] = None
    sort_direction: str = "asc"
    filter_description: Optional[str] = None
    filter_col: Optional[str] = None
    filter_val: Optional[str] = None
    deduplicate: bool = False
    deduplicate_cols: List[str] = []
    row_limit: Optional[int] = None
    validation_focus: List[str] = []
    detected_color_rules: Dict[str, str] = {
        "header": "#1E3A8A",
        "valid": "#DCFCE7",
        "warning": "#FEF9C3",
        "error": "#FEE2E2"
    }

    # 1. Check for explicit row limits, e.g. "50 colleges", "top 100", "first 20"
    limit_match = re.search(r'\b(?:top|first|give me|get|limit to|fetch)\s+(\d+)\b', prompt_lower)
    if not limit_match:
        limit_match = re.search(r'\b(\d+)\s+(?:records|colleges|rows|institutions|entries)\b', prompt_lower)
    if limit_match:
        try:
            row_limit = int(limit_match.group(1))
        except Exception:
            pass

    # 2. Check for deduplication instructions
    if any(k in prompt_lower for k in ["duplicate", "deduplicate", "unique records", "distinct", "exclude duplicates", "remove duplicate"]):
        deduplicate = True

    # 3. Check for explicit sequence patterns
    seq_match = re.search(r'(?:sequence|order|exact sequence|arrange the columns in this sequence|arrange in sequence|columns):\s*([^.\n]+)', prompt, re.IGNORECASE)
    if seq_match:
        raw_list = re.split(r'[,>]|\band\b', seq_match.group(1))
        for raw_item in raw_list:
            matched = match_column_name(raw_item.strip(), available_columns)
            if matched and matched not in column_sequence:
                column_sequence.append(matched)

    # If no explicit sequence block, scan for mentioned columns across available columns
    if not column_sequence:
        for col in available_columns:
            # check if col or its base name is in prompt
            words = [w for w in col.lower().replace('/', ' ').replace('(', ' ').replace(')', ' ').split() if len(w) > 3]
            if any(w in prompt_lower for w in words) or col.lower() in prompt_lower:
                if col not in column_sequence:
                    column_sequence.append(col)

    # Fallback: if nothing parsed, use original column list
    if not column_sequence:
        column_sequence = available_columns.copy()

    requested_columns = column_sequence.copy()

    # 4. Sorting extraction, e.g. "sort by district", "highest conversion", "sort by name desc"
    sort_match = re.search(r'(?:sort by|order by|sorted by|ordered by)\s+([a-zA-Z0-9_\s/]+?)(?:\s+(asc|ascending|desc|descending)|\.|\band\b|$)', prompt_lower)
    if sort_match:
        raw_sort_col = sort_match.group(1).strip()
        matched_sort = match_column_name(raw_sort_col, available_columns)
        if matched_sort:
            sort_column = matched_sort
            direction_str = (sort_match.group(2) or "").lower()
            if "desc" in direction_str or "highest" in prompt_lower:
                sort_direction = "desc"
            else:
                sort_direction = "asc"

    # 5. Filter extraction, e.g. "in andhra pradesh", "where district is guntur", "positive responses"
    if "andhra pradesh" in prompt_lower or " ap " in f" {prompt_lower} ":
        filter_description = "Geographic filter: Andhra Pradesh region"
    
    district_filter_match = re.search(r'(?:district|in)\s+(?:is\s+)?([A-Za-z]+(?:\s+[A-Za-z]+)?)', prompt, re.IGNORECASE)
    if district_filter_match and district_filter_match.group(1).lower() not in ["andhra", "andhra pradesh", "order", "sequence"]:
        filter_col = match_column_name("district", available_columns)
        if filter_col:
            filter_val = district_filter_match.group(1).strip()
            filter_description = f"Filtered by {filter_col} containing '{filter_val}'"

    # 6. Validation and Color Rules
    if "missing" in prompt_lower or "red" in prompt_lower:
        validation_focus.append("Missing values flagged in Red")
    if "verified" in prompt_lower or "green" in prompt_lower:
        validation_focus.append("Verified and compliant data flagged in Green")
    if "unverified" in prompt_lower or "yellow" in prompt_lower:
        validation_focus.append("Unverified and review items flagged in Yellow")
    if not validation_focus:
        validation_focus = [
            "Valid entries & verified records in Green",
            "Unverified / Pending review in Yellow",
            "Missing / Invalid format cells in Red"
        ]

    explanation = (
        f"Parsed {len(column_sequence)} target columns in requested sequence: {', '.join(column_sequence[:4])}"
        f"{'...' if len(column_sequence) > 4 else ''}. "
        f"{f'Limit: {row_limit} rows. ' if row_limit else ''}"
        f"{f'Sort: {sort_column} ({sort_direction}). ' if sort_column else ''}"
        f"{'Duplicates removed. ' if deduplicate else ''}"
    )

    return ParsedPromptResult(
        requested_columns=requested_columns,
        column_sequence=column_sequence,
        sort_column=sort_column,
        sort_direction=sort_direction,
        filter_description=filter_description,
        filter_column=filter_col,
        filter_value=filter_val,
        deduplicate=deduplicate,
        deduplicate_columns=deduplicate_cols,
        row_limit=row_limit,
        validation_focus=validation_focus,
        detected_color_rules=detected_color_rules,
        summary_explanation=explanation
    )

def validate_cell(val_clean: str, col_name: str) -> Tuple[str, str, str]:
    """
    Returns (status, reason, color_hex)
    status: 'valid' | 'warning' | 'error' | 'normal'
    """
    col_lower = col_name.lower()
    
    # 1. Missing / Blank values -> Red / Error
    if not val_clean:
        return 'error', 'Missing value / Empty field', '#FEE2E2'

    val_lower = val_clean.lower()

    # 2. Explicit Unverified flags -> Yellow / Warning
    if any(k in val_lower for k in ["not verified", "unverified", "pending verification", "to be verified", "unknown"]):
        return 'warning', 'Marked unverified in source', '#FEF9C3'

    # 3. Email validation
    if any(k in col_lower for k in ["email", "mail"]):
        email_pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
        if re.match(email_pattern, val_clean):
            return 'valid', 'Valid verified email address', '#DCFCE7'
        else:
            return 'error', 'Invalid email address syntax', '#FEE2E2'

    # 4. Phone validation
    if any(k in col_lower for k in ["phone", "mobile", "contact number"]):
        digits_only = re.sub(r'\D', '', val_clean)
        if len(digits_only) in (10, 11, 12):
            return 'valid', 'Valid phone number length & format', '#DCFCE7'
        else:
            return 'warning', f'Irregular phone digit count ({len(digits_only)})', '#FEF9C3'

    # 5. Website / URL validation
    if any(k in col_lower for k in ["website", "url", "web"]):
        if re.match(r'^(https?:\/\/)?[\w.-]+\.[a-z]{2,}', val_lower):
            return 'valid', 'Valid web domain / URL', '#DCFCE7'
        else:
            return 'warning', 'Unformatted web link', '#FEF9C3'

    # 6. Response / Disposition categorization
    if any(k in col_lower for k in ["response", "status", "disposition"]):
        if any(k in val_lower for k in ["share", "details", "interested", "scheduled", "approved"]):
            return 'valid', 'Positive engagement outcome', '#DCFCE7'
        elif any(k in val_lower for k in ["busy", "call me back", "callback", "later"]):
            return 'warning', 'Follow-up / Action required', '#FEF9C3'
        elif any(k in val_lower for k in ["not interested", "closed", "declined", "switch off", "no answer"]):
            return 'error', 'Unreachable or Declined disposition', '#FEE2E2'

    # 7. Default populated text/number -> Green / Valid
    return 'valid', 'Populated and compliant record', '#DCFCE7'

def execute_custom_export(req: CustomExportRequest) -> CustomExportPreview:
    df_raw = get_dataset(req.dataset_id)
    meta = get_metadata(req.dataset_id)
    available_cols = list(df_raw.columns)

    # 1. Natural Language Prompt Interpretation (if provided)
    parsed: Optional[ParsedPromptResult] = None
    if req.natural_language_prompt and req.natural_language_prompt.strip():
        parsed = parse_natural_language_prompt(req.natural_language_prompt, available_cols)

    # 2. Determine target columns & sequence
    # Preference: explicit column_sequence in request > parsed sequence > all columns
    target_sequence: List[str] = []
    if req.column_sequence and len(req.column_sequence) > 0:
        for c in req.column_sequence:
            matched = match_column_name(c, available_cols)
            if matched and matched not in target_sequence:
                target_sequence.append(matched)
    elif req.requested_columns and len(req.requested_columns) > 0:
        for c in req.requested_columns:
            matched = match_column_name(c, available_cols)
            if matched and matched not in target_sequence:
                target_sequence.append(matched)
    elif parsed and parsed.column_sequence:
        target_sequence = parsed.column_sequence
    else:
        target_sequence = available_cols.copy()

    # Safety: ensure at least one valid column
    if not target_sequence:
        target_sequence = available_cols.copy()

    # Filter out empty or repeated header rows
    first_col = target_sequence[0]
    df_working = df_raw.copy()
    
    # Strip whitespace & remove ghost rows
    mask = df_working[first_col].notna() & (~df_working[first_col].astype(str).str.lower().isin(
        ['college/university name', 'name', 's. no.', 'header', '']
    ))
    df_working = df_working[mask].copy()

    # 3. Filtering
    filter_col = req.filter_column or (parsed.filter_column if parsed else None)
    filter_val = req.filter_value or (parsed.filter_value if parsed else None)
    if filter_col and filter_val and filter_col in df_working.columns:
        df_working = df_working[
            df_working[filter_col].astype(str).str.lower().str.contains(str(filter_val).lower(), na=False)
        ]

    # 4. Deduplication
    initial_row_count = len(df_working)
    should_dedup = req.deduplicate or (parsed.deduplicate if parsed else False)
    duplicates_removed_count = 0
    if should_dedup:
        dedup_keys = req.deduplicate_columns or (parsed.deduplicate_columns if parsed else [])
        valid_dedup_keys = [k for k in dedup_keys if k in df_working.columns]
        if valid_dedup_keys:
            df_working = df_working.drop_duplicates(subset=valid_dedup_keys)
        else:
            df_working = df_working.drop_duplicates(subset=[target_sequence[0]])
        duplicates_removed_count = initial_row_count - len(df_working)

    # 5. Row Sorting
    sort_col = req.sort_column or (parsed.sort_column if parsed else None)
    sort_dir = (req.sort_direction or (parsed.sort_direction if parsed else "asc")).lower()
    if sort_col and sort_col in df_working.columns:
        ascending_bool = (sort_dir == "asc")
        df_working = df_working.sort_values(by=sort_col, ascending=ascending_bool, na_position='last')

    # 6. Row Limit
    limit_count = req.row_limit or (parsed.row_limit if parsed else None)
    if limit_count and limit_count > 0:
        df_working = df_working.head(limit_count)

    # 7. Select & Sequence Columns PRECISELY
    df_final = pd.DataFrame()
    for col_name in target_sequence:
        if col_name in df_working.columns:
            df_final[col_name] = df_working[col_name].apply(clean_cell_value)
        else:
            df_final[col_name] = ""

    total_records = len(df_final)

    # 8. Cell Validation Matrix & Quality Auditing
    cell_matrix: List[Dict[str, Dict[str, Any]]] = []
    unverified_rows_indices: List[int] = []
    total_cells = total_records * len(target_sequence) if total_records > 0 else 1
    valid_cells_count = 0
    warning_cells_count = 0
    error_cells_count = 0
    missing_cells_per_column: Dict[str, int] = {c: 0 for c in target_sequence}

    for row_idx, (_, row) in enumerate(df_final.iterrows()):
        row_dict: Dict[str, Dict[str, Any]] = {}
        has_warning_or_error = False

        for col in target_sequence:
            cell_val = str(row[col])
            status, reason, color = validate_cell(cell_val, col)
            
            if status == 'error':
                error_cells_count += 1
                missing_cells_per_column[col] += 1
                has_warning_or_error = True
            elif status == 'warning':
                warning_cells_count += 1
                has_warning_or_error = True
            elif status == 'valid':
                valid_cells_count += 1

            row_dict[col] = {
                "status": status,
                "reason": reason,
                "color": color,
                "value": cell_val
            }

        cell_matrix.append(row_dict)
        if has_warning_or_error:
            unverified_rows_indices.append(row_idx)

    # Quality Summary
    quality_summary = {
        "total_records": total_records,
        "total_columns": len(target_sequence),
        "validated_records_count": total_records - len(unverified_rows_indices),
        "unverified_records_count": len(unverified_rows_indices),
        "valid_cells_count": valid_cells_count,
        "warning_cells_count": warning_cells_count,
        "error_cells_count": error_cells_count,
        "duplicates_removed": duplicates_removed_count,
        "overall_quality_score": round((valid_cells_count / total_cells * 100), 1),
        "missing_per_column": missing_cells_per_column
    }

    # Sources & Retrieval Info
    retrieval_timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    sources_info = {
        "source_dataset_name": meta.name,
        "source_dataset_id": meta.id,
        "source_file_type": meta.file_type.upper(),
        "retrieval_date": retrieval_timestamp,
        "verification_criteria": "Format adherence, nullity audit, and verified source dispositions",
        "requested_prompt": req.natural_language_prompt or "Structured custom selection"
    }

    applied_instructions = {
        "column_sequence": target_sequence,
        "sort_column": sort_col,
        "sort_direction": sort_dir,
        "filter_applied": f"{filter_col} = {filter_val}" if filter_col else "None",
        "deduplicate": should_dedup,
        "row_limit": limit_count or "All records"
    }

    # 9. Generate Professional Multi-Sheet Excel Workbook
    export_id = str(uuid.uuid4())
    wb = openpyxl.Workbook()

    # Sheet 1: Requested Data
    ws1 = wb.active
    ws1.title = "Requested Data"
    ws1.views.sheetView[0].showGridLines = True

    # Header styling
    header_fill_hex = "1E3A8A"  # Professional Executive Navy Blue
    header_fill = PatternFill(start_color=header_fill_hex, end_color=header_fill_hex, fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    header_alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    # Border style
    thin_border_side = Side(border_style="thin", color="E2E8F0")
    thin_border = Border(left=thin_border_side, right=thin_border_side, top=thin_border_side, bottom=thin_border_side)

    # Write Headers in Exact Requested Sequence
    for col_idx, col_name in enumerate(target_sequence, start=1):
        cell = ws1.cell(row=1, column=col_idx, value=col_name)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = header_alignment
        cell.border = thin_border
    ws1.row_dimensions[1].height = 28

    # Palette styles for data cells
    valid_fill = PatternFill("solid", fgColor="DCFCE7")      # Soft Green
    valid_font = Font(name="Calibri", size=10, color="166534")

    warning_fill = PatternFill("solid", fgColor="FEF9C3")    # Soft Yellow
    warning_font = Font(name="Calibri", size=10, color="854D0E")

    error_fill = PatternFill("solid", fgColor="FEE2E2")      # Soft Red
    error_font = Font(name="Calibri", size=10, color="991B1B", bold=True)

    zebra_fill = PatternFill("solid", fgColor="F8FAFC")      # Light Slate Alternating
    default_font = Font(name="Calibri", size=10, color="000000")

    # Write Data Rows
    for row_idx, (_, row) in enumerate(df_final.iterrows(), start=2):
        is_even = (row_idx % 2 == 0)
        ws1.row_dimensions[row_idx].height = 22

        for col_idx, col_name in enumerate(target_sequence, start=1):
            raw_val = row[col_name]
            clean_val = sanitize_formula_injection(raw_val)
            
            cell = ws1.cell(row=row_idx, column=col_idx, value=clean_val)
            cell.alignment = Alignment(vertical="center", wrap_text=True)
            cell.border = thin_border

            # Retrieve validation status
            cell_stat = cell_matrix[row_idx - 2][col_name]["status"]
            if cell_stat == "error":
                cell.fill = error_fill
                cell.font = error_font
            elif cell_stat == "warning":
                cell.fill = warning_fill
                cell.font = warning_font
            elif cell_stat == "valid":
                cell.fill = valid_fill
                cell.font = valid_font
            else:
                if is_even:
                    cell.fill = zebra_fill
                cell.font = default_font

    # Freeze Header and Enable Filters
    ws1.freeze_panes = "A2"
    ws1.auto_filter.ref = ws1.dimensions

    # Auto-adjust column widths
    for col_idx, col_name in enumerate(target_sequence, start=1):
        col_letter = get_column_letter(col_idx)
        max_len = len(str(col_name))
        for row in range(2, min(len(df_final) + 2, 100)):
            val = ws1.cell(row=row, column=col_idx).value
            if val:
                max_len = max(max_len, len(str(val)))
        ws1.column_dimensions[col_letter].width = min(max(max_len + 5, 14), 45)

    # Sheet 2: Data Quality Report
    ws2 = wb.create_sheet(title="Data Quality Report")
    ws2.views.sheetView[0].showGridLines = True

    # Title block
    ws2.cell(row=1, column=1, value="Data Quality & Verification Audit").font = Font(name="Calibri", size=14, bold=True, color="1E3A8A")
    ws2.cell(row=2, column=1, value=f"Generated on {retrieval_timestamp} for dataset '{meta.name}'").font = Font(name="Calibri", size=10, italic=True, color="64748B")

    # Table 1: Quality KPIs
    ws2.cell(row=4, column=1, value="Metric").font = header_font
    ws2.cell(row=4, column=1).fill = header_fill
    ws2.cell(row=4, column=2, value="Value").font = header_font
    ws2.cell(row=4, column=2).fill = header_fill
    ws2.cell(row=4, column=3, value="Notes").font = header_font
    ws2.cell(row=4, column=3).fill = header_fill

    kpi_rows = [
        ("Total Records Requested", total_records, "Observations retrieved and sequenced"),
        ("Validated Records", quality_summary["validated_records_count"], "Records with 100% compliant data fields"),
        ("Records Requiring Review", quality_summary["unverified_records_count"], "Records containing missing or unverified fields"),
        ("Duplicate Records Excluded", duplicates_removed_count, "Excluded during deduplication pass"),
        ("Data Quality Health Index", f"{quality_summary['overall_quality_score']}%", "Ratio of fully valid to total processed cells")
    ]

    for idx, (m, v, n) in enumerate(kpi_rows, start=5):
        ws2.cell(row=idx, column=1, value=m).font = default_font
        ws2.cell(row=idx, column=2, value=str(v)).font = Font(name="Calibri", size=10, bold=True)
        ws2.cell(row=idx, column=3, value=n).font = default_font
        for c in range(1, 4):
            ws2.cell(row=idx, column=c).border = thin_border

    # Table 2: Missing Values per Column
    start_missing_row = 12
    ws2.cell(row=start_missing_row, column=1, value="Column Sequence").font = header_font
    ws2.cell(row=start_missing_row, column=1).fill = header_fill
    ws2.cell(row=start_missing_row, column=2, value="Column Name").font = header_font
    ws2.cell(row=start_missing_row, column=2).fill = header_fill
    ws2.cell(row=start_missing_row, column=3, value="Missing / Error Count").font = header_font
    ws2.cell(row=start_missing_row, column=3).fill = header_fill
    ws2.cell(row=start_missing_row, column=4, value="Completeness %").font = header_font
    ws2.cell(row=start_missing_row, column=4).fill = header_fill

    for idx, col_name in enumerate(target_sequence, start=start_missing_row + 1):
        m_count = missing_cells_per_column[col_name]
        pct = round(((total_records - m_count) / (total_records or 1) * 100), 1)
        ws2.cell(row=idx, column=1, value=idx - start_missing_row).font = default_font
        ws2.cell(row=idx, column=2, value=col_name).font = Font(name="Calibri", size=10, bold=True)
        ws2.cell(row=idx, column=3, value=m_count).font = error_font if m_count > 0 else default_font
        ws2.cell(row=idx, column=4, value=f"{pct}%").font = valid_font if pct > 90 else default_font
        for c in range(1, 5):
            ws2.cell(row=idx, column=c).border = thin_border

    # Color Legend Box
    start_legend = start_missing_row + len(target_sequence) + 3
    ws2.cell(row=start_legend, column=1, value="Excel Color Code Legend").font = Font(name="Calibri", size=12, bold=True, color="1E3A8A")
    legends = [
        ("Blue Header", "Column headings in strictly requested sequence", header_fill, header_font),
        ("Green Cells", "Verified, valid, and structurally compliant fields", valid_fill, valid_font),
        ("Yellow Cells", "Unverified information or entries requiring human review", warning_fill, warning_font),
        ("Red Cells", "Missing required values, blanks, or syntax validation errors", error_fill, error_font),
        ("Zebra Shading", "Alternating light grey and white rows for maximum readability", zebra_fill, default_font),
    ]
    for l_idx, (name, desc, f, fn) in enumerate(legends, start=start_legend + 1):
        c1 = ws2.cell(row=l_idx, column=1, value=name)
        c1.fill = f
        c1.font = fn
        c1.border = thin_border
        c2 = ws2.cell(row=l_idx, column=2, value=desc)
        c2.font = default_font
        c2.border = thin_border

    ws2.column_dimensions["A"].width = 28
    ws2.column_dimensions["B"].width = 38
    ws2.column_dimensions["C"].width = 24
    ws2.column_dimensions["D"].width = 20

    # Sheet 3: Sources & Methodology
    ws3 = wb.create_sheet(title="Sources & Methodology")
    ws3.views.sheetView[0].showGridLines = True

    ws3.cell(row=1, column=1, value="Data Source & Retrieval Specification").font = Font(name="Calibri", size=14, bold=True, color="1E3A8A")
    meta_rows = [
        ("Source Dataset Name", meta.name),
        ("Source Dataset ID", meta.id),
        ("File Format", meta.file_type.upper()),
        ("Retrieval Timestamp", retrieval_timestamp),
        ("User Prompt / Instruction", req.natural_language_prompt or "Standard sequence request"),
        ("Strict Column Sequence", " -> ".join(target_sequence)),
        ("Sort Rule Applied", f"{sort_col} ({sort_dir})" if sort_col else "Default observational order"),
        ("Deduplication Applied", "Yes" if should_dedup else "No"),
        ("Validation Criteria", "Email RFC format, phone digit constraints, disposition categories")
    ]

    for idx, (lbl, val) in enumerate(meta_rows, start=3):
        ws3.cell(row=idx, column=1, value=lbl).font = Font(name="Calibri", size=10, bold=True)
        ws3.cell(row=idx, column=1).border = thin_border
        ws3.cell(row=idx, column=1).fill = zebra_fill
        ws3.cell(row=idx, column=2, value=str(val)).font = default_font
        ws3.cell(row=idx, column=2).border = thin_border

    ws3.column_dimensions["A"].width = 26
    ws3.column_dimensions["B"].width = 65

    # Sheet 4: Unverified Records (if requested)
    if req.separate_unverified_sheet and unverified_rows_indices:
        ws4 = wb.create_sheet(title="Unverified Records")
        ws4.views.sheetView[0].showGridLines = True
        ws4.freeze_panes = "A2"
        for col_idx, col_name in enumerate(target_sequence, start=1):
            cell = ws4.cell(row=1, column=col_idx, value=col_name)
            cell.fill = PatternFill("solid", fgColor="854D0E")
            cell.font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
            cell.alignment = header_alignment
            cell.border = thin_border

        for target_r_idx, orig_r_idx in enumerate(unverified_rows_indices, start=2):
            for col_idx, col_name in enumerate(target_sequence, start=1):
                raw_val = df_final.iloc[orig_r_idx][col_name]
                clean_val = sanitize_formula_injection(raw_val)
                cell = ws4.cell(row=target_r_idx, column=col_idx, value=clean_val)
                cell.border = thin_border
                cell_stat = cell_matrix[orig_r_idx][col_name]["status"]
                if cell_stat == "error":
                    cell.fill = error_fill
                    cell.font = error_font
                elif cell_stat == "warning":
                    cell.fill = warning_fill
                    cell.font = warning_font
                else:
                    cell.fill = zebra_fill
                    cell.font = default_font

    # Save to buffer and store
    excel_buffer = io.BytesIO()
    wb.save(excel_buffer)
    excel_buffer.seek(0)
    buffer_bytes = excel_buffer.getvalue()

    filename = f"Custom_Data_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    EXPORTED_WORKBOOKS_STORE[export_id] = {
        "buffer": buffer_bytes,
        "filename": filename,
        "created_at": datetime.datetime.now(datetime.timezone.utc),
        "total_rows": total_records
    }

    # Return preview payload
    preview_limit = 25
    preview_rows = df_final.head(preview_limit).to_dict(orient="records")
    preview_matrix = cell_matrix[:preview_limit]

    return CustomExportPreview(
        export_id=export_id,
        dataset_id=req.dataset_id,
        dataset_name=meta.name,
        prompt=req.natural_language_prompt,
        column_sequence=target_sequence,
        total_rows=total_records,
        preview_rows=preview_rows,
        cell_validation_matrix=preview_matrix,
        quality_summary=quality_summary,
        sources_info=sources_info,
        applied_instructions=applied_instructions,
        download_url=f"/api/v1/custom-export/download/{export_id}"
    )

def get_exported_workbook(export_id: str) -> Optional[Tuple[bytes, str]]:
    item = EXPORTED_WORKBOOKS_STORE.get(export_id)
    if not item:
        return None
    return item["buffer"], item["filename"]
