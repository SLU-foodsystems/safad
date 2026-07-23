import * as d3 from "d3";

const brightness = (color: string) => {
  const rgb = d3.color(color)?.rgb();
  if (!rgb) return NaN;
  // See https://www.w3.org/TR/AERT/#color-contrast
  return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
};

export const safeLabelColor = (color: string): string => {
  const b = brightness(color);
  if (Number.isNaN(b)) return "#f00";

  if (b < 128) return color;
  return d3.color(color)?.darker(0.5).formatHex() || "#000";
};

export const contrastingTextColor = (color: string): string => {
  const b = brightness(color);
  return Number.isNaN(b) || b > 128 ? "#000" : "#fff";
};

export const getYTickFormat = (
  val: number,
  domain: [number, number],
  threshold = 5
) =>
  Math.ceil(Math.abs(Math.log10(val))) > threshold
    ? d3.format(".2e")
    : d3.scaleLinear().domain(domain).tickFormat();
