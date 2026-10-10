import pandas as pd
import numpy as np
from typing import List, Optional, Dict, Any, Tuple
from backend.app.schemas.analysis import FunnelStageData, FunnelAnalysisResult, VisualizationConfig

DEFAULT_FUNNEL_KEYWORDS = [
    'visit', 'view', 'signup', 'sign up', 'register', 'cart', 'checkout', 'pay', 'purchase',
    'order', 'lead', 'qualif', 'deal', 'sent', 'opened', 'clicked', 'installed', 'activated'
]

RESPONSE_KEYWORDS = [
    'response', 'status', 'outcome', 'disposition', 'result', 'pipeline', 'state', 'action',
    'feedback', 'lead_status', 'call_status', 'reach', 'reply', 'decision'
]

OUTREACH_UNREACHABLE_KEYWORDS = [
    'switch off', 'switched off', 'out of reach', 'invalid', 'not reachable',
    'disconnected', 'wrong number', 'dnd', 'bounced', 'failed', 'unreachable'
]

OUTREACH_UNANSWERED_KEYWORDS = [
    'no answer', 'not answered', 'busy', 'ringing', 'call not picked',
    'did not pick up', 'no reply', 'missed', 'unopened', 'left voicemail'
]

OUTREACH_DECLINED_KEYWORDS = [
    'not intrested', 'not interested', 'rejected', 'declined',
    'unsubscribed', 'lost', 'dropped', 'cancelled', 'not required', 'disagree', 'refused'
]

OUTREACH_POSITIVE_KEYWORDS = [
    'share me the details', 'share details', 'interested', 'send brochure',
    'send details', 'converted', 'won', 'closed won', 'meeting', 'scheduled',
    'qualified', 'demo', 'yes', 'positive', 'agree', 'purchased', 'approved'
]

OUTREACH_IN_PROGRESS_KEYWORDS = [
    'call back', 'call later', 'busy call later', 'follow up', 'pending', 'in review', 'discuss later'
]

def detect_funnel_columns(df: pd.DataFrame) -> Tuple[Optional[str], Optional[str], List[str]]:
    """
    Detects potential stage/response column and user/entity column.
    Returns: (stage_col, user_col, candidate_columns)
    """
    stage_col = None
    user_col = None
    candidate_cols: List[str] = []
    
    # 1. Identify user/entity identifier column
    for col in df.columns:
        c_low = str(col).lower()
        if any(k in c_low for k in ['user', 'customer', 'session', 'lead', 'contact', 'id', 's. no.', 'sno', 'phone', 'email', 'account', 'record']):
            if not user_col:
                user_col = col

    # 2. Gather candidate categorical columns with reasonable cardinality
    for col in df.columns:
        if col == user_col:
            continue
        series = df[col].dropna()
        n_unique = series.nunique()
        if 1 < n_unique <= 30 and (df[col].dtype == 'object' or str(df[col].dtype) == 'category' or pd.api.types.is_string_dtype(df[col])):
            candidate_cols.append(col)
        elif 1 < n_unique <= 15:
            candidate_cols.append(col)

    # 3. Detect primary stage/response column
    # Priority A: Explicit stage/event/milestone name
    for col in df.columns:
        c_low = str(col).lower()
        if any(k in c_low for k in ['stage', 'event', 'step', 'milestone', 'funnel', 'phase', 'journey']):
            stage_col = col
            break
            
    # Priority B: Explicit response / outcome / status name
    if not stage_col:
        for col in df.columns:
            c_low = str(col).lower()
            if any(k in c_low for k in RESPONSE_KEYWORDS):
                stage_col = col
                break

    # Priority C: Check value keywords in candidates
    if not stage_col:
        all_kw = (
            DEFAULT_FUNNEL_KEYWORDS +
            OUTREACH_UNREACHABLE_KEYWORDS +
            OUTREACH_UNANSWERED_KEYWORDS +
            OUTREACH_POSITIVE_KEYWORDS +
            OUTREACH_DECLINED_KEYWORDS
        )
        for col in candidate_cols:
            vals = set(df[col].dropna().astype(str).str.lower().unique())
            matches = sum(1 for v in vals if any(kw in v for kw in all_kw))
            if matches >= 2:
                stage_col = col
                break

    # Priority D: Fallback to first categorical candidate
    if not stage_col and candidate_cols:
        stage_col = candidate_cols[0]

    return stage_col, user_col, candidate_cols


def is_outreach_response_data(series: pd.Series) -> bool:
    """
    Checks if a series contains outreach / calling / lead generation response categories.
    """
    s_lower = series.dropna().astype(str).str.lower()
    all_outreach_kw = (
        OUTREACH_UNREACHABLE_KEYWORDS +
        OUTREACH_UNANSWERED_KEYWORDS +
        OUTREACH_DECLINED_KEYWORDS +
        OUTREACH_POSITIVE_KEYWORDS +
        OUTREACH_IN_PROGRESS_KEYWORDS
    )
    
    matching_categories = set()
    for val in s_lower.unique():
        if any(kw in val for kw in all_outreach_kw):
            matching_categories.add(val)
            
    matches = s_lower.apply(lambda val: any(kw in val for kw in all_outreach_kw))
    return len(matching_categories) >= 2 or (len(s_lower) > 0 and (matches.sum() / len(s_lower)) >= 0.25)


