import sys
import io
import time
import math
import traceback
from typing import Dict, Any, Tuple, Optional
import pandas as pd
import numpy as np
import scipy
import sklearn

# Safe builtins allowed in the analysis sandbox
SAFE_BUILTINS = {
    'abs': abs,
    'all': all,
    'any': any,
    'bool': bool,
    'dict': dict,
    'enumerate': enumerate,
    'filter': filter,
    'float': float,
    'int': int,
    'len': len,
    'list': list,
    'map': map,
    'max': max,
    'min': min,
    'print': print,
    'range': range,
    'round': round,
    'set': set,
    'sorted': sorted,
    'str': str,
    'sum': sum,
    'tuple': tuple,
    'zip': zip,
    'math': math,
    'True': True,
    'False': False,
    'None': None,
}

DANGEROUS_TOKENS = [
    '__import__', 'importlib', 'eval', 'exec', 'compile', 'open', 'file',
    'os.', 'sys.', 'subprocess', 'shutil', 'socket', 'urllib', 'requests.',
    'http.', 'builtins', '__subclasses__', '__builtins__', '__globals__'
]

def sanitize_code(code: str) -> None:
    for token in DANGEROUS_TOKENS:
        if token in code:
            raise PermissionError(f"Security violation: restricted operation '{token}' detected in analysis script.")

def execute_sandboxed_python(code: str, df: pd.DataFrame, context_vars: Optional[Dict[str, Any]] = None) -> Tuple[bool, Any, str, float]:
    """
    Executes Python analysis code safely against a copy of the dataframe.
    Returns: (success, result_value, stdout_text, execution_time_seconds)
    """
    sanitize_code(code)
    
    # Work on a shallow copy of the dataframe to protect original
    df_copy = df.copy()
    
    stdout_buffer = io.StringIO()
    old_stdout = sys.stdout
    
    execution_context = {
        '__builtins__': SAFE_BUILTINS,
        'pd': pd,
        'np': np,
        'scipy': scipy,
        'sklearn': sklearn,
        'df': df_copy,
        'result': None
    }
    
    if context_vars:
        execution_context.update(context_vars)

    start_time = time.time()
    try:
        sys.stdout = stdout_buffer
        # Execute the python script in sandboxed namespace
        exec(code, execution_context)
        exec_duration = time.time() - start_time
        captured_output = stdout_buffer.getvalue()
        result_value = execution_context.get('result', None)
        return True, result_value, captured_output, exec_duration
    except Exception as e:
        exec_duration = time.time() - start_time
        err_msg = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"
        return False, None, err_msg, exec_duration
    finally:
        sys.stdout = old_stdout
