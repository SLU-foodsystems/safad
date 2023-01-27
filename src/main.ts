import "./styles/main.scss";
import foodCodes from "./foods.json";

interface SUA {
  name: string;
  id: string;
}

interface FBS {
  name: string;
  id: string;
  sua: SUA[];
}

interface EAT {
  name: string;
  id: string;
  fbs: FBS[];
}

function foodsCard(eat: EAT) {
  return `
    <div class="foods-card">
      <button class="foods-card__header">
        <h3>${eat.name}: <span data-js-amount>103</span> g</h3>
      </button>
      <div class="foods-card__body">${
eat.fbs.map((fbs: FBS) => `
  <div class="foods-card__fbs">
    <h4>${fbs.name}</h4>${
fbs.sua.map(sua => `
<div class="foods-card__sua cluster cluster--between">
<span>${sua.name}</span>
<input type="text" />
</div>

`).join("")

}
  </div>
`).join("")
      }</div>
    </div>
`;

}


const html = foodCodes.data.map(foodsCard).join("")

document.querySelector(".diet-configuration")!.innerHTML = html;
