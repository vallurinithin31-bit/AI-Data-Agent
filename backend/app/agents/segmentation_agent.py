import pandas as pd
import numpy as np
from typing import Optional, List, Dict, Any, Tuple
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from backend.app.schemas.analysis import SegmentationResult, CustomerSegment

def perform_rfm_segmentation(df: pd.DataFrame, cust_col: str, date_col: str, amount_col: str) -> SegmentationResult:
    df_clean = df[[cust_col, date_col, amount_col]].dropna().copy()
    df_clean['Date'] = pd.to_datetime(df_clean[date_col], errors='coerce')
    df_clean['Amount'] = pd.to_numeric(df_clean[amount_col], errors='coerce')
    df_clean = df_clean.dropna()
    
    reference_date = df_clean['Date'].max() + pd.Timedelta(days=1)
    
    # Calculate RFM per customer
    rfm = df_clean.groupby(cust_col).agg(
        Recency=('Date', lambda d: (reference_date - d.max()).days),
        Frequency=(cust_col, 'count'),
        Monetary=('Amount', 'sum')
    ).reset_index()
    
    total_cust = len(rfm)
    if total_cust < 5:
        raise ValueError("Insufficient unique customers for reliable segmentation (minimum 5 required).")

    # Quantile ranks (1 to 5)
    try:
        rfm['R_Score'] = pd.qcut(rfm['Recency'], 5, labels=[5, 4, 3, 2, 1], duplicates='drop').astype(int)
    except Exception:
        rfm['R_Score'] = 3
        
    try:
        rfm['F_Score'] = pd.qcut(rfm['Frequency'].rank(method='first'), 5, labels=[1, 2, 3, 4, 5]).astype(int)
    except Exception:
        rfm['F_Score'] = 3
        
    try:
        rfm['M_Score'] = pd.qcut(rfm['Monetary'], 5, labels=[1, 2, 3, 4, 5], duplicates='drop').astype(int)
    except Exception:
        rfm['M_Score'] = 3

    def assign_segment(row):
        r, f, m = row['R_Score'], row['F_Score'], row['M_Score']
        if r >= 4 and f >= 4 and m >= 4:
            return "Champions"
        elif r >= 3 and f >= 3 and m >= 3:
            return "Loyal Customers"
        elif r >= 4 and f <= 2:
            return "Potential Loyalists"
        elif r >= 4 and f == 1:
            return "New Customers"
        elif r <= 2 and (f >= 3 or m >= 3):
            return "At Risk"
        else:
            return "Lost Customers"

    rfm['Segment'] = rfm.apply(assign_segment, axis=1)
    
    # Segment aggregations
    segment_stats = rfm.groupby('Segment').agg(
        Count=(cust_col, 'count'),
        AvgRecency=('Recency', 'mean'),
        AvgFrequency=('Frequency', 'mean'),
        AvgMonetary=('Monetary', 'mean')
    ).reset_index()
    
    segment_profiles = {
        "Champions": ("Bought recently, buy often, and spend the most.", ["VIP perks", "Early product access", "Advocacy programs"]),
        "Loyal Customers": ("Consistent spenders with high repeat visit rates.", ["Upsell higher tiers", "Referral rewards", "Loyalty points"]),
        "Potential Loyalists": ("Recent shoppers with average frequency who could become champions.", ["Targeted promotions", "Personalized recommendations", "Membership onboarding"]),
        "New Customers": ("Recently acquired users with minimal transaction history.", ["Welcome sequences", "Product education", "First-order discounts"]),
        "At Risk": ("High previous spenders who have not transacted recently.", ["Reactivation campaigns", "Direct outreach", "Limited-time win-back offers"]),
        "Lost Customers": ("Lowest recency, frequency, and monetary scores.", ["Low-cost automated email campaigns", "Surveys on dissatisfaction"])
    }
    
    segments: List[CustomerSegment] = []
    for _, row in segment_stats.iterrows():
        name = row['Segment']
        desc, traits = segment_profiles.get(name, ("General customer cohort", ["Regular monitoring"]))
        cnt = int(row['Count'])
        pct = round((cnt / total_cust) * 100, 1)
        
        segments.append(CustomerSegment(
            segment_name=name,
            customer_count=cnt,
            percentage=pct,
            avg_recency=round(float(row['AvgRecency']), 1),
            avg_frequency=round(float(row['AvgFrequency']), 1),
            avg_monetary=round(float(row['AvgMonetary']), 2),
            description=desc,
            key_traits=traits
        ))
        
    # Sample points for scatter visualization
    scatter_sample = rfm.sample(min(200, len(rfm))).to_dict(orient='records')
    scatter_data = [
        {
            "customer": str(r[cust_col]),
            "recency": int(r['Recency']),
            "frequency": int(r['Frequency']),
            "monetary": round(float(r['Monetary']), 2),
            "segment": str(r['Segment'])
        }
        for r in scatter_sample
    ]

    summary = (
        f"Segmented {total_cust:,} customers into {len(segments)} distinct cohorts using RFM scoring. "
        f"Champions and Loyal Customers represent "
        f"{sum(s.percentage for s in segments if s.segment_name in ['Champions', 'Loyal Customers']):.1f}% of client base."
    )

    return SegmentationResult(
        total_customers=total_cust,
        method="RFM Analysis",
        segments=segments,
        summary=summary,
        scatter_data=scatter_data
    )

def perform_kmeans_clustering(df: pd.DataFrame, feature_cols: List[str], n_clusters: int = 4) -> SegmentationResult:
    clean_df = df[feature_cols].dropna().copy()
    if len(clean_df) < n_clusters * 3:
        raise ValueError(f"Insufficient samples ({len(clean_df)}) for {n_clusters} clusters.")
        
    scaler = StandardScaler()
    scaled_data = scaler.fit_transform(clean_df)
    
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init='auto')
    clean_df['Cluster'] = kmeans.fit_predict(scaled_data)
    
    segments: List[CustomerSegment] = []
    total = len(clean_df)
    
    for c_id in range(n_clusters):
        sub = clean_df[clean_df['Cluster'] == c_id]
        cnt = len(sub)
        pct = round((cnt / total) * 100, 1)
        
        # Describe based on primary features
        means = sub[feature_cols].mean().to_dict()
        top_feature = max(means, key=lambda k: means[k])
        
        segments.append(CustomerSegment(
            segment_name=f"Cluster {c_id + 1} ({top_feature.capitalize()}-Dominant)",
            customer_count=cnt,
            percentage=pct,
            avg_recency=0.0,
            avg_frequency=float(cnt),
            avg_monetary=round(float(means.get(top_feature, 0.0)), 2),
            description=f"Cluster with highest concentration in {top_feature} (mean: {round(means[top_feature], 2)}).",
            key_traits=[f"{k}: avg {round(v, 2)}" for k, v in list(means.items())[:3]]
        ))

    return SegmentationResult(
        total_customers=total,
        method="K-Means Clustering",
        segments=segments,
        summary=f"Clustered {total:,} observations into {n_clusters} statistical clusters using {', '.join(feature_cols)}."
    )
