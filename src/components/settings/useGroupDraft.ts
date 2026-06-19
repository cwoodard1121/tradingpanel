"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface GroupDraft<T> {
  draft: T;
  /** Update a single field on the draft. */
  setField: <K extends keyof T>(key: K, value: T[K]) => void;
  /** Replace the whole draft (e.g. when editing arrays). */
  setDraft: (next: T) => void;
  /** True when the draft differs from the last-persisted value. */
  dirty: boolean;
  saving: boolean;
  /** True briefly after a successful save (for transient "Saved" feedback). */
  saved: boolean;
  save: () => Promise<void>;
  /** Discard local edits back to the persisted value. */
  reset: () => void;
}

/**
 * useGroupDraft — local editable copy of one settings group with dirty
 * detection and obvious save feedback. Adopts new persisted values whenever they
 * change (initial load / external save) so the form never shows stale defaults.
 */
export function useGroupDraft<T extends Record<string, unknown>>(
  persisted: T,
  onSave: (draft: T) => Promise<void>,
): GroupDraft<T> {
  const [draft, setDraftState] = useState<T>(persisted);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const persistedKey = JSON.stringify(persisted);
  const lastKeyRef = useRef<string>(persistedKey);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Adopt persisted whenever it actually changes by value.
  useEffect(() => {
    if (lastKeyRef.current !== persistedKey) {
      lastKeyRef.current = persistedKey;
      setDraftState(persisted);
    }
    // persisted is intentionally compared via persistedKey, not identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistedKey]);

  useEffect(() => {
    return () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setDraftState((d) => ({ ...d, [key]: value }) as T);
  }, []);

  const setDraft = useCallback((next: T) => {
    setDraftState(next);
  }, []);

  const reset = useCallback(() => {
    setDraftState(persisted);
  }, [persisted]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(draft);
      setSaved(true);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 2200);
    } finally {
      setSaving(false);
    }
  }, [draft, onSave]);

  const dirty = persistedKey !== JSON.stringify(draft);

  return { draft, setField, setDraft, dirty, saving, saved, save, reset };
}
