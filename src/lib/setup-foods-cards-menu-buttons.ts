export default function setup(
  expandAllSelector: string,
  collapseAllSelector: string
) {
  const expand = document.querySelector(expandAllSelector);
  const collapse = document.querySelector(collapseAllSelector);

  if (!expand || !collapse) {
    console.error("Could not find expand/collapse buttons");
    return;
  }

  const setIsOpen = (open: boolean) => {
    const cards = document.querySelectorAll(".foods-card");
    if (!cards) {
      console.error("Could not find any foods cards");
    }

    Array.from(cards).forEach((card) =>
      card.setAttribute("open", open ? "true" : "false")
    );
  };

  expand.addEventListener("click", () => setIsOpen(true));
  collapse.addEventListener("click", () => setIsOpen(false));
}
