from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
import calendar

from app.modules.health_worker_portal.models import HealthRecord

def get_analytics_summary(db: Session):
    # Total Cases (YTD - simplified to all records for now)
    total_cases = db.query(HealthRecord).count()
    
    # Active Outbreak Alerts (mock logic based on village counts)
    village_counts = db.query(
        HealthRecord.village, func.count(HealthRecord.id).label('count')
    ).group_by(HealthRecord.village).all()
    
    alerts = sum(1 for v in village_counts if v.count > 10) # 10 cases in a village = alert
    
    # Disease Trends (Cases per month)
    trends = {
        'labels': [],
        'data': []
    }
    
    # Fetch all dates and group in python (sqlite doesn't have great date truncation across versions)
    records = db.query(HealthRecord.created_at).all()
    monthly_counts = {}
    for r in records:
        if r.created_at:
            m_str = r.created_at.strftime("%b")
            monthly_counts[m_str] = monthly_counts.get(m_str, 0) + 1
            
    # Sort months (hacky approach for short months)
    months_order = [calendar.month_abbr[i] for i in range(1, 13)]
    for m in months_order:
        if m in monthly_counts:
            trends['labels'].append(m)
            trends['data'].append(monthly_counts[m])
            
    # Resource Allocation (Cases by Village -> dictates kits distributed)
    # We will map village counts to "Kits Distributed" for the mock chart
    allocation = {
        'labels': [],
        'data': []
    }
    for v in village_counts:
        allocation['labels'].append(v.village)
        # Mock assumption: 1 case needs roughly 2 kits
        allocation['data'].append(v.count * 2)
        
    return {
        "total_cases_ytd": total_cases,
        "active_outbreak_alerts": alerts,
        "disease_trends": trends,
        "resource_allocation": allocation
    }