def build_outreach_pipeline_funnel(
    df: pd.DataFrame,
    stage_col: str,
    user_col: Optional[str] = None
) -> Tuple[List[FunnelStageData], float, str, float, str, List[str]]:
    """
    Auto-converts outreach/contact response data into a 4-milestone progressive pipeline:
    1. Total Outbound Contacts
    2. Reachable Phone Numbers
    3. Connected & Answered Calls
    4. Qualified Leads (Details Requested / Interested)
    """
    total_records = len(df)
    s = df[stage_col].dropna().astype(str).str.strip()
    s_lower = s.str.lower()
    
    unreachable_mask = s_lower.apply(lambda v: any(k in v for k in OUTREACH_UNREACHABLE_KEYWORDS))
    unanswered_mask = s_lower.apply(lambda v: any(k in v for k in OUTREACH_UNANSWERED_KEYWORDS))
    declined_mask = s_lower.apply(lambda v: any(k in v for k in OUTREACH_DECLINED_KEYWORDS))
    positive_mask = s_lower.apply(lambda v: any(k in v for k in OUTREACH_POSITIVE_KEYWORDS))
    
    unreachable_count = int(unreachable_mask.sum())
    unanswered_count = int(unanswered_mask.sum())
    declined_count = int(declined_mask.sum())
    positive_count = int(positive_mask.sum())
    
    # Milestone calculations
    c1 = total_records
    c2 = max(0, c1 - unreachable_count)
    c3 = max(0, c2 - unanswered_count)
    c4 = positive_count if positive_count > 0 else max(0, c3 - declined_count)
    
    # Drop-off calculations between sequential milestones
    d1_cnt = 0
    d1_rt = 0.0
    
    d2_cnt = max(0, c1 - c2)
    d2_rt = round((d2_cnt / c1 * 100), 1) if c1 > 0 else 0.0
    
    d3_cnt = max(0, c2 - c3)
    d3_rt = round((d3_cnt / c2 * 100), 1) if c2 > 0 else 0.0
    
    d4_cnt = max(0, c3 - c4)
    d4_rt = round((d4_cnt / c3 * 100), 1) if c3 > 0 else 0.0
    
    stage_defs = [
        ("Total Outbound Contacts", c1, d1_cnt, d1_rt),
        ("Reachable Phone Numbers", c2, d2_cnt, d2_rt),
        ("Connected & Answered Calls", c3, d3_cnt, d3_rt),
        ("Qualified Leads (Details Requested)", c4, d4_cnt, d4_rt)
    ]
    
    stage_data: List[FunnelStageData] = []
    biggest_drop_stage = ""
    biggest_drop_rate = -1.0
    
    prev_count = c1
    for i, (name, count, drop_cnt, drop_rt) in enumerate(stage_defs):
        conv_rate = round((count / c1) * 100, 1) if c1 > 0 else 0.0
        stage_conv = round((count / prev_count) * 100, 1) if prev_count > 0 else 0.0
        
        if i > 0 and drop_rt > biggest_drop_rate:
            biggest_drop_rate = drop_rt
            biggest_drop_stage = name
            
        stage_data.append(FunnelStageData(
            stage_name=name,
            user_count=int(count),
            conversion_rate=conv_rate,
            stage_conversion_rate=stage_conv if i > 0 else 100.0,
            drop_off_count=int(drop_cnt),
            drop_off_rate=drop_rt
        ))
        prev_count = count

    overall_conversion = stage_data[-1].conversion_rate if stage_data else 0.0
    
    diagnostic = (
        f"Outreach conversion funnel generated from '{stage_col}': From an initial cohort of {total_records} prospective contacts, "
        f"{c4} decision-makers converted to qualified interest ({overall_conversion}% overall conversion rate). "
        f"The primary conversion bottleneck occurs at '{biggest_drop_stage}' where {biggest_drop_rate}% dropped off "
        f"({unanswered_count} contacts had 'NO ANSWER' and {unreachable_count} were 'SWITCH OFF'). "
        f"Among contacts who picked up the phone ({c3} connected), {c4} requested details and {declined_count} declined."
    )
    
    recommendations = [
        f"Multi-Channel Fallback for Unanswered Calls: For the {unanswered_count} contacts with 'NO ANSWER', immediately trigger automated WhatsApp and email overviews within 15 minutes.",
        f"Prime Calling Time Windows: Schedule calls during 10:30 AM - 12:30 PM or 3:30 PM - 5:00 PM when academic and institutional heads have finished morning rounds.",
        f"High Intent Prioritization: Immediately dispatch customized proposals and schedule meetings with the {c4} qualified contacts who requested details ('SHARE ME THE DETAILS').",
        f"Contact Data Enrichment: Re-verify phone numbers or identify secondary administrative contacts for the {unreachable_count} switched-off phone numbers."
    ]
    
    return stage_data, overall_conversion, biggest_drop_stage, biggest_drop_rate, diagnostic, recommendations


