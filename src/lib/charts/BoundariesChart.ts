import * as d3 from "d3";

interface Config {
  w: number; // Width of the circle
  h: number; // Height of the circle
  margin: { top: number; right: number; bottom: number; left: number }; // The margins of the SVG
  levels: number; // How many levels or inner circles should there be drawn
  maxValue: number; // What is the value that the biggest circle will represent
  labelOffsetFactor: number; // How much farther than the radius of the outer circle should the labels be placed
  opacityCircles: number; // The opacity of the circles of each blob
  slicePadding: number; // The %-padding of the arc in each slice
}

type RadarDataPoint = { axis: string; value: number };
type RadarData = RadarDataPoint[][];

export default function BoundariesChart(
  id: string,
  data: RadarData,
  options: Partial<Config>
) {
  const cfg: Config = Object.assign(
    {
      w: 600,
      h: 600,
      margin: { top: 40, right: 40, bottom: 40, left: 40 },
      levels: 8,
      maxValue: 1,
      labelOffsetFactor: 1.05,
      opacityCircles: 0.1,
      slicePadding: 0.015,
    },
    options
  );

  const actualMax = d3.max(data, (d) => d3.max(d.map((x) => x.value)))!;

  if (cfg.maxValue < actualMax) {
    console.warn(
      `Max value in data (${actualMax}) exceeded the provided max value (${cfg.maxValue}). Updating config.`
    );
    cfg.maxValue = actualMax;
  }

  const axes = data[0].map((i) => i.axis); // Names of each axis
  const total = axes.length; // The number of different axes

  const radius = Math.min(cfg.w / 2, cfg.h / 2); // Radius of the outermost circle
  const angleSlice = (Math.PI * 2) / total; // The width in radians of each "slice"
  const anglePadding = cfg.slicePadding * Math.PI * 2;

  // Scale for the radius
  const rScale = d3.scaleLinear().range([0, radius]).domain([0, cfg.maxValue]);

  /////////////////////////////////////////////////////////
  //////////// Create the container SVG and g /////////////
  /////////////////////////////////////////////////////////

  // Remove whatever chart with the same id/class was present before
  d3.select(id).select("svg").remove();

  // Initiate the radar chart SVG
  const svg = d3
    .select(id)
    .append("svg")
    .attr("width", cfg.w + cfg.margin.left + cfg.margin.right)
    .attr("height", cfg.h + cfg.margin.top + cfg.margin.bottom);

  const defs = svg.append("defs");

  // Append a g element
  const root = svg
    .append("g")
    .attr(
      "transform",
      "translate(" +
        (cfg.w / 2 + cfg.margin.left) +
        "," +
        (cfg.h / 2 + cfg.margin.top) +
        ")"
    );

  /////////////////////////////////////////////////////////
  ////////////////////// Gradients ////////////////////////
  /////////////////////////////////////////////////////////

  const radialGradient = defs
    .append("radialGradient")
    .attr("id", "radial-gradient")
    .attr("cx", "0")
    .attr("cy", "0")
    .attr("gradientUnits", "userSpaceOnUse")
    .attr("r", Math.max(cfg.w, cfg.h) / 2);

  // scale the gradient to 1
  (
    [
      [0, "#207320"],
      [0.5, "#3cc310"],
      [0.85, "#ffff5a"],
      [1.1, "#f22"],
      [2, "#e2002a"],
    ] as [number, string][]
  ).forEach(([offset, color]) => {
    radialGradient
      .append("stop")
      .attr("offset", `${(100 * offset) / cfg.maxValue}%`)
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
  switch (total % 4) {
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

  // Append the labels at each axis
  const labels = axis.append("text");

  const labelArc = d3
    .arc()
    .innerRadius(rScale(cfg.maxValue * cfg.labelOffsetFactor))
    .outerRadius(rScale(cfg.maxValue * cfg.labelOffsetFactor))
    .startAngle((_d, i) => angleSlice * (i + 0.5) + anglePadding)
    .endAngle((_d, i) => angleSlice * (i + 1.5) - anglePadding);

  labels
    .append("path")
    .attr("d", labelArc)
    .attr("id", (_d, i) => `label-path-${i}`);

  labels
    .append("textPath")
    .style("dominant-baseline", "central")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .attr("text-anchor", "middle")
    .attr("startOffset", "25%")
    .attr("xlink:href", (_d, i) => "#label-path-" + i) // map text to helper path
    .text((d) => d);

  /////////////////////////////////////////////////////////
  ///////////// Draw the radar chart blobs ////////////////
  /////////////////////////////////////////////////////////

  // Create a wrapper for the blobs
  const blobWrapper = root
    .selectAll(".radarWrapper")
    .data(data)
    .enter()
    .append("g");

  const arcGenerator = d3
    .arc()
    .innerRadius(0)
    .outerRadius((d) => rScale(d.value))
    .startAngle((_d, i) => angleSlice * (i + 0.5) + anglePadding)
    .endAngle((_d, i) => angleSlice * (i + 1.5) - anglePadding);

  // Append the circles
  blobWrapper
    .selectAll(".radarCircle")
    .data((d) => d)
    .enter()
    .append("path")
    .attr("d", arcGenerator)
    .style("stroke", "rgba(0, 0, 0, 0.5)")
    .style("stroke-width", "2px")
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
}
