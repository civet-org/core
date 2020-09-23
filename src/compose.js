function compose(...fn) {
  if (fn.length === 0) return (arg) => arg;

  if (fn.length === 1) return fn[0];

  return fn.reduce((a, b) => (arg) => a(b(arg)));
}

export default compose;
