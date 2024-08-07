import * as d3 from "d3";

const SLICE_OFFSET = 0.5;

interface Config {
  width: number; // Width of the circle
  height: number; // Height of the circle
  padding: { top: number; right: number; bottom: number; left: number }; // The margins of the SVG
  levels: number; // How many levels or inner circles should there be drawn
  maxValue: number; // What is the value that the biggest circle will represent
  opacityCircles: number; // The opacity of the circles of each blob
  slicePadding: number; // The %-padding of the arc in each slice
  labelPadding: number;
  fontSize: string;
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
    levels: 8,
    maxValue: 1,
    opacityCircles: 0.1,
    slicePadding: 0.015,
    labelPadding: 50,
    fontSize: "16px",
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
      ? angleSlice * (i + SLICE_OFFSET) + anglePadding
      : angleSlice * (i + 1 + SLICE_OFFSET) - anglePadding;

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
      [1.05, "#f9a933"],
      [cfg.maxValue * 0.8, "rgba(255, 112, 68, 1)"],
      [cfg.maxValue * 1.0, "rgba(255, 112, 68, 0.8)"],
      [cfg.maxValue + 0.01, "rgba(255, 112, 68, 0.55)"],
      [cfg.maxValue * 1.5, "rgba(226, 0, 68, 0.25)"],
      [cfg.maxValue * 3, "rgba(226, 0, 68, 0.15)"],
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
  /////////////// Draw the Circular grid //////////////////
  /////////////////////////////////////////////////////////

  // Wrapper for the grid & axes
  const axisGrid = root.append("g");

  // Draw the background circles
  axisGrid
    .selectAll(".levels")
    .data(d3.range(1, cfg.levels + 1).reverse())
    .enter()
    .append("circle")
    .attr("r", (d) => (radius / cfg.levels) * d)
    .style("fill", "#cdcdcd")
    .style("stroke", "#cdcdcd")
    .style("fill-opacity", cfg.opacityCircles);

  /////////////////////////////////////////////////////////
  //////////////////// Draw the axes //////////////////////
  /////////////////////////////////////////////////////////

  // Create the straight lines radiating outward from the center
  const axis = axisGrid.selectAll(".axis").data(axes).enter().append("g");

  // I do not understand this math, this is really trial-and-error.
  // Trig was too long ago, sorry.
  let axesOffset = 0;
  switch (N % 4) {
    case 0:
      axesOffset = angleSlice / 2;
      break;
    case 2:
      axesOffset = 0;
      break;
    case 1:
    case 3:
      axesOffset = Math.PI / 2;
      break;
  }

  // Append the lines
  axis
    .append("line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr(
      "x2",
      (_d, i) =>
        rScale(cfg.maxValue * 1.1) * Math.cos(angleSlice * i + axesOffset)
    )
    .attr(
      "y2",
      (_d, i) =>
        rScale(cfg.maxValue * 1.1) * Math.sin(angleSlice * i + axesOffset)
    )
    .style("stroke", "white")
    .style("stroke-width", "2px");

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
    .style("stroke", "rgba(0, 0, 0, 0.15)")
    .style("stroke-width", "1px")
    .style("fill", "url(#radial-gradient)")
    .style("fill-opacity", 0.8);

  /////////////////////////////////////////////////////////
  //////////////// Draw a circle overlay //////////////////
  /////////////////////////////////////////////////////////

  root
    .append("circle")
    .attr("cx", 0)
    .attr("cy", 0)
    .attr("r", rScale(1))
    .attr("fill", "none")
    .attr("stroke", "black")
    .attr("stroke-width", "2px");

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
    const east = 1.5 * k - SLICE_OFFSET;
    const west = 2.5 * k - SLICE_OFFSET;
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
