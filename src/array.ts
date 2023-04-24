export function sum(arr: Array<number>): number {
  return arr.reduce((acc, curr) => acc + curr, 0);
}

export function average(arr: Array<number>): number {
  return sum(arr) / arr.length;
}
