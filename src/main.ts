import "./styles/main.scss";
import foodCodes from "./foods.json";
import FoodsCards from "./components/FoodsCards";
import setupFoodsCardsMenuButtons from "./lib/setup-foods-cards-menu-buttons";

const cards = FoodsCards(foodCodes.data);

const parent = document.querySelector(".diet-configuration");
cards.forEach(card => parent?.appendChild(card));

setupFoodsCardsMenuButtons("#js-expand-all", "#js-collapse-all");
