export default function compose<Arg>(
  ...fn: ((arg: Arg) => Arg)[]
): (arg: Arg) => Arg {
  if (fn.length === 0) return (arg: Arg) => arg;

  if (fn.length === 1) return fn[0];

  return fn.reduce((a, b) => (arg) => a(b(arg)));
}
