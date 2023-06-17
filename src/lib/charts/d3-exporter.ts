function inlineStyles(source: Element, target: Element) {
  // inline style from source element to the target (detached) one
  const computed = window.getComputedStyle(source);
  //@ts-ignore-next-line
  for (const styleKey of computed) {
    //@ts-ignore-next-line
    target.style[styleKey] = computed[styleKey];
  }

  // recursively call inlineStyles for the element children
  for (let i = 0; i < source.children.length; i++) {
    inlineStyles(source.children[i], target.children[i]);
  }
}

interface CanvasOptions {
  source: Element;
  target: Element;
  scale: number;
  format: "png" | "jpeg";
  quality: number;
}

function copyToCanvas({
  source,
  target,
  scale,
  format,
  quality,
}: CanvasOptions) {
  const svgData = new XMLSerializer().serializeToString(target);
  const canvas = document.createElement("canvas") as HTMLCanvasElement;
  const svgSize = source.getBoundingClientRect();

  //Resize can break shadows
  canvas.width = svgSize.width * scale;
  canvas.height = svgSize.height * scale;
  canvas.style.width = String(svgSize.width);
  canvas.style.height = String(svgSize.height);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get context");
  ctx.scale(scale, scale);

  let img = document.createElement("img");

  img.setAttribute(
    "src",
    "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)))
  );

  return new Promise<string>((resolve) => {
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL(`image/${format}`, quality));
    };
  });
}

interface ImageOptions {
  file: string;
  name: string;
  format: string;
}

function downloadImage({ file, name, format }: ImageOptions) {
  const a = document.createElement("a");
  a.download = `${name}.${format}`;
  a.href = file;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

interface Options {
  scale: number;
  format: "png" | "jpeg";
  quality: number;
  download: boolean;
  ignore?: string;
  inlineCss: boolean;
  background?: string;
}

export default async function downloadSvgAsImage(
  source: Element | string,
  name: string,
  options: Partial<Options>
) {
  const opts: Options = Object.assign(
    {
      scale: 1,
      format: "png",
      quality: 0.92,
      download: true,
      ignore: null,
      inlineCss: true,
      background: "white",
    },
    options
  );

  // Accept a selector or directly a DOM Element
  source = source instanceof Element ? source : document.querySelector(source)!;

  // Create a new SVG element similar to the source one to avoid modifying the
  // source element.
  const target = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  target.innerHTML = source.innerHTML;

  //@ts-ignore-next-line
  for (const attr of source.attributes) {
    target.setAttribute(attr.name, attr.value);
  }

  // Set all the css styles inline on the target element based on the styles
  // of the source element
  if (opts.inlineCss) {
    inlineStyles(source, target);
  }

  if (opts.background) {
    target.style.background = opts.background;
  }

  //Remove unwanted elements
  if (opts.ignore != null) {
    const els = Array.from(target.querySelectorAll(opts.ignore));
    els.forEach((el) => el.parentNode?.removeChild(el));
  }

  //Copy all html to a new canvas
  const file = await copyToCanvas({
    source,
    target,
    scale: opts.scale,
    format: opts.format,
    quality: opts.quality,
  });

  if (opts.download) {
    downloadImage({ file, name, format: opts.format });
  }

  return file;
}
