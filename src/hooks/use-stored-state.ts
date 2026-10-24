import { useEffect, useState } from "react";

export function useStoredState<T>(key: string, initial: T) {
  const [value, setValue] = useState(initial);
  const [loaded, setLoaded] = useState(false);

  // Read after the first render, so the server and the browser match.
  useEffect(() => {
    const stored = read(key);
    if (stored !== null) setValue(stored as T);
    setLoaded(true);
  }, [key]);

  useEffect(() => {
    if (loaded) write(key, value);
  }, [key, value, loaded]);

  return [value, setValue] as const;
}

// Storage can be blocked or full, so failures fall back to memory only.
function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Keep working in memory.
  }
}
