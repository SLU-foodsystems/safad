import * as d3 from "d3";
import cmc from "./cmc-colors";

interface Config {
  margin: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  maxValue: number;
  minValue: number;
  innerPadding: number;
  slantLabels: boolean;
}

type DataPoint = {
  [k: string]: number | string;
};

function drawLegend(
  root: d3.Selection<any, unknown, HTMLElement, any>,
  labels: string[],
  color: d3.ScaleOrdinal<string, string, never>,
  rect: { x: number; y: number }
): { width: number; height: number } {
  const legendContainer = root
    .append("g")
    .attr("class", "legend")
    .style("transform", `translate(${rect.x}px, ${rect.y}px)`);

  const cfg = {
    padding: 10,
    labelHeight: 25,
    circleRadius: 8,
  };

  const height = cfg.padding * 2 + (labels.length - 1) * cfg.labelHeight;
  const width = cfg.padding * 2 + Math.max(...labels.map((x) => x.length)) * 10;

  legendContainer
    .append("rect")
    .style("fill", "white")
    .attr("width", `${width}px`)
    .attr("height", `${height}px`);

  // create a list of keys
  // Add one dot in the legend for each name.
  legendContainer
    .selectAll("dots")
    .data(labels)
    .enter()
    .append("circle")
    .attr("cx", cfg.padding + cfg.circleRadius)
    .attr("cy", (_d, i) => cfg.padding + i * cfg.labelHeight)
    .attr("r", cfg.circleRadius)
    .style("fill", (d) => color(d));

  // Add labels
  legendContainer
    .selectAll("labels")
    .data(labels)
    .enter()
    .append("text")
    .attr("x", cfg.padding + cfg.circleRadius * 2 + 10)
    .attr(
      "y",
      (_d, i) => cfg.padding + cfg.circleRadius / 2 + i * cfg.labelHeight
    )
    .style("fill", "#111")
    .text((d) => d)
    .attr("text-anchor", "left")
    .style("alignment-baseline", "middle");

  return { width, height };
}

export default function StackedBarChart(
  containerSelector: string,
  data: DataPoint[],
  columns: string[],
  options: Partial<Config>
) {
  const cfg = Object.assign(
    {
      margin: {
        top: 20,
        left: 40,
        right: 130,
        bottom: 20,
      },
      width: 700,
      height: 400,
      maxValue: 1,
      minValue: 0,
      innerPadding: 0.2,
      slantLabels: false,
    },
    options
  );

  if (cfg.slantLabels) {
    // TODO: arbitrary offset
    cfg.margin.bottom += 100;
  }

  // set the dimensions and margins of the graph
  const innerWidth = cfg.width - cfg.margin.left - cfg.margin.right;
  const innerHeight = cfg.height - cfg.margin.top - cfg.margin.bottom;

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

  if (cfg.slantLabels) {
    xAxisG
      .selectAll("text")
      .attr("transform", "translate(10,0) rotate(-45)")
      .style("text-anchor", "end");
  }

  // Add Y axis
  const yAxis = d3
    .scaleLinear()
    .domain([cfg.minValue, cfg.maxValue])
    .range([innerHeight, 0]);
  svg.append("g").call(d3.axisLeft(yAxis));

  // color palette = one color per subgroup
  const color = d3
    .scaleOrdinal(cmc.sample("Davos", columns.length))
    .domain(columns);

  // Stack the data.
  // TODO: Typecast is ugly, but I can't figure out to get it working anyway
  // else right now.
  const stackedData = d3.stack().keys(columns)(data as unknown as { [key: string]: number; }[]);

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
    .attr("x", (d) => xAxis(d.data.category as unknown as string))
    .attr("y", (d) => yAxis(d[1]))
    .attr("height", (d) => yAxis(d[0]) - yAxis(d[1]))
    .attr("width", xAxis.bandwidth());

  drawLegend(svg, columns, color, {
    x: innerWidth,
    y: 0,
  });
}
