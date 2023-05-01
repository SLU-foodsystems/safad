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
      margin: { top: 20, right: 20, bottom: 20, left: 20 }, // The margins of the SVG
      levels: 3, // How many levels or inner circles should there be drawn
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

  const format = d3.format(".2%"); // Percentage formatting

  const allAxis = data[0].map((i) => i.axis); // Names of each axis
  const total = allAxis.length; // The number of different axes
  const radius = Math.min(cfg.w / 2, cfg.h / 2); // Radius of the outermost circle
  const angleSlice = (Math.PI * 2) / total; // The width in radians of each "slice"

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
    .style("fill", "#CDCDCD")
    .style("stroke", "#CDCDCD")
    .style("fill-opacity", cfg.opacityCircles)
    .style("filter", "url(#glow)");

  // Text indicating at what % each level is
  axisGrid
    .selectAll(".axisLabel")
    .data(d3.range(1, cfg.levels + 1).reverse())
    .enter()
    .append("text")
    .attr("class", "axisLabel")
    .attr("x", 4)
    .attr("y", (d) => (-d * radius) / cfg.levels)
    .attr("dy", "0.4em")
    .style("font-size", "10px")
    .attr("fill", "#737373")
    .text((d) => format((cfg.maxValue * d) / cfg.levels));

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
      (_d, i) =>
        rScale(cfg.maxValue * 1.1) * Math.cos(angleSlice * i - Math.PI / 2)
    )
    .attr(
      "y2",
      (_d, i) =>
        rScale(cfg.maxValue * 1.1) * Math.sin(angleSlice * i - Math.PI / 2)
    )
    .attr("class", "line")
    .style("stroke", "white")
    .style("stroke-width", "2px");

  // Append the labels at each axis
  axis
    .append("text")
    .attr("class", "legend")
    .style("font-size", "11px")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .attr(
      "x",
      (_d, i) =>
        rScale(cfg.maxValue * cfg.labelFactor) *
        Math.cos(angleSlice * i - Math.PI / 2)
    )
    .attr(
      "y",
      (_d, i) =>
        rScale(cfg.maxValue * cfg.labelFactor) *
        Math.sin(angleSlice * i - Math.PI / 2)
    )
    .text((d) => d)
    .call(wrap, cfg.wrapWidth);

  /////////////////////////////////////////////////////////
  ///////////// Draw the radar chart blobs ////////////////
  /////////////////////////////////////////////////////////

  // The radial line function
  // radarLine.curve(d3.curveCardinalClosed);
  // d3.svg.line radial().interpolate("linear-closed")
  const curveStyle = cfg.roundStrokes ? d3.curveCardinalClosed : d3.curveLinearClosed;
  var radarLine = d3
    .lineRadial()
    .curve(curveStyle)
    .radius((d) => rScale((d as unknown as RadarDataPoint).value))
    .angle((_d, i) => i * angleSlice);

  // Create a wrapper for the blobs
  const blobWrapper = root
    .selectAll(".radarWrapper")
    .data(data)
    .enter()
    .append("g")
    .attr("class", "radarWrapper");

  // Append the backgrounds
  blobWrapper
    .append("path")
    .attr("class", "radarArea")
    .attr("d", (d, i) => radarLine(d))
    .style("fill", (d, i) => cfg.color(i))
    .style("fill-opacity", cfg.opacityArea)
    .on("mouseover", function(d, i) {
      // Dim all blobs
      d3.selectAll(".radarArea")
        .transition()
        .duration(200)
        .style("fill-opacity", 0.1);
      // Bring back the hovered over blob
      d3.select(this).transition().duration(200).style("fill-opacity", 0.7);
    })
    .on("mouseout", function() {
      // Bring back all blobs
      d3.selectAll(".radarArea")
        .transition()
        .duration(200)
        .style("fill-opacity", cfg.opacityArea);
    });

  // Create the outlines
  blobWrapper
    .append("path")
    .attr("class", "radarStroke")
    .attr("d", (d, i) => radarLine(d))
    .style("stroke-width", cfg.strokeWidth + "px")
    .style("stroke", (d, i) => cfg.color(i))
    .style("fill", "none")
    .style("filter", "url(#glow)");

  // Append the circles
  blobWrapper
    .selectAll(".radarCircle")
    .data((d) => d)
    .enter()
    .append("circle")
    .attr("class", "radarCircle")
    .attr("r", cfg.dotRadius)
    .attr(
      "cx",
      (d, i) => rScale(d.value) * Math.cos(angleSlice * i - Math.PI / 2)
    )
    .attr(
      "cy",
      (d, i) => rScale(d.value) * Math.sin(angleSlice * i - Math.PI / 2)
    )
    .style("fill", (d, i, j) => cfg.color(j))
    .style("fill-opacity", 0.8);

  /////////////////////////////////////////////////////////
  //////// Append invisible circles for tooltip ///////////
  /////////////////////////////////////////////////////////

  // Wrapper for the invisible circles on top
  const blobCircleWrapper = root
    .selectAll(".radarCircleWrapper")
    .data(data)
    .enter()
    .append("g")
    .attr("class", "radarCircleWrapper");

  // Append a set of invisible circles on top for the mouseover pop-up
  blobCircleWrapper
    .selectAll(".radarInvisibleCircle")
    .data((d, i) => d)
    .enter()
    .append("circle")
    .attr("class", "radarInvisibleCircle")
    .attr("r", cfg.dotRadius * 1.5)
    .attr("cx", function(d, i) {
      return rScale(d.value) * Math.cos(angleSlice * i - Math.PI / 2);
    })
    .attr("cy", function(d, i) {
      return rScale(d.value) * Math.sin(angleSlice * i - Math.PI / 2);
    })
    .style("fill", "none")
    .style("pointer-events", "all")
    .on("mouseover", function(_event, d) {
      const newX = parseFloat(d3.select(this).attr("cx")) - 10;
      const newY = parseFloat(d3.select(this).attr("cy")) - 10;

      tooltip
        .attr("x", newX)
        .attr("y", newY)
        .text(format(d.value))
        .transition()
        .duration(200)
        .style("opacity", 1);
    })
    .on("mouseout", function() {
      tooltip.transition().duration(200).style("opacity", 0);
    });

  // Set up the small tooltip for when you hover over a circle
  const tooltip = root.append("text").attr("class", "tooltip").style("opacity", 0);

  /////////////////////////////////////////////////////////
  /////////////////// Helper Function /////////////////////
  /////////////////////////////////////////////////////////

  // Wraps SVG text, used for the axis labels
  // Positions the axis labels.
  function wrap(
    text: d3.Selection<SVGTextElement, string, SVGElement, unknown>,
    width: number
  ) {
    text.each(function() {
      const text = d3.select(this);
      const words = text.text().split(/\s+/).reverse();

      let word;
      let line: string[] = [];
      let lineNumber = 0;

      const lineHeight = 1.4; // em;
      const y = text.attr("y");
      const x = text.attr("x");
      const dy = parseFloat(text.attr("dy"));
      let tspan = text
        .text(null)
        .append("tspan")
        .attr("x", x)
        .attr("y", y)
        .attr("dy", dy + "em");

      while ((word = words.pop())) {
        line.push(word);
        tspan.text(line.join(" "));

        const tspanNode = tspan ? tspan.node() : null;
        if (tspanNode && tspanNode.getComputedTextLength() > width) {
          line.pop();
          tspan.text(line.join(" "));
          line = [word];
          tspan = text
            .append("tspan")
            .attr("x", x)
            .attr("y", y)
            .attr("dy", ++lineNumber * lineHeight + dy + "em")
            .text(word);
        }
      }
    });
  }
}
