export interface D1Like {
  prepare(query: string): {
    bind: (...values: unknown[]) => {
      all: <T = unknown>() => Promise<{ results: T[] }>;
      first: <T = unknown>() => Promise<T | null>;
      run: () => Promise<unknown>;
    };
  };
}

export interface RuntimeLike {
  env?: {
    DB?: D1Like;
  };
}

export interface ExpiryEmailRuntimeLike extends RuntimeLike {
  env?: RuntimeLike["env"] & {
    RESEND_API_KEY?: string;
    NOTIFICATION_FROM_EMAIL?: string;
  };
}

export function getDB(runtime?: RuntimeLike | null) {
  return runtime?.env?.DB;
}
