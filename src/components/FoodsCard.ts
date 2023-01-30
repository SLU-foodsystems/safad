import { average, sum, toPrecision, el } from "../lib/utils";

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

function FbsBlock(fbs: FBS, mode: "sum" | "mean", notifyChange) {
  const root = el("div", "foods-card__fbs");

  const header = el("div", "cluster cluster--between");
  const title = el("h4");
  title.innerText = fbs.name;

  const inputHeader = el("span", "u-faded");
  const aggregateSpan = el("span");
  aggregateSpan.innerHTML = "0"; // Default value.
  const unitLabel = el("span", "foods-card__unit");
  unitLabel.innerText = " g / day"; // TODO
  inputHeader.appendChild(aggregateSpan);
  inputHeader.appendChild(unitLabel);

  header.appendChild(title);
  header.appendChild(inputHeader);

  const inputs: { [k: string]: HTMLInputElement } = {};

  const getInputValues = (): number[] =>
    Object.values(inputs)
      .map((input) => input.value)
      .map((value) => {
        if (!value) return 0;
        const parseable = value.trim().replace(",", ".");
        // TODO: Error handling.
        const number = Number.parseFloat(parseable);
        return Number.isNaN(number) ? 0 : number;
      });

  // TODO: Do two updates here: one for self, one for eat
  // alt: notifyChange()
  const onSuaUpdate = () => {
    const values = getInputValues();
    const value = mode === "sum" ? sum(values) : average(values);
    aggregateSpan.innerText = String(toPrecision(value));
  };

  const suaRows = fbs.sua.map(({ name, id }) => {
    const row = el("div", "foods-card__sua cluster cluster--between");
    const span = el("span");
    span.innerText = name;

    const input = el("input", "", { type: "text", "data-sua-id": id });
    input.addEventListener("input", onSuaUpdate);
    input.addEventListener("change", notifyChange);

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
    <span>${eat.name}</span>
    <span>
      <span data-fbs-aggregate>0</span> g
      <svg viewBox="0 0 10 10" aria-hidden="true" focusable="false">
        <rect class="vert" height="8" width="2" y="1" x="4" />
        <rect height="2" width="8" y="4" x="1" />
      </svg>
    </span>
  `;

  const aggregateSpan = headerButton.querySelector('[data-fbs-aggregate]') as HTMLSpanElement | null;
  if (!aggregateSpan) throw new Error("AggregateSpan not found.")

  const body = el("div", "foods-card__body", {
    "data-accordion-body": "true",
  });

  // TODO: Assumes SUM and not MEAN
  const updateFbsSum = () => {
    const inputs = body.querySelectorAll(
      "input[data-sua-id]"
    ) as NodeListOf<HTMLInputElement>;
    if (!inputs) throw new Error("Could not find sua inputs");

    const values = Array.from(inputs)
      .map((el) => el.value)
      .map((val) => parseFloat(val))
      .filter((val) => !Number.isNaN(val));

    const value = sum(values);

    aggregateSpan.innerText = String(toPrecision(value, 2));
  };


  eat.fbs.forEach((fbs) =>
    body.appendChild(FbsBlock(fbs, "sum", updateFbsSum))
  );

  root.appendChild(header);
  root.appendChild(body);

  observeAttributeChanges(root, switchState);

  return root;
}