def build_standard_funnel(
    df: pd.DataFrame,
    stage_col: str,
    user_col: Optional[str] = None,
    custom_order: Optional[List[str]] = None
) -> Tuple[List[FunnelStageData], float, str, float, str, List[str]]:
    """
    Builds a standard sequence or frequency funnel from categorical stages.
    """
    if custom_order and len(custom_order) > 0:
        stage_order = [s for s in custom_order if s in df[stage_col].dropna().unique()]
    else:
        # Default order: Frequency of distinct users or count descending
        stage_order = df.groupby(stage_col)[user_col or df.columns[0]].nunique().sort_values(ascending=False).index.tolist()

    stage_counts = []
    for stg in stage_order:
        sub = df[df[stage_col] == stg]
        count = sub[user_col].nunique() if user_col and user_col in df.columns else len(sub)
        stage_counts.append((stg, count))

    first_count = stage_counts[0][1] if stage_counts else 1
    if first_count == 0:
        first_count = 1

    stage_data: List[FunnelStageData] = []
    biggest_drop_stage = ""
    biggest_drop_rate = -1.0
    
    prev_count = first_count
    for i, (stg_name, count) in enumerate(stage_counts):
        conv_rate = round((count / first_count) * 100, 1)
        stage_conv = round((count / prev_count) * 100, 1) if prev_count > 0 else 0.0
        drop_count = max(0, prev_count - count)
        drop_rate = round(100.0 - stage_conv, 1) if i > 0 else 0.0
        
        if i > 0 and drop_rate > biggest_drop_rate:
            biggest_drop_rate = drop_rate
            biggest_drop_stage = str(stg_name)

        stage_data.append(FunnelStageData(
            stage_name=str(stg_name),
            user_count=int(count),
            conversion_rate=conv_rate,
            stage_conversion_rate=stage_conv if i > 0 else 100.0,
            drop_off_count=int(drop_count) if i > 0 else 0,
            drop_off_rate=drop_rate
        ))
        prev_count = count

    overall_conversion = stage_data[-1].conversion_rate if stage_data else 0.0
    
    diagnostic = (
        f"Overall funnel conversion from '{stage_data[0].stage_name}' to '{stage_data[-1].stage_name}' is {overall_conversion}%. "
        f"The primary conversion bottleneck is at '{biggest_drop_stage}', where {biggest_drop_rate}% of qualifying users dropped off."
    )
    
    recommendations = [
        f"Prioritize UX and workflow optimization at '{biggest_drop_stage}' to reduce the {biggest_drop_rate}% drop-off.",
        "Implement abandoned step re-engagement triggers (e.g. email/SMS notifications within 2 hours).",
        "A/B test friction reduction, form simplification, and transparent next steps."
    ]
    
    return stage_data, overall_conversion, biggest_drop_stage, biggest_drop_rate, diagnostic, recommendations


def analyze_funnel(
    df: pd.DataFrame,
    stage_col: Optional[str] = None,
    user_col: Optional[str] = None,
    custom_order: Optional[List[str]] = None,
    funnel_mode: Optional[str] = "auto"
) -> FunnelAnalysisResult:
    """
    Main Funnel Analysis Agent entrypoint.
    Automatically detects stage or response columns, classifies dataset semantics,
    and converts response data into high-value conversion funnel pipelines.
    """
    det_stage, det_user, candidate_cols = detect_funnel_columns(df)
    stage_col = stage_col or det_stage
    user_col = user_col or det_user

    if not stage_col:
        raise ValueError("Could not automatically identify a 'Stage', 'Event', or 'Response' column in this dataset. Please select a column to analyze.")

    raw_series = df[stage_col].dropna().astype(str).str.strip()
    raw_counts = raw_series.value_counts().to_dict()

    # Determine whether to auto-convert responses to outreach pipeline
    is_response = is_outreach_response_data(raw_series) or any(k in stage_col.lower() for k in RESPONSE_KEYWORDS)

    detected_mode = "event_sequence"
    if funnel_mode == "pipeline" or (funnel_mode == "auto" and is_response and (not custom_order or len(custom_order) == 0)):
        detected_mode = "response_pipeline"
        stages, overall_conv, b_stage, b_rate, diag, recs = build_outreach_pipeline_funnel(
            df=df,
            stage_col=stage_col,
            user_col=user_col
        )
    else:
        detected_mode = "category_frequency" if is_response else "event_sequence"
        stages, overall_conv, b_stage, b_rate, diag, recs = build_standard_funnel(
            df=df,
            stage_col=stage_col,
            user_col=user_col,
            custom_order=custom_order
        )

    return FunnelAnalysisResult(
        stages=stages,
        overall_conversion=overall_conv,
        biggest_drop_off_stage=b_stage,
        biggest_drop_off_rate=b_rate,
        diagnostic_summary=diag,
        recommendations=recs,
        stage_column=stage_col,
        user_column=user_col,
        detected_mode=detected_mode,
        raw_response_counts=raw_counts,
        available_columns=candidate_cols
    )
