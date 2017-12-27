export const pick =
  prop =>
    stream =>
      stream[prop];

export const noArgs =
  stream =>
    undefined;
