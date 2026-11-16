import { Eyebrow } from "@/components/editorial/Eyebrow";

type Props = {
  headers: readonly string[];
  rows: readonly (readonly string[])[];
};

/** Tableau éditorial tonal pour les pages légales (surface-low, sans bordure dure). */
export function LegalTable({ headers, rows }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl bg-surface-low px-4 py-3">
      <table className="w-full min-w-[28rem] text-left font-sans text-xs leading-relaxed">
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th
                key={header}
                scope="col"
                className={`pb-2.5 font-semibold whitespace-nowrap ${
                  index < headers.length - 1 ? "pr-4" : ""
                }`}
              >
                <Eyebrow as="span">{header}</Eyebrow>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, rowIndex) => (
            <tr
              key={cells[0] ?? rowIndex}
              className="border-t border-outline-variant/10 align-top"
            >
              {cells.map((cell, cellIndex) => (
                <td
                  key={headers[cellIndex] ?? cellIndex}
                  className={`py-2.5 ${
                    cellIndex < cells.length - 1 ? "pr-4" : ""
                  } ${
                    cellIndex === 0
                      ? "font-medium text-on-surface sm:whitespace-nowrap"
                      : "text-on-surface-variant"
                  }`}
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
