import * as d3 from "d3";

interface Config {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface DataPoint {
  label: string;
  color: string;
  value: number;
}

const brightness = (color: string) => {
  const rgb = d3.color(color)?.rgb();
  if (!rgb) return NaN;
  // See https://www.w3.org/TR/AERT/#color-contrast
  return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
};

const safeLabelColor = (color: string): string => {
  const b = brightness(color);
  if (Number.isNaN(b)) return "#f00";

  if (b < 128) return color;
  return d3.color(color)?.darker(0.5).formatHex() || "#000";
};

export default function PieChart(
  container: HTMLElement,
  data: DataPoint[],
  cfgOverrides: Partial<Config>
) {
  const cfg: Config = {
    width: 450,
    height: 450,
    padding: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
    ...cfgOverrides,
  };

  // The radius of the pieplot is half the width or half the height (smallest one). I subtract a bit of margin.
  const innerWidth = cfg.width - cfg.padding.left - cfg.padding.right;
  const innerHeight = cfg.height - cfg.padding.top - cfg.padding.bottom;

  // Radius of the outermost circle
  const outerRadius = Math.min(innerWidth, innerHeight) / 2;
  const innerRadius = outerRadius * 0.9;

  // Remove whatever chart with the same id/class was present before
  d3.select(container).select("svg").remove();

  const root = d3
    .select(container)
    .append("svg")
    .attr("width", cfg.width)
    .attr("height", cfg.height)
    .append("g")
    .attr("transform", `translate(${cfg.width / 2}, ${cfg.height / 2})`);

  // Compute the position of each group on the pie:
  const pie = d3
    .pie<DataPoint>()
    .sort(null)
    .value((d) => d.value);
  const arcs = pie(data);
  // shape helper to build arcs:
  const arcGenerator = d3
    .arc<d3.PieArcDatum<DataPoint>>()
    .innerRadius(0)
    .outerRadius(innerRadius);

  const outerArc = d3
    .arc<d3.PieArcDatum<DataPoint>>()
    .innerRadius(outerRadius)
    .outerRadius(outerRadius);

  // Build the pie chart: Basically, each part of the pie is a path that we build using the arc function.
  root
    .selectAll("slices")
    .data(arcs)
    .enter()
    .append("path")
    .attr("d", arcGenerator)
    .attr("fill", (d) => d.data.color);

  root
    .selectAll("polylines")
    .data(arcs)
    .enter()
    .append("polyline")
    .attr("stroke", (d) => d.data.color)
    .style("fill", "none")
    .attr("stroke-width", 1)
    // @ts-ignore
    .attr("points", (d) => {
      // line insertion in the slice
      const posA = arcGenerator.centroid(d);
      // line break: we use the other arc generator that has been built only for that
      const posB = outerArc.centroid(d);
      // Label position = almost the same as posB
      const posC = outerArc.centroid(d);
      // we need the angle to see if the X position will be at the extreme right
      // or extreme left
      const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
      // multiply by 1 or -1 to put it on the right or on the left
      // Multiply by 0.95 to avoid line going all the way to the text
      posC[0] = outerRadius * 0.95 * (midangle < Math.PI ? 1 : -1);
      return [posA, posB, posC];
    });

  // Now add the annotation. Use the centroid method to get the best coordinates
  root
    .selectAll("slices")
    .data(arcs)
    .enter()
    .append("text")
    .text((d) => d.data.label)
    .style("fill", (d) => safeLabelColor(d.data.color))
    .style("font-weight", "bold")
    .attr("dy", "0.25em")
    .attr("transform", (d) => {
      const pos = outerArc.centroid(d);
      const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
      pos[0] = outerRadius * (midAngle < Math.PI ? 1 : -1);
      return `translate(${pos})`;
    })
    .style("text-anchor", (d) => {
      const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
      return midAngle < Math.PI ? "start" : "end";
    });
}