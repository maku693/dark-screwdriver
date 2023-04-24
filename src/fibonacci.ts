export function* fibonnaci(): Generator<number> {
  let a = 0;
  let b = 1;
  while (true) {
    yield a;
    [a, b] = [b, a + b];
  }
}

export function nearestFibonacci(n: number): number {
  if (n <= 0) return 0;

  let prev = 0;
  for (const curr of fibonnaci()) {
    if (curr === n) return n;

    if (curr < n) {
      prev = curr;
      continue;
    }

    if (n - prev < curr - n) {
      return prev;
    } else {
      return curr;
    }
  }

  throw new Error("Unreachable");
}
