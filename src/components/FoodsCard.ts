function el<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  classList: string[] = [],
  attributes: Record<string, string> = {}
): Element {
  const el = document.createElement(tagName);
  el.classList.add(...classList);

  Object.keys(attributes).forEach((attrName) =>
    el.setAttribute(attrName, attributes[attrName])
  );

  return el;
}

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

function attachMutationObserver(rootEl: Element) {
  // Options for the observer (which mutations to observe)
  const config = { attributes: true };

  // Create an observer instance linked to the callback function
  const observer = new MutationObserver((mutationList) => {
    for (const mutation of mutationList) {
      if (mutation.type === "attributes") {
        switchState(rootEl);
      }
    }
  });

  // Start observing the target node for configured mutations
  observer.observe(rootEl, config);
}

export default function FoodsCard(eat: EAT) {
  const root = el("div", ["foods-card"], { role: "region", open: "true" });

  const header = el("h3", ["foods-card__header"]);
  const headerButton = el("button", ["cluster", "cluster--between"], {
    "aria-expanded": "true",
    "data-accordion-toggle": "",
  }) as HTMLButtonElement;
  header.append(headerButton);

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

  const body = el("div", ["foods-card__body"], {
    "data-accordion-body": "true",
  });
  body.innerHTML = eat.fbs
    .map(
      (fbs: FBS) => ` 
    <div class="foods-card__fbs">
      <div class="cluster cluster--between">
        <h4>${fbs.name}</h4>
        <span class="foods-card__unit u-faded">g/day</span>
      </div>
      ${fbs.sua
        .map(
          (sua) => `
        <div class="foods-card__sua cluster cluster--between">
          <span>${sua.name}</span>
          <input type="text" />
        </div>
        `
        )
        .join("")}`
    )
    .join("");

  root.appendChild(header);
  root.appendChild(body);

  attachMutationObserver(root);

  return root;
}
