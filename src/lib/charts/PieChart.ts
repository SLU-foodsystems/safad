import * as d3 from "d3";
import { partition, reversed } from "../utils";
import { contrastingTextColor, safeLabelColor } from "./charts-utils";

interface Config {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
  drawLabels: boolean;
}

export interface DataPoint {
  label: string;
  color: string;
  value: number;
}

const stack = <T>(xs: T[]): [T, T][] => {
  if (xs.length < 2) return [];

  return Array.from({ length: xs.length - 1 }).map((_, i) => [
    xs[i],
    xs[i + 1],
  ]);
};

export default function PieChart(
  container: HTMLElement,
  data: DataPoint[],
  cfgOverrides: Partial<Config>
) {
  const cfg: Config = {
    width: 450,
    height: 450,
    drawLabels: false,
    padding: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
    ...cfgOverrides,
  };

  // The radius of the pieplot is half the width or half the height (smallest one). I subtract a bit of margin.
  const innerWidth = cfg.width - cfg.padding.left - cfg.padding.right;
  const innerHeight = cfg.height - cfg.padding.top - cfg.padding.bottom;

  // Radius of the outermost circle
  const outerRadius = Math.min(innerWidth, innerHeight) / 2;
  const innerRadius = outerRadius * 0.9;

  // Remove whatever chart with the same id/class was present before
  d3.select(container).select("svg").remove();

  // Create the tooltip element, outside of the svg
  const tooltip = d3
    .select(container)
    .append("div")
    .attr("class", "d3-tooltip")
    .style("text-align", "left");

  const moveTooltip = (event: MouseEvent) => {
    // Offset x, y since main element (pie) is already offset
    const x = cfg.width / 2 + event.layerX + 10;
    const y = cfg.height / 2 + event.layerY;
    tooltip.style("transform", `translate(${x}px, ${y}px)`);
  };

  const root = d3
    .select(container)
    .append("svg")
    .attr("width", cfg.width)
    .attr("height", cfg.height)
    .append("g")
    .attr("transform", `translate(${cfg.width / 2}, ${cfg.height / 2})`);

  // Compute the position of each group on the pie:
  const pie = d3
    .pie<DataPoint>()
    .sort(null)
    .value((d) => d.value);
  const arcs = pie(data);
  // shape helper to build arcs:
  const arcGenerator = d3
    .arc<d3.PieArcDatum<DataPoint>>()
    .innerRadius(0)
    .outerRadius(innerRadius);

  const outerArc = d3
    .arc<d3.PieArcDatum<DataPoint>>()
    .innerRadius(outerRadius)
    .outerRadius(outerRadius);


  // Build the pie chart: Basically, each part of the pie is a path that we build using the arc function.
  root
    .selectAll("slices")
    .data(arcs)
    .enter()
    .append("path")
    .attr("d", arcGenerator)
    .attr("fill", (d) => d.data.color)
    .on("mouseover", function (event, d) {
      if (!d || !d.data || !d.value) return;

      const subgroupName = d.data.label;
      const subgroupValue = d.data.value * 100;
      const tooltipHtml =
        `<strong>${subgroupName}</strong><br />` +
        `${subgroupValue.toPrecision(2)}%`;

      tooltip.html(tooltipHtml).style("opacity", 1);

      tooltip
        .style("background-color", d.data.color)
        .style("color", contrastingTextColor(d.data.color));

      moveTooltip(event);
    })
    .on("mousemove", moveTooltip)
    .on("mouseleave", () => {
      tooltip.style("opacity", 0);
    });

  if (!cfg.drawLabels) return;

  // ==================================================
  // Draw the labels and lines - a bit tricky
  // ==================================================

  // First, we draw the text once. We're only doing this to get the

  const TEXT_HEIGHT = 22; // Hard-code this instead of using BCRs, sorry
  const initialPositions = arcs.map((d) => {
    const pos = outerArc.centroid(d);
    const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
    pos[0] = outerRadius * (midAngle < Math.PI ? 1 : -1);
    return pos;
  });

  // Could also be done with index check, bc it's right until first occurance of
  // textAnchor switch -- assumed later in code
  const [rhsTextPositions, lhsTextPositions] = partition(
    initialPositions,
    (pos) => pos[0] > 0
  );

  // Helper to copy a nested array, creating a mutable clone
  const copyNestedArr = <T>(xss: T[][]): T[][] => xss.map((xs) => [...xs]);

  const drawWithoutCollisions = (
    startIndex: number,
    endIndex: number,
    positions: [number, number][],
    reverse: boolean
  ) => {
    // Assumed space we want between the text elements
    const MARGIN = 5;
    // Here, we'll store the distances with which we will shift all elements
    const yOffsets = positions.map((_) => 0);

    // First, we clockwise (top-2-bottom on RHS, b2t on LHS) and try to shift
    // all texts in that direction.
    stack(copyNestedArr(positions)).forEach(([prev, curr], i) => {
      const prevY = curr[1];
      const newY = reverse
        ? Math.min(prev[1] - TEXT_HEIGHT - MARGIN, curr[1])
        : Math.max(prev[1] + TEXT_HEIGHT + MARGIN, curr[1]);
      curr[1] = newY;
      const offset = newY - prevY;
      yOffsets[i + 1] = offset;
    });

    // Now, we may have pushed some text-elemnts out of the canvas when doing
    // this. Have we?
    const hasOutOfBounds = positions.some(
      ([_x, y], i) => Math.abs(y + yOffsets[i]) > innerHeight / 2
    );
    if (hasOutOfBounds) {
      // Yes! Repeat the procedure, this time counter-clockwise.
      yOffsets.forEach((_, i) => {
        yOffsets[i] = 0;
      });
      const N = positions.length - 1;

      stack(reversed(copyNestedArr(positions))).forEach(([prev, curr], i) => {
        const prevY = curr[1];
        const newY = reverse
          ? Math.max(prev[1] + TEXT_HEIGHT + MARGIN, curr[1])
          : Math.min(prev[1] - TEXT_HEIGHT - MARGIN, curr[1]);
        curr[1] = newY;
        const offset = newY - prevY;
        yOffsets[N - i - 1] = offset;
      });
    }

    const arcsSubset = arcs.slice(startIndex, endIndex);

    root
      .selectAll("polylines")
      .data(arcsSubset)
      .enter()
      .append("polyline")
      .attr("stroke", (d) => d.data.color)
      .style("fill", "none")
      .style("pointer-events", "none")
      .attr("stroke-width", 1)
      // @ts-ignore
      .attr("points", (d, i) => {
        // line insertion in the slice
        const posA = arcGenerator.centroid(d);
        // line break: we use the other arc generator that has been built only for that
        const posB = outerArc.centroid(d);
        // Label position = almost the same as posB
        const posC = outerArc.centroid(d);
        // we need the angle to see if the X position will be at the extreme right
        // or extreme left
        const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
        // multiply by 1 or -1 to put it on the right or on the left
        //          by 0.95 to avoid line going all the way to the text
        posC[0] = outerRadius * 0.95 * (midangle < Math.PI ? 1 : -1);
        posC[1] += yOffsets[i];

        // If pos C lies between A and B, move B in line with C
        if (
          (posA[1] < posC[1] && posC[1] < posB[1]) ||
          (posA[1] > posC[1] && posC[1] > posB[1])
        ) {
          posB[1] = posC[1];
        }
        // ... and same for x
        if (
          (posA[0] < posC[0] && posC[0] < posB[0]) ||
          (posA[0] > posC[0] && posC[0] > posB[0])
        ) {
          posB[0] = posC[0];
        }
        return [posA, posB, posC];
      });

    // Now add the annotation. Use the centroid method to get the best coordinates
    root
      .selectAll("slices")
      .data(arcsSubset)
      .enter()
      .append("text")
      .text((d) => d.data.label)
      .style("fill", (d) => safeLabelColor(d.data.color))
      .style("font-weight", "bold")
      .attr("dy", "0.25em")
      .attr("transform", (d, i) => {
        const pos = outerArc.centroid(d);
        const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
        pos[0] = outerRadius * (midAngle < Math.PI ? 1 : -1);
        pos[1] += yOffsets[i];

        return `translate(${pos})`;
      })
      .style("text-anchor", (d) => {
        const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
        return midAngle < Math.PI ? "start" : "end";
      });
  };

  root.selectAll("text").remove();

  const sideSwitchIndex = rhsTextPositions.length;
  const endIndex = lhsTextPositions.length + rhsTextPositions.length - 1;
  drawWithoutCollisions(0, sideSwitchIndex, rhsTextPositions, false);
  drawWithoutCollisions(sideSwitchIndex, endIndex + 1, lhsTextPositions, true);
}
