import * as d3 from "d3";

interface Config {
  w: number; // Width of the circle
  h: number; // Height of the circle
  margin: { top: number; right: number; bottom: number; left: number }; // The margins of the SVG
  levels: number; // How many levels or inner circles should there be drawn
  maxValue: number; // What is the value that the biggest circle will represent
  labelFactor: number; // How much farther than the radius of the outer circle should the labels be placed
  wrapWidth: number; // The number of pixels after which a label needs to be given a new line
  opacityArea: number; // The opacity of the area of the blob
  dotRadius: number; // The size of the colored circles of each blog
  opacityCircles: number; // The opacity of the circles of each blob
  strokeWidth: number; // The width of the stroke around each blob
  roundStrokes: number; // If true the area and stroke will follow a round path (cardinal-closed)
  color: d3.ScaleOrdinal<string, string, never>; // Color function
}

type RadarDataPoint = { axis: string; value: number };
type RadarData = RadarDataPoint[][];

export default function RadarChart(
  id: string,
  data: RadarData,
  options: Partial<Config>
) {
  const cfg: Config = Object.assign(
    {
      w: 600, // Width of the circle
      h: 600, // Height of the circle
      margin: { top: 40, right: 40, bottom: 40, left: 40 }, // The margins of the SVG
      levels: 6, // How many levels or inner circles should there be drawn
      maxValue: 0, // What is the value that the biggest circle will represent
      labelFactor: 1.25, // How much farther than the radius of the outer circle should the labels be placed
      wrapWidth: 60, // The number of pixels after which a label needs to be given a new line
      opacityArea: 0.35, // The opacity of the area of the blob
      dotRadius: 4, // The size of the colored circles of each blog
      opacityCircles: 0.1, // The opacity of the circles of each blob
      strokeWidth: 2, // The width of the stroke around each blob
      roundStrokes: true, // If true the area and stroke will follow a round path (cardinal-closed)
      color: d3.scaleOrdinal(d3.schemeCategory10), // Color function
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

  const allAxis = data[0].map((i) => i.axis); // Names of each axis
  const total = allAxis.length; // The number of different axes
  const radius = Math.min(cfg.w / 2, cfg.h / 2); // Radius of the outermost circle
  const angleSlice = (Math.PI * 2) / total; // The width in radians of each "slice"
  const anglePad = 0.0125 * Math.PI * 2;

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
    .attr("height", cfg.h + cfg.margin.top + cfg.margin.bottom)
    .attr("class", "radar" + id);

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

  [
    [15, "#3cc310"],
    [17, "#3cc310"],
    [25, "#ffff5a"],
    [40, "#f22"],
  ].forEach(([offset, color]) => {
    radialGradient
      .append("stop")
      .attr("offset", `${offset}%`)
      .attr("stop-color", color);
  });

  /////////////////////////////////////////////////////////
  /////////////// Draw the Circular grid //////////////////
  /////////////////////////////////////////////////////////

  // Wrapper for the grid & axes
  const axisGrid = root.append("g").attr("class", "axisWrapper");

  // Draw the background circles
  axisGrid
    .selectAll(".levels")
    .data(d3.range(1, cfg.levels + 1).reverse())
    .enter()
    .append("circle")
    .attr("class", "gridCircle")
    .attr("r", (d) => (radius / cfg.levels) * d)
    .style("fill", "#cdcdcd")
    .style("stroke", "#Cdcdcd")
    .style("fill-opacity", cfg.opacityCircles);

  /////////////////////////////////////////////////////////
  //////////////////// Draw the axes //////////////////////
  /////////////////////////////////////////////////////////

  // Create the straight lines radiating outward from the center
  const axis = axisGrid
    .selectAll(".axis")
    .data(allAxis)
    .enter()
    .append("g")
    .attr("class", "axis");

  // Append the lines
  axis
    .append("line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr(
      "x2",
      (_d, i) => rScale(cfg.maxValue * 1.1) * Math.cos(angleSlice * i)
    )
    .attr(
      "y2",
      (_d, i) => rScale(cfg.maxValue * 1.1) * Math.sin(angleSlice * i)
    )
    .attr("class", "line")
    .style("stroke", "white")
    .style("stroke-width", "2px");

  // Append the labels at each axis
  const labels = axis
    .append("text")
    .attr("class", "legend");

  const labelArc = d3
    .arc()
    .innerRadius(rScale(cfg.maxValue * 1.05))
    .outerRadius(rScale(cfg.maxValue * 1.05))
    .startAngle((_d, i) => angleSlice * (i + 0.5) + anglePad)
    .endAngle((_d, i) => angleSlice * (i + 1.5) - anglePad);

  labels
    .append("path")
    .attr("stroke", "#f0f")
    .attr("stroke-width", "20px")
    .attr("d", labelArc)
    .attr("id", (_d, i) => `label-path-${i}`);

  labels
    .append("textPath")
    .style("dominant-baseline", "central")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .attr("text-anchor", "middle")
    .attr("startOffset", "25.5%")
    .attr("xlink:href", (_d, i)  => "#label-path-" + i) // map text to helper path
    .text(d => d);

  /////////////////////////////////////////////////////////
  ///////////// Draw the radar chart blobs ////////////////
  /////////////////////////////////////////////////////////

  // Create a wrapper for the blobs
  const blobWrapper = root
    .selectAll(".radarWrapper")
    .data(data)
    .enter()
    .append("g")
    .attr("class", "radarWrapper");

  const arcGenerator = d3
    .arc()
    .innerRadius(0)
    .outerRadius((d) => rScale(d.value))
    .startAngle((_d, i) => angleSlice * (i + 0.5) + anglePad)
    .endAngle((_d, i) => angleSlice * (i + 1.5) - anglePad);

  // Append the circles
  blobWrapper
    .selectAll(".radarCircle")
    .data((d) => d)
    .enter()
    .append("path")
    .attr("class", "radarCircle")
    .attr("d", arcGenerator)
    .style("stroke", "black")
    .style("stroke-width", "2px")
    .style("fill", "url(#radial-gradient)")
    .style("fill-opacity", 0.8);
}
