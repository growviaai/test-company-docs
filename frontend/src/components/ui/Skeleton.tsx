// 11-design-system.md §(components list) calls for a Skeleton component,
// and the loading convention: "skeleton blocks for lists and pages,
// spinner only for buttons." This is that block — a plain pulsing
// rectangle sized by the caller via className.
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-border/60 ${className}`} />;
}

/** A skeleton for a `<table>` body: `rows` rows of `cols` cells, each a
 * Skeleton block. Matches the row height/padding the real tables use
 * (`py-2` cells) so the layout doesn't jump once data arrives. */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-border/60">
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c} className="py-2">
              <Skeleton className="h-4 w-full max-w-[12rem]" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

/** A skeleton for a simple vertical list of cards/rows (e.g. sessions,
 * search results) rather than a `<table>`. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
