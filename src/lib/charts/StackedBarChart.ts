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
        right: 20,
        bottom: 20,
      },
      width: 600,
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

  if (cfg.slantLabels){
    xAxisG.selectAll("text")
    .attr("transform", "translate(10,0)rotate(-45)")
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
    .scaleOrdinal(cmc.subset("Davos", columns.length))
    .domain(columns);

  //stack the data? --> stack per subgroup
  const stackedData = d3.stack().keys(columns)(data);

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
    .attr("x", (d) => xAxis(d.data.category as string))
    .attr("y", (d) => yAxis(d[1]))
    .attr("height", (d) => yAxis(d[0]) - yAxis(d[1]))
    .attr("width", xAxis.bandwidth());
}
