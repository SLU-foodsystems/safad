import * as d3 from "d3";
import { contrastingTextColor, getYTickFormat } from "./charts-utils";

interface Config {
  margin: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
  maxValue: number;
  minValue: number;
  innerPadding: number;
  color: (category: string) => string;
  labelTextMapper: (id: string) => string;
  showGridLines?: boolean;

  tooltipUnit: string;
  axisLabels?: {
    x: string;
  };
}

type DataPoint = {
  category: string;
  value: number;
};

export default function HorizontalBarChart(
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
    tooltipUnit: "",
    color: () => "blue",
    labelTextMapper: (id: string) => id,
    showGridLines: true,

    ...options,
  };

  const APPROX_CHAR_WIDTH = 5;

  if (cfg.minValue === 0 && cfg.maxValue === 0) {
    cfg.maxValue = 1;
  }

  const xTickFormat = getYTickFormat(
    cfg.maxValue,
    [cfg.minValue, cfg.maxValue],
    5
  );
  const xTickCharLen = xTickFormat(cfg.maxValue).length;

  cfg.margin.bottom += 10 + xTickCharLen * APPROX_CHAR_WIDTH;
  if (cfg.axisLabels?.x) cfg.margin.bottom += 15;

  const maxLabelLength = Math.max(
    ...data.map((d) => cfg.labelTextMapper(d.category).length)
  );
  cfg.margin.left += maxLabelLength * APPROX_CHAR_WIDTH + 10;

  const innerWidth = cfg.width - cfg.margin.left - cfg.margin.right;
  const innerHeight = cfg.height - cfg.margin.top - cfg.margin.bottom;

  const xAxisScaler = d3
    .scaleLinear()
    .domain([cfg.minValue, cfg.maxValue])
    .range([0, innerWidth]);

  d3.select(container).select("svg").remove();

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", cfg.width)
    .attr("height", cfg.height)
    .append("g")
    .attr("transform", `translate(${cfg.margin.left},${cfg.margin.top})`);

  const categories = data.map((d) => d.category);

  const yAxisScaler = d3
    .scaleBand()
    .domain(categories)
    .range([0, innerHeight])
    .padding(cfg.innerPadding);

  if (cfg.showGridLines) {
    svg
      .append("g")
      .attr("class", "grid")
      .selectAll("line")
      .data(xAxisScaler.ticks())
      .enter()
      .append("line")
      .attr("x1", (d) => xAxisScaler(d))
      .attr("x2", (d) => xAxisScaler(d))
      .attr("y1", 0)
      .attr("y2", innerHeight)
      .attr("stroke", "#e0e0e0")
      .attr("stroke-dasharray", "3,3");
  }

  const yAxisG = svg
    .append("g")
    .call(d3.axisLeft(yAxisScaler).tickSizeOuter(0));

  yAxisG
    .selectAll(".tick text")
    .text((d) => cfg.labelTextMapper((d || "") as string));

  svg
    .append("g")
    .attr("transform", `translate(0, ${innerHeight})`)
    .call(d3.axisBottom(xAxisScaler).tickFormat(xTickFormat));

  if (cfg.axisLabels?.x) {
    const labelXPos = innerWidth / 2;
    const labelYPos =
      innerHeight +
      10 +
      xTickCharLen * APPROX_CHAR_WIDTH +
      (cfg.axisLabels?.x ? 15 : 0);

    svg
      .append("text")
      .attr("x", labelXPos)
      .attr("y", labelYPos)
      .style("text-anchor", "middle")
      .style("font-size", "0.75em")
      .text(cfg.axisLabels.x);
  }

  const tooltip = d3
    .select(container)
    .append("div")
    .attr("class", "d3-tooltip")
    .style("text-align", "left");

  const moveTooltip = (event: MouseEvent) => {
    const [x, y] = d3.pointer(event);
    const xOffset = cfg.margin.left;
    const yOffset = cfg.margin.top - 10;
    tooltip.style("transform", `translate(${x + xOffset}px, ${y + yOffset}px)`);
  };

  svg
    .append("g")
    .selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("fill", (d) => cfg.color(d.category))
    .attr("y", (d) => yAxisScaler(d.category) as number)
    .attr("x", 0)
    .attr("width", (d) => xAxisScaler(d.value))
    .attr("height", yAxisScaler.bandwidth())
    .attr("stroke", (d) => {
      const c = cfg.color(d.category);
      return c ? d3.rgb(c).darker(0.66).formatHex() : "transparent";
    })
    .attr("stroke-width", "1")
    .on("mouseover", function (event, d) {
      const subgroupName = cfg.labelTextMapper(d.category);
      const subgroupValue = d.value;
      const unit = cfg.tooltipUnit || cfg.axisLabels?.x || "";
      const tooltipHtml =
        `<strong>${subgroupName}</strong><br />` +
        `${xTickFormat(subgroupValue)} ${unit}`;

      const color = cfg.color(d.category);

      tooltip.html(tooltipHtml).style("opacity", 1);
      tooltip
        .style("background-color", color)
        .style("color", contrastingTextColor(color));

      moveTooltip(event);
    })
    .on("mousemove", moveTooltip)
    .on("mouseleave", () => {
      tooltip.style("opacity", 0);
    });
}
