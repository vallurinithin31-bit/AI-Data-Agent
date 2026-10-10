import duckdb
import pandas as pd
import re
from typing import Dict, Any, List, Tuple

FORBIDDEN_SQL_KEYWORDS = [
    r'\bDROP\b', r'\bDELETE\b', r'\bTRUNCATE\b', r'\bUPDATE\b',
    r'\bINSERT\b', r'\bALTER\b', r'\bATTACH\b', r'\bINSTALL\b',
    r'\bLOAD\b', r'\bCOPY\b', r'\bPRAGMA\b'
]

def validate_safe_sql(query: str) -> None:
    for pattern in FORBIDDEN_SQL_KEYWORDS:
        if re.search(pattern, query, re.IGNORECASE):
            raise PermissionError(f"SQL statement contains disallowed operation matching '{pattern}'. Only SELECT/WITH queries allowed.")

def execute_sql_query(query: str, df: pd.DataFrame, max_rows: int = 500) -> Tuple[bool, List[Dict[str, Any]], List[str], str]:
    """
    Executes a SQL query on the DataFrame using DuckDB.
    Returns: (success, rows_list, column_names, error_or_success_message)
    """
    try:
        validate_safe_sql(query)
        con = duckdb.connect(database=':memory:')
        # Register the dataframe under standard table names
        con.register('dataset', df)
        con.register('df', df)
        
        result_df = con.execute(query).fetchdf()
        
        # Limit rows returned to prevent frontend overload
        if len(result_df) > max_rows:
            result_df = result_df.head(max_rows)
            
        # Convert timestamp or numpy types to JSON serializable objects
        records = result_df.to_dict(orient='records')
        for row in records:
            for k, v in row.items():
                if pd.isna(v):
                    row[k] = None
                elif isinstance(v, (pd.Timestamp, pd.Timedelta)):
                    row[k] = str(v)
                elif hasattr(v, 'item'):  # numpy types
                    row[k] = v.item()

        columns = [str(c) for c in result_df.columns]
        return True, records, columns, "Query executed successfully"
    except Exception as e:
        return False, [], [], f"SQL Execution Error: {str(e)}"
    finally:
        try:
            con.close()
        except Exception:
            pass
