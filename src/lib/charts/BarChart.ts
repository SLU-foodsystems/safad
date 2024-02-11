//@ts-disable
import * as d3 from "d3";
import cmc from "./cmc-colors";

const MAX_Y_AXIS_DIGITS = 5;

interface Config {
  margin: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  maxValue: number;
  minValue: number;
  innerPadding: number;
  labelLayout: "normal" | "slanted" | "offset";
  color: string;

  axisLabels?: {
    // x: string; // TODO: Not implemented
    y: string;
  };
}

type DataPoint = {
  category: string;
  value: number;
};

const getYTickFormat = (
  val: number,
  domain: [number, number],
  threshold = 5
) =>
  Math.ceil(Math.abs(Math.log10(val))) > threshold
    ? d3.format(".2e")
    : d3.scaleLinear().domain(domain).tickFormat();

export default function BarChart(
  container: HTMLElement,
  data: DataPoint[],
  options: Partial<Config>
) {
  const cfg: Config = {
    margin: {
      top: 20,
      left: 0,
      right: 20,
      bottom: 20,
    },
    width: 700,
    height: 400,
    maxValue: 1,
    minValue: 0,
    innerPadding: 0.2,
    labelLayout: "normal",
    color: "#06f",
    ...options,
  };

  if (cfg.labelLayout === "slanted") {
    // TODO: this is an arbitrary offset
    cfg.margin.bottom += 100;
  } else if (cfg.labelLayout === "offset") {
    cfg.margin.bottom += 20;
  }

  const APPROX_CHAR_WIDTH = 6;

  // +1 for decimal-point(s)
  const yTickFormat = getYTickFormat(
    cfg.maxValue,
    [cfg.minValue, cfg.maxValue],
    MAX_Y_AXIS_DIGITS
  );
  const yTickCharLen = yTickFormat(cfg.maxValue).length;

  if (cfg.axisLabels?.y) {
    cfg.margin.left += 25 + yTickCharLen * APPROX_CHAR_WIDTH;
  }

  // set the dimensions and margins of the graph
  const innerWidth = cfg.width - cfg.margin.left - cfg.margin.right;
  const innerHeight = cfg.height - cfg.margin.top - cfg.margin.bottom;

  // Create the yAxisScaler already here,since we want the nDigits
  const yAxisScaler = d3
    .scaleLinear()
    .domain([cfg.minValue, cfg.maxValue])
    .range([innerHeight, 0]);

  // Remove any existing svg
  d3.select(container).select("svg").remove();

  // append the svg object to the body of the page
  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", cfg.width)
    .attr("height", cfg.height)
    .append("g")
    .attr("transform", `translate(${cfg.margin.left},${cfg.margin.top})`);

  // Parse the Data

  // List of groups = species here = value of the first column called group ->
  // I show them on the X axis
  const categories = data.map((d) => d.category);

  // Add X axis
  const xAxisScaler = d3
    .scaleBand()
    .domain(categories)
    .range([0, innerWidth])
    .padding(cfg.innerPadding);

  const xAxisG = svg
    .append("g")
    .attr("transform", `translate(0, ${innerHeight})`)
    .call(d3.axisBottom(xAxisScaler).tickSizeOuter(0));

  if (cfg.labelLayout === "slanted") {
    xAxisG
      .selectAll("")
      .attr("transform", "translate(10,0) rotate(-45)")
      .style("text-anchor", "end");
  } else if (cfg.labelLayout === "offset") {
    xAxisG
      .selectAll(".tick:nth-child(odd) text")
      .attr("transform", "translate(0, 16)");
  }

  svg.append("g").call(d3.axisLeft(yAxisScaler).tickFormat(yTickFormat));

  // TODO: Only implemented y-label
  if (cfg.axisLabels && cfg.axisLabels.y) {
    const labelXPos = -15 - yTickCharLen * APPROX_CHAR_WIDTH;
    const labelYPos = cfg.height / -2 + cfg.margin.top;

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

  console.log(data)

  // Show the bars
  svg
    .append("g")
    .selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("fill", () => cfg.color)
    // @ts-ignore-next-line
    .attr("x", (d) => xAxisScaler(d.category))
    .attr("y", (d) => yAxisScaler(d.value))
    .attr("height", (d) => innerHeight- yAxisScaler(d.value))
    .attr("width", xAxisScaler.bandwidth());
}
