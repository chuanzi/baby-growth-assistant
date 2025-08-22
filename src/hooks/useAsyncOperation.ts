import { useState, useCallback } from 'react';
import { AppError, getErrorDetails, getUserFriendlyMessage, reportError } from '@/lib/error-handler';

export interface AsyncOperationState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  isSuccess: boolean;
  isError: boolean;
}

export interface AsyncOperationActions<T> {
  execute: () => Promise<void>;
  reset: () => void;
  setData: (data: T | null) => void;
  setError: (error: string) => void;
}

export interface UseAsyncOperationReturn<T> extends AsyncOperationState<T>, AsyncOperationActions<T> {}

export function useAsyncOperation<T = unknown>(
  operation: () => Promise<T>,
  options: {
    onSuccess?: (data: T) => void;
    onError?: (error: AppError) => void;
    initialData?: T;
    reportErrors?: boolean;
  } = {}
): UseAsyncOperationReturn<T> {
  const { onSuccess, onError, initialData = null, reportErrors = true } = options;

  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await operation();
      setData(result);
      onSuccess?.(result);
    } catch (err) {
      const appError = getErrorDetails(err);
      const userMessage = getUserFriendlyMessage(appError);
      
      setError(userMessage);
      onError?.(appError);

      if (reportErrors) {
        reportError(appError);
      }
    } finally {
      setLoading(false);
    }
  }, [operation, onSuccess, onError, reportErrors]);

  const reset = useCallback(() => {
    setData(initialData);
    setLoading(false);
    setError(null);
  }, [initialData]);

  const setErrorAction = useCallback((errorMessage: string) => {
    setError(errorMessage);
  }, []);

  return {
    data,
    loading,
    error,
    isSuccess: !loading && !error && data !== null,
    isError: !loading && error !== null,
    execute,
    reset,
    setData,
    setError: setErrorAction,
  };
}

// Specialized hook for API calls
export function useApiCall<T = unknown>(
  apiCall: () => Promise<Response>,
  options: Parameters<typeof useAsyncOperation>[1] = {}
) {
  return useAsyncOperation(async () => {
    const response = await apiCall();
    
    if (!response.ok) {
      // Let the error handler determine the appropriate error type
      throw new Error(`API call failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return data as T;
  }, options);
}

// Hook for form submissions with loading state
export function useFormSubmission<T = unknown>(
  submitFn: () => Promise<T>,
  options: {
    onSuccess?: (data: T) => void;
    onError?: (error: AppError) => void;
    resetOnSuccess?: boolean;
  } = {}
) {
  const { onSuccess, onError, resetOnSuccess = false } = options;

  const asyncOp = useAsyncOperation(submitFn, {
    onSuccess: (data) => {
      onSuccess?.(data);
      if (resetOnSuccess) {
        setTimeout(() => asyncOp.reset(), 1000);
      }
    },
    onError,
  });

  return {
    ...asyncOp,
    isSubmitting: asyncOp.loading,
    submitError: asyncOp.error,
    submit: asyncOp.execute,
  };
}