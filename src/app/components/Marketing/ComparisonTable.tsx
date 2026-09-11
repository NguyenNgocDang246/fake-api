interface ComparisonTableProps {
  caption: string;
  columns: string[];
  rows: React.ReactNode[][];
}

export function ComparisonTable({ caption, columns, rows }: ComparisonTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl ring-1 ring-black/5 shadow-sm bg-white">
      <table className="w-full min-w-3xl border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="bg-gray-50">
            {columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="px-4 py-3 font-semibold text-gray-900 border-b border-gray-200 whitespace-nowrap"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-gray-100 last:border-b-0">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={
                    cellIndex === 0
                      ? "px-4 py-3 text-gray-900 align-top whitespace-nowrap"
                      : "px-4 py-3 text-gray-600 align-top"
                  }
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
