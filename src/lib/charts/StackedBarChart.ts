//@ts-disable
import * as d3 from "d3";
import cmc from "./cmc-colors";

interface Config {
  margin: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  maxValue: number;
  minValue: number;
  innerPadding: number;
  labelLayout: "normal" | "slanted" | "offset";

  axisLabels?: {
    // x: string; // TODO: Not implemented
    y: string;
  };
}

type DataPoint = {
  [k: string]: number | string;
};

interface LegendConfig {
  padding: number;
  labelHeight: number;
  circleRadius: number;
  width: number;
}

function drawLegend(
  root: d3.Selection<any, unknown, HTMLElement, any>,
  labels: string[],
  color: d3.ScaleOrdinal<string, string, never>,
  rect: { x: number; y: number },
  cfgOverrides: Partial<LegendConfig> = {}
): { width: number; height: number } {
  const legendContainer = root
    .append("g")
    .attr("class", "legend")
    .style("transform", `translate(${rect.x}px, ${rect.y}px)`);

  const legendCfg: LegendConfig = {
    padding: 10,
    labelHeight: 25,
    circleRadius: 8,
    width: 200,
    ...cfgOverrides,
  };

  const height =
    legendCfg.padding * 2 + (labels.length - 1) * legendCfg.labelHeight;
  const width = legendCfg.width;

  legendContainer.attr("width", `${width}px`).attr("height", `${height}px`);

  // create a list of keys
  // Add one dot in the legend for each name.
  legendContainer
    .selectAll("dots")
    .data(labels)
    .enter()
    .append("circle")
    .attr("cx", legendCfg.padding + legendCfg.circleRadius)
    .attr("cy", (_d, i) => legendCfg.padding + (1 + i) * legendCfg.labelHeight)
    .attr("r", legendCfg.circleRadius)
    .style("fill", (d) => color(d));

  // Add labels
  legendContainer
    .selectAll("labels")
    .data(labels)
    .enter()
    .append("text")
    .attr("x", legendCfg.padding + legendCfg.circleRadius * 2 + 10)
    .attr(
      "y",
      (_d, i) =>
        legendCfg.padding +
        legendCfg.circleRadius / 2 +
        (1 + i) * legendCfg.labelHeight
    )
    .style("fill", "#111")
    .text((d) => d)
    .attr("text-anchor", "left")
    .style("alignment-baseline", "middle");

  // add a legend title
  legendContainer
    .selectAll("labels")
    .data(["Legend"])
    .enter()
    .append("text")
    .attr("x", legendCfg.padding)
    .attr("y", () => legendCfg.padding + legendCfg.circleRadius / 2)
    .text((d) => d)
    .attr("text-anchor", "left")
    .style("font-weight", "bold")
    .style("alignment-baseline", "middle");

  return { width, height };
}

export default function StackedBarChart(
  containerSelector: string,
  data: DataPoint[],
  columns: string[],
  options: Partial<Config>
) {
  const cfg: Config = {
    margin: {
      top: 20,
      left: 20,
      right: 40,
      bottom: 20,
    },
    width: 700,
    height: 400,
    maxValue: 1,
    minValue: 0,
    innerPadding: 0.2,
    labelLayout: "normal",
    ...options,
  };

  if (cfg.labelLayout === "slanted") {
    // TODO: this is an arbitrary offset
    cfg.margin.bottom += 100;
  } else if (cfg.labelLayout === "offset") {
    // TODO: this is an arbitrary offset
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

  if (cfg.labelLayout === "slanted") {
    xAxisG
      .selectAll("")
      .attr("transform", "translate(10,0) rotate(-45)")
      .style("text-anchor", "end");
  } else if (cfg.labelLayout === "offset") {
    xAxisG
      .selectAll(".tick:nth-child(odd) text")
      .attr("transform", "translate(0, 16)")
  }

  // Add Y axis
  const yAxis = d3
    .scaleLinear()
    .domain([cfg.minValue, cfg.maxValue])
    .range([innerHeight, 0]);

  // TODO: Only implemented y-label
  if (cfg.axisLabels && cfg.axisLabels.y) {
    const labelXPos = -30;
    const labelYPos = cfg.height / -2 + cfg.margin.top;

    // Axis labels
    svg
      .append("text")
      .attr("x", labelYPos)
      .attr("y", labelXPos)
      .style("transform", "rotate(-90deg)")
      .style("text-anchor", "middle")
      .html("kg CO2e per kg");
  }

  svg.append("g").call(d3.axisLeft(yAxis));

  // color palette = one color per subgroup
  const color = d3
    .scaleOrdinal(cmc.sample("Davos", columns.length))
    .domain(columns);

  // Stack the data.
  // TODO: Typecast is ugly, but I can't figure out to get it working anyway
  // else right now.
  const stackedData = d3.stack().keys(columns)(
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

  // drawLegend(svg, columns, color, {
  //   x: innerWidth,
  //   y: 0,
  // });
}
