//@ts-disable
import * as d3 from "d3";
import { reversed } from "@/lib/utils";

type DataPoint = {
  [k: string]: number | string;
};

interface Config {
  margin: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  maxValue: number;
  minValue: number;
  innerPadding: number;

  colors: string[]; // could also be function?

  labelTextMapper: (id: string) => string;
  labelLayout: "normal" | "slanted" | "offset";
  axisLabels?: {
    // x: string; // TODO: Not implemented
    y: string;
  };
}

export default function StackedBarChart(
  containerSelector: HTMLElement,
  data: DataPoint[],
  columns: string[],
  options: Partial<Config>
) {
  const cfg: Config = {
    width: 700,
    height: 400,
    maxValue: 1,
    minValue: 0,
    innerPadding: 0.2,

    labelLayout: "normal",
    labelTextMapper: (id: string) => id, // no change
    colors: [],
    ...options,

    // Nested items
    margin: {
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      ...options.margin,
    },
  };

  // Make sure a colors-array is provided of sufficient length
  if (!cfg.colors || cfg.colors.length < columns.length) {
    throw new Error("StackedBarChart: Colors array was missing or too short");
  }

  cfg.margin.top += 10; // Avoid y-tick labels cutting off
  cfg.margin.left += 20; // Needed for y-tick labels
  cfg.margin.bottom += 20; // Needed for x-tick labels
  if (cfg.labelLayout === "slanted") {
    cfg.margin.bottom += 100;
  } else if (cfg.labelLayout === "offset") {
    cfg.margin.bottom += 20;
  }

  if (cfg.axisLabels?.y) {
    cfg.margin.left += 30;
  }

  // set the dimensions and margins of the graph
  const innerWidth = cfg.width - cfg.margin.left - cfg.margin.right;
  const innerHeight = cfg.height - cfg.margin.top - cfg.margin.bottom;

  // Remove any existing svg
  d3.select(containerSelector).select("svg").remove();

  // append the svg object to the body of the page
  const svg = d3
    .select(containerSelector)
    .append("svg")
    .attr("width", cfg.width)
    .attr("height", cfg.height)
    .append("g")
    .attr("transform", `translate(${cfg.margin.left},${cfg.margin.top})`);

  // Parse the Data

  // List of groups = species here = value of the first column called group -> I show them on the X axis
  const categories = data.map((d) => d.category) as string[];

  // Add X axis
  const xAxis = d3
    .scaleBand()
    .domain(categories)
    .range([0, innerWidth])
    .padding(cfg.innerPadding);

  const xAxisG = svg
    .append("g")
    .attr("transform", `translate(0, ${innerHeight})`)
    .call(d3.axisBottom(xAxis).tickSizeOuter(0));

  // Apply new text labels
  xAxisG
    .selectAll(".tick text")
    .text((d) => cfg.labelTextMapper((d || "") as string));

  if (cfg.labelLayout === "slanted") {
    xAxisG
      .selectAll(".tick text")
      .attr("transform", "translate(10,0) rotate(-45)")
      .style("text-anchor", "end");
  } else if (cfg.labelLayout === "offset") {
    xAxisG
      .selectAll(".tick:nth-child(odd) text")
      .attr("transform", "translate(0, 16)");
  }

  // Add Y axis
  const yAxis = d3
    .scaleLinear()
    .domain([cfg.minValue, cfg.maxValue])
    .range([innerHeight, 0]);

  // TODO: Only implemented y-label
  if (cfg.axisLabels && cfg.axisLabels.y) {
    const labelXPos = -30;
    const labelYPos = (cfg.height - cfg.margin.bottom - cfg.margin.top) / -2;

    // Axis labels
    svg
      .append("text")
      .attr("x", labelYPos)
      .attr("y", labelXPos)
      .style("transform", "rotate(-90deg)")
      .style("text-anchor", "middle")
      .style("font-size", "0.75em")
      .text(cfg.axisLabels.y);
  }

  svg.append("g").call(d3.axisLeft(yAxis));

  const color = d3.scaleOrdinal(cfg.colors).domain(columns);

  // Stack the data.
  const stackedData = d3.stack().keys(reversed(columns))(
    data as unknown as { [key: string]: number }[]
  );

  // Show the bars
  svg
    .append("g")
    .selectAll("g")
    // Enter in the stack data = loop key per key = group per group
    .data(stackedData)
    .join("g")
    .attr("fill", (d) => color(d.key))
    .selectAll("rect")
    // enter a second time = loop subgroup per subgroup to add all rectangles
    .data((d) => d)
    .join("rect")
    //@ts-ignore-next-line
    .attr("x", (d) => xAxis(d.data.category))
    .attr("y", (d) => yAxis(d[1]))
    .attr("height", (d) => yAxis(d[0]) - yAxis(d[1]))
    .attr("width", xAxis.bandwidth());
}
