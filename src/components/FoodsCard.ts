import { average, sum, toPrecision } from "../lib/utils";

function el<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className: string = "",
  attributes: Record<string, string> = {}
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tagName);
  el.className = className;

  Object.keys(attributes).forEach((attrName) =>
    el.setAttribute(attrName, attributes[attrName])
  );

  return el;
}

/**
 * Toggle the accordion-state on an element
 */
function switchState(el: Element) {
  const expanded = el.getAttribute("open") === "true" || false;
  const btn = el.querySelector("[data-accordion-toggle]");
  if (!btn) {
    console.error("Could not find button toggle of accordion", el);
    return;
  }

  const body = el.querySelector("[data-accordion-body]");
  if (!body) {
    console.error("Could not find body of accordion", el);
    return;
  }

  // Toggle `aria-expanded`
  btn.setAttribute("aria-expanded", expanded ? "true" : "false");
  // Toggle the `.content` element's visibility
  if (expanded) {
    body.removeAttribute("hidden");
  } else {
    body.setAttribute("hidden", "true");
  }

  console.log("setting state to", expanded);
}

/**
 * Attach a callback to run every time attributes on element changes.
 */
function observeAttributeChanges(
  rootEl: Element,
  callback: (el: Element) => void
) {
  // Options for the observer (which mutations to observe)
  const config = { attributes: true };

  // Create an observer instance linked to the callback function
  const observer = new MutationObserver((mutationList) => {
    for (const mutation of mutationList) {
      if (mutation.type === "attributes") {
        callback(rootEl);
      }
    }
  });

  // Start observing the target node for configured mutations
  observer.observe(rootEl, config);
}

function FbsBlock(fbs: FBS, mode: "sum" | "mean") {
  const root = el("div", "foods-card__fbs");

  const header = el("div", "cluster cluster--between");
  const title = el("h4");
  title.innerText = fbs.name;
  const fbsValueLabel = el("span");
  title.appendChild(fbsValueLabel);
  header.appendChild(title);

  const unitLabel = el("span", "foods-card__unit u-faded");
  unitLabel.innerText = "g / day"; // TODO

  const onUpdate = () => {
    const values = Object.values(inputs)
      .map((x) => x.value)
      .map((val) => {
        if (!val) return 0;
        const parseable = val.trim().replace(",", ".");
        // TODO: Error handling.
        const number = Number.parseFloat(parseable);
        return Number.isNaN(number) ? 0 : number;
      });

    const value = mode === "sum" ? sum(values) : average(values);
    fbsValueLabel.innerText = String(toPrecision(value));
  };

  const inputs: Record<string, HTMLInputElement> = {};

  const suaRows = fbs.sua.map(({ name, id }) => {
    const row = el("div", "foods-card__sua cluster cluster--between");
    const span = el("span");
    span.innerText = name;

    const input = el("input", "", { type: "text" });
    input.addEventListener("change", onUpdate);

    row.appendChild(span);
    row.appendChild(input);

    inputs[id] = input;
    return row;
  });

  root.appendChild(header);
  suaRows.forEach((row) => root.appendChild(row));
  return root;
}

export default function FoodsCard(eat: EAT) {
  const root = el("div", "foods-card", { role: "region", open: "true" });

  const header = el("h3", "foods-card__header");
  const headerButton = el("button", "cluster cluster--between", {
    "aria-expanded": "true",
    "data-accordion-toggle": "",
  });
  header.append(headerButton);

  // Toggle the 'open' attribute
  headerButton.onclick = () => {
    root.setAttribute(
      "open",
      root.getAttribute("open") === "true" ? "false" : "true"
    );
  };

  headerButton.innerHTML = `
    <span>
      ${eat.name}: <span data-js-amount>103</span> g
    </span>
    <svg viewBox="0 0 10 10" aria-hidden="true" focusable="false">
      <rect class="vert" height="8" width="2" y="1" x="4" />
      <rect height="2" width="8" y="4" x="1" />
    </svg>
  `;

  const body = el("div", "foods-card__body", {
    "data-accordion-body": "true",
  });
  eat.fbs.forEach((fbs) => body.appendChild(FbsBlock(fbs, "sum")));

  root.appendChild(header);
  root.appendChild(body);

  observeAttributeChanges(root, switchState);

  return root;
}
