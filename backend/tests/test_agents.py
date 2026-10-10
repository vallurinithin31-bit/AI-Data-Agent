import unittest
import pandas as pd
import numpy as np

from backend.app.tools.data_loader import register_dataset, list_all_datasets, get_dataset
from backend.app.agents.data_profiler import profile_dataset, calculate_numerical_statistics
from backend.app.agents.data_cleaner import generate_cleaning_plan, apply_cleaning_actions
from backend.app.agents.funnel_agent import analyze_funnel
from backend.app.agents.cohort_agent import analyze_cohorts
from backend.app.agents.segmentation_agent import perform_rfm_segmentation
from backend.app.agents.forecasting_agent import forecast_time_series
from backend.app.agents.anomaly_agent import detect_anomalies
from backend.app.agents.stats_agent import run_correlation_analysis
from backend.app.agents.validation_agent import validate_analysis_integrity
from backend.app.agents.report_agent import generate_comprehensive_report
from backend.app.agents.orchestrator import run_agentic_analysis

class TestDataAnalystAgents(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        np.random.seed(42)
        dates = pd.date_range(start='2024-01-01', periods=365)
        df_ecom = pd.DataFrame({
            'Order_ID': [f"ORD-{i}" for i in range(365)],
            'Order_Date': dates,
            'Customer_ID': [f"CUST-{i%10}" for i in range(365)],
            'Product_Category': ['Electronics' if i%2==0 else 'Books' for i in range(365)],
            'Quantity': np.random.randint(1, 5, 365),
            'Revenue': np.random.uniform(50, 500, 365),
            'Profit': np.random.uniform(10, 100, 365),
        })
        # Add an outlier to trigger anomaly detection
        df_ecom.loc[95, 'Revenue'] = 9999.0
        cls.ecom_meta = register_dataset("E-Commerce Test.csv", df_ecom, "csv", persist_to_disk=False)

        df_saas = pd.DataFrame({
            'Customer_ID': [f"SAAS-{i}" for i in range(365)],
            'Signup_Date': dates,
            'Plan': ['Starter' if i%2==0 else 'Pro' for i in range(365)],
            'MRR': [29.0 if i%2==0 else 99.0 for i in range(365)],
        })
        cls.saas_meta = register_dataset("SaaS Test.csv", df_saas, "csv", persist_to_disk=False)

        stages = ['Visitors', 'Sign Up', 'Purchase']
        df_funnel = pd.DataFrame({
            'User_ID': [f"U-{i}" for i in range(100)],
            'Stage': [stages[i % 3] for i in range(100)],
            'Converted': [1] * 100
        })
        cls.funnel_meta = register_dataset("Funnel Test.csv", df_funnel, "csv", persist_to_disk=False)

    @classmethod
    def tearDownClass(cls):
        from backend.app.tools.data_loader import delete_dataset
        for m in [cls.ecom_meta, cls.saas_meta, cls.funnel_meta]:
            delete_dataset(m.id)

    def test_profiler_agent(self):
        df = get_dataset(self.ecom_meta.id)
        report = profile_dataset(df)
        self.assertGreaterEqual(report.overall_score, 0)
        self.assertLessEqual(report.overall_score, 100)
        self.assertIn(report.grade, ['A', 'B', 'C', 'D', 'F'])
        stats = calculate_numerical_statistics(df)
        self.assertGreater(len(stats), 0)

    def test_cleaning_agent(self):
        df = get_dataset(self.ecom_meta.id)
        plan = generate_cleaning_plan(df, self.ecom_meta.id, self.ecom_meta.name)
        self.assertGreater(plan.total_actions, 0)
        # Apply first action non-destructively
        action_ids = [plan.actions[0].id]
        clean_meta, summary = apply_cleaning_actions(self.ecom_meta.id, action_ids)
        self.assertTrue(clean_meta.is_cleaned)
        self.assertEqual(clean_meta.parent_dataset_id, self.ecom_meta.id)
        from backend.app.tools.data_loader import delete_dataset
        delete_dataset(clean_meta.id)

    def test_funnel_agent(self):
        df = get_dataset(self.funnel_meta.id)
        f_res = analyze_funnel(df)
        self.assertGreater(len(f_res.stages), 2)
        self.assertGreater(f_res.overall_conversion, 0.0)
        self.assertTrue(len(f_res.biggest_drop_off_stage) > 0)

    def test_response_funnel_auto_conversion(self):
        import pandas as pd
        df_resp = pd.DataFrame({
            'Contact_ID': range(1, 21),
            'Response': [
                'NO ANSWER', 'NO ANSWER', 'NO ANSWER', 'NO ANSWER',
                'NO ANSWER', 'NO ANSWER', 'NO ANSWER', 'NO ANSWER',
                'NO ANSWER', 'NO ANSWER', 'NO ANSWER', 'NO ANSWER',
                'SHARE ME THE DETAILS', 'SHARE ME THE DETAILS', 'SHARE ME THE DETAILS', 'SHARE ME THE DETAILS',
                'SWITCH OFF', 'SWITCH OFF',
                'NOT INTRESTED', 'NOT INTRESTED'
            ]
        })
        f_res = analyze_funnel(df_resp)
        self.assertEqual(f_res.detected_mode, 'response_pipeline')
        self.assertEqual(f_res.stage_column, 'Response')
        self.assertEqual(len(f_res.stages), 4)
        self.assertEqual(f_res.stages[0].user_count, 20)
        self.assertEqual(f_res.stages[1].user_count, 18)
        self.assertEqual(f_res.stages[2].user_count, 6)
        self.assertEqual(f_res.stages[3].user_count, 4)
        self.assertEqual(f_res.overall_conversion, 20.0)
        self.assertEqual(f_res.biggest_drop_off_stage, 'Connected & Answered Calls')
        self.assertEqual(f_res.biggest_drop_off_rate, 66.7)

    def test_cohort_agent(self):
        df = get_dataset(self.saas_meta.id)
        c_res = analyze_cohorts(df, user_col='Customer_ID', date_col='Signup_Date')
        self.assertGreater(len(c_res.cohorts), 0)
        self.assertGreater(len(c_res.periods), 0)

    def test_segmentation_agent(self):
        df = get_dataset(self.ecom_meta.id)
        s_res = perform_rfm_segmentation(df, cust_col='Customer_ID', date_col='Order_Date', amount_col='Revenue')
        self.assertGreater(len(s_res.segments), 0)
        self.assertEqual(s_res.method, "RFM Analysis")

    def test_forecasting_agent(self):
        df = get_dataset(self.ecom_meta.id)
        fc_res = forecast_time_series(df, date_col='Order_Date', target_col='Revenue', horizon=6)
        self.assertTrue(fc_res.is_suitable)
        self.assertGreater(len(fc_res.points), 6)

    def test_anomaly_agent(self):
        df = get_dataset(self.ecom_meta.id)
        ano_res = detect_anomalies(df, metric_col='Revenue')
        self.assertGreater(ano_res.total_anomalies, 0)

    def test_stats_agent(self):
        df = get_dataset(self.ecom_meta.id)
        stat_res = run_correlation_analysis(df, 'Quantity', 'Revenue')
        self.assertIsNotNone(stat_res.statistic)
        self.assertIsNotNone(stat_res.p_value)

    def test_validation_agent(self):
        df = get_dataset(self.ecom_meta.id)
        is_valid, notes = validate_analysis_integrity(
            df=df,
            execution_success=True,
            required_columns=['Revenue'],
            computed_metrics={'total_rev': 50000.0},
            written_insights=['Total revenue was 50000.0'],
            visual_data=[{'x': 1, 'y': 2}]
        )
        self.assertTrue(is_valid)

    def test_report_agent(self):
        report = generate_comprehensive_report(self.ecom_meta.id)
        self.assertIn("executive_summary", report)
        self.assertIn("kpis", report)
        self.assertIn("key_insights", report)
        self.assertIn("recommendations", report)

    def test_orchestrator(self):
        res = run_agentic_analysis(self.ecom_meta.id, "Analyze this dataset and give me key insights")
        self.assertTrue(res.validation_passed)
        self.assertGreater(len(res.plan.steps), 0)
        self.assertGreater(len(res.key_findings), 0)

if __name__ == '__main__':
    unittest.main()
