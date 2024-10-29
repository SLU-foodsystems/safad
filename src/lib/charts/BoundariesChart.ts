import * as d3 from "d3";

import GlobeSvg from "@/assets/globe.svg";

interface Config {
  width: number; // Width of the circle
  height: number; // Height of the circle
  padding: { top: number; right: number; bottom: number; left: number }; // The margins of the SVG
  maxValue: number; // What is the value that the biggest circle will represent
  slicePadding: number; // The %-padding of the arc in each slice
  labelPadding: number;
  fontSize: string;
  rotationOffset: number;
}

type RadarDataPoint = { axis: string; value: number };
type RadarData = RadarDataPoint[];

export default function BoundariesChart(
  el: HTMLElement,
  data: RadarData,
  options: Partial<Config>
) {
  const cfg: Config = {
    width: 600,
    height: 600,
    padding: { top: 16, right: 16, bottom: 16, left: 16 },
    maxValue: 1,
    slicePadding: 0.010,
    labelPadding: 50,
    fontSize: "16px",
    rotationOffset: 0.5,
    ...options,
  };

  const axes = data.map((i) => i.axis); // Names of each axis
  const N = axes.length; // The number of different axes

  const innerWidth = cfg.width - cfg.padding.left - cfg.padding.right;
  const innerHeight = cfg.height - cfg.padding.top - cfg.padding.bottom;

  const labelRadius = Math.min(cfg.width, cfg.height) / 2 - cfg.labelPadding;

  const radius = Math.min(innerWidth, innerHeight) / 2; // Radius of the outermost circle
  const angleSlice = (Math.PI * 2) / N; // The width in radians of each "slice"
  const anglePadding = cfg.slicePadding * Math.PI * 2;

  // Scale for the radius
  const rScale = d3.scaleLinear().range([0, radius]).domain([0, cfg.maxValue]);

  const getSliceAngle = (i: number, pos: "start" | "end") =>
    pos === "start"
      ? angleSlice * (i + cfg.rotationOffset) + anglePadding
      : angleSlice * (i + 1 + cfg.rotationOffset) - anglePadding;

  /////////////////////////////////////////////////////////
  //////////// Create the container SVG and g /////////////
  /////////////////////////////////////////////////////////

  // Remove whatever chart with the same id/class was present before
  d3.select(el).select("svg").remove();

  // Initiate the radar chart SVG
  const svg = d3
    .select(el)
    .append("svg")
    .attr("width", cfg.width)
    .attr("height", cfg.height);

  const defs = svg.append("defs");

  // Append a g element
  const root = svg
    .append("g")
    .attr("transform", `translate(${cfg.width / 2}, ${cfg.height / 2})`);

  /////////////////////////////////////////////////////////
  //////////////// Draw a circle overlay //////////////////
  /////////////////////////////////////////////////////////

  root
    .append("circle")
    .attr("cx", 0)
    .attr("cy", 0)
    .attr("r", rScale(1))
    .attr("fill", "#e7e7e7")
    .attr("stroke", "rgba(0, 0, 0, 0.20)")
    .attr("stroke-width", "2px");

  /////////////////////////////////////////////////////////
  ////////////////////// Gradients ////////////////////////
  /////////////////////////////////////////////////////////

  const GRADIENT_SCALEUP_FACTOR = 2;
  const radialGradient = defs
    .append("radialGradient")
    .attr("id", "radial-gradient")
    .attr("cx", "0")
    .attr("cy", "0")
    .attr("gradientUnits", "userSpaceOnUse")
    .attr(
      "r",
      // Should cover the canvas, thus max rather than min
      (GRADIENT_SCALEUP_FACTOR * Math.max(innerWidth, innerHeight)) / 2
    );

  // scale the gradient, with
  (
    [
      [0, "#2ba05f"],
      [0.95, "#2ba05f"],
      [1.0, "#2ba05f"],
      [1.01, "white"],
      [1.07, "#f99933"],
      [1.5, "rgba(255, 112, 68, 1)"],
      [3, "#e23826"],
    ] as [number, string][]
  ).forEach(([offset, color]) => {
    radialGradient
      .append("stop")
      .attr(
        "offset",
        `${(100 * offset) / (cfg.maxValue * GRADIENT_SCALEUP_FACTOR)}%`
      )
      .attr("stop-color", color);
  });

  /////////////////////////////////////////////////////////
  ///////////// Draw the radar chart blobs ////////////////
  /////////////////////////////////////////////////////////

  // Create a wrapper for the blobs
  const blobWrapper = root
    .selectAll(".radarWrapper")
    .data([data])
    .enter()
    .append("g");

  const arcGenerator = d3
    .arc<any, RadarDataPoint>()
    .innerRadius(0)
    .outerRadius((d) => rScale(d.value))
    .startAngle((_d, i) => getSliceAngle(i, "start"))
    .endAngle((_d, i) => getSliceAngle(i, "end"));

  // Append the circles
  blobWrapper
    .selectAll(".radarCircle")
    .data((d) => d)
    .enter()
    .append("path")
    .attr("d", arcGenerator)
    .style("fill", "url(#radial-gradient)")
    .style("fill-opacity", 0.8);

  /////////////////////////////////////////////////////////
  ////////////// Add the globe-background /////////////////
  /////////////////////////////////////////////////////////

  const worldImgSize = rScale(1) * 2;
  root
    .append("image")
    .attr("xlink:href", GlobeSvg) // Path to your image
    .attr("x", 0) // X position
    .attr("y", 0) // Y position
    .attr("width", worldImgSize)
    .attr("height", worldImgSize)
    .attr("decoding", "async")
    .attr("class", "globe-background")
    .style(
      "transform",
      `translate(-${worldImgSize / 2}px, -${worldImgSize / 2}px)`
    )
    .style("opacity", 0.1);

  /////////////////////////////////////////////////////////
  ///////// Draw labels on top of radar-gradients /////////
  /////////////////////////////////////////////////////////

  const labelAxis = root
    .append("g")
    .selectAll(".label-axis")
    .data(axes)
    .enter()
    .append("g");

  // Append the labels at each axis
  const labels = labelAxis.append("text");

  // Determine if the label (text) is upside-down, and should be flipped
  const hasFlippedLabel = (i: number) => {
    const k = N / 4;
    const east = 1.5 * k - cfg.rotationOffset;
    const west = 2.5 * k - cfg.rotationOffset;
    return east < i + 1 && i < west;
  };

  const labelArc = d3
    .arc<string>()
    .innerRadius(() => labelRadius)
    .outerRadius(() => labelRadius)
    .startAngle((_d, i) =>
      getSliceAngle(i, !hasFlippedLabel(i) ? "start" : "end")
    )
    .endAngle((_d, i) =>
      getSliceAngle(i, !hasFlippedLabel(i) ? "end" : "start")
    );

  labels
    .append("path")
    .attr("d", labelArc)
    .attr("id", (_d, i) => `label-path-${i}`);

  labels
    .append("textPath")
    .style("dominant-baseline", "central")
    .style("font-size", `${cfg.fontSize}`)
    .style("font-weight", "bold")
    .attr("text-anchor", "middle")
    .attr("startOffset", "25%")
    .attr("xlink:href", (_d, i) => "#label-path-" + i) // map text to helper path
    .text((d) => d);
}
