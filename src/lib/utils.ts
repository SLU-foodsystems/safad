export function sum(numbers: number[]) {
  return numbers.reduce((a, b) => a + b, 0);
}

export function average(numbers: number[]) {
  if (numbers.length === 0) return 0;
  return sum(numbers) / numbers.length;
}


// Round a number to a given precision (= number of decimal points)
export function toPrecision(number: number, precision: number = 2) {
  return Math.round(number * 10 ** precision) / 10 ** precision;
}
