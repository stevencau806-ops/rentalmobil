"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Input } from "./Input";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = any;

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchKeys?: (keyof T)[];
  searchPlaceholder?: string;
  emptyMessage?: string;
  toolbar?: ReactNode;
  rowKey: (row: T) => string;
}

export function DataTable<T extends AnyRecord>({
  columns,
  data,
  searchKeys,
  searchPlaceholder = "Cari...",
  emptyMessage = "Tidak ada data.",
  toolbar,
  rowKey,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim() || !searchKeys) return data;
    const q = query.toLowerCase();
    return data.filter((row) =>
      searchKeys.some((k) =>
        String(row[k] ?? "")
          .toLowerCase()
          .includes(q)
      )
    );
  }, [data, query, searchKeys]);

  return (
    <div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {searchKeys && (
          <div className="sm:max-w-xs sm:flex-1">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
            />
          </div>
        )}
        {toolbar && <div className="flex flex-wrap gap-2">{toolbar}</div>}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`whitespace-nowrap px-4 py-3 font-semibold ${col.hideOnMobile ? "hidden md:table-cell" : ""} ${col.className ?? ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={rowKey(row)} className="hover:bg-slate-50">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 align-middle text-slate-700 ${col.hideOnMobile ? "hidden md:table-cell" : ""} ${col.className ?? ""}`}
                    >
                      {col.render ? col.render(row) : String(row[col.key as keyof T] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Menampilkan {filtered.length} dari {data.length} data
      </p>
    </div>
  );
}
