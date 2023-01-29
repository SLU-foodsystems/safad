import "./styles/main.scss";
import foodCodes from "./foods.json";
import FoodsCards from "./components/FoodsCards";

const cards = FoodsCards(foodCodes.data);

const parent = document.querySelector(".diet-configuration");
cards.forEach(card => parent?.appendChild(card));
