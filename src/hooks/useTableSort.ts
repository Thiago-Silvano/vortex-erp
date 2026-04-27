import { useMemo, useState, useCallback } from "react";
import type { SortDirection, SortState } from "@/components/ui/table";

export type SortAccessor<T> = (row: T) => unknown;
export type SortAccessors<T> = Record<string, SortAccessor<T>>;

export interface UseTableSortOptions {
  initialKey?: string | null;
  initialDirection?: SortDirection;
  /**
   * Cycle order when clicking the same column. Default: asc -> desc -> null.
   */
  cycle?: ("asc" | "desc" | null)[];
}

const compareValues = (a: unknown, b: unknown): number => {
  // Nulls/undefined go last
  const aNil = a === null || a === undefined || a === "";
  const bNil = b === null || b === undefined || b === "";
  if (aNil && bNil) return 0;
  if (aNil) return 1;
  if (bNil) return -1;

  if (typeof a === "number" && typeof b === "number") return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();

  // Try numeric comparison if both look numeric
  const an = typeof a === "string" ? Number(a) : NaN;
  const bn = typeof b === "string" ? Number(b) : NaN;
  if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;

  // Try date comparison if both look like ISO/dates
  if (typeof a === "string" && typeof b === "string") {
    const ad = Date.parse(a);
    const bd = Date.parse(b);
    if (!Number.isNaN(ad) && !Number.isNaN(bd)) return ad - bd;
    return a.localeCompare(b, "pt-BR", { sensitivity: "base", numeric: true });
  }

  return String(a).localeCompare(String(b), "pt-BR", { sensitivity: "base", numeric: true });
};

export function useTableSort<T>(
  data: T[],
  accessors: SortAccessors<T>,
  options: UseTableSortOptions = {},
) {
  const { initialKey = null, initialDirection = null, cycle = ["asc", "desc", null] } = options;
  const [sortState, setSortState] = useState<SortState>({
    key: initialKey,
    direction: initialDirection,
  });

  const requestSort = useCallback(
    (key: string) => {
      setSortState((prev) => {
        if (prev.key !== key) return { key, direction: cycle[0] ?? "asc" };
        const idx = cycle.indexOf(prev.direction);
        const next = cycle[(idx + 1) % cycle.length];
        return next === null ? { key: null, direction: null } : { key, direction: next };
      });
    },
    [cycle],
  );

  const sortedData = useMemo(() => {
    if (!sortState.key || !sortState.direction) return data;
    const accessor = accessors[sortState.key];
    if (!accessor) return data;
    const dir = sortState.direction === "asc" ? 1 : -1;
    return [...data].sort((a, b) => compareValues(accessor(a), accessor(b)) * dir);
  }, [data, sortState, accessors]);

  return { sortedData, sortState, requestSort };
}