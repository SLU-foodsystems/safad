import FoodsCard from "./FoodsCard";

export default function FoodsCards(data: EAT[]) {
  return data.map(FoodsCard);
}
