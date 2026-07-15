import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GridMatrix } from "../GridMatrix";

describe("GridMatrix", () => {
  it("exposes the shared 3×3 table topology and its headers", () => {
    render(
      <GridMatrix
        ariaLabel="Daily grid"
        rowLabels={["R1", "R2", "R3"]}
        colLabels={["C1", "C2", "C3"]}
        renderColumnHeader={(label) => label}
        renderRowHeader={(label) => label}
        renderCell={({ rowLabel, colLabel }) => `${rowLabel} × ${colLabel}`}
      />,
    );

    expect({
      tableName: screen.getByRole("table").getAttribute("aria-label"),
      columnHeaders: screen.getAllByRole("columnheader").map((node) => ({
        text: node.textContent,
        framed: node.classList.contains("bg-surface-low"),
      })),
      rowHeaders: screen.getAllByRole("rowheader").map((node) => ({
        text: node.textContent,
        framed: node.classList.contains("bg-surface-low"),
      })),
      cells: screen.getAllByRole("cell").map((node) => node.textContent),
    }).toEqual({
      tableName: "Daily grid",
      columnHeaders: [
        { text: "C1", framed: true },
        { text: "C2", framed: true },
        { text: "C3", framed: true },
      ],
      rowHeaders: [
        { text: "R1", framed: true },
        { text: "R2", framed: true },
        { text: "R3", framed: true },
      ],
      cells: [
        "R1 × C1",
        "R1 × C2",
        "R1 × C3",
        "R2 × C1",
        "R2 × C2",
        "R2 × C3",
        "R3 × C1",
        "R3 × C2",
        "R3 × C3",
      ],
    });
  });
});
