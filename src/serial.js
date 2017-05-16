import pipe from './pipe';

export default function serial(stream, pipes, index = 0) {
  const pipeDescriptor = pipes[index];

  if (!pipeDescriptor) {
    return Promise.resolve(stream);
  }

  return new Promise((resolve, reject) => {
    const next = nextStream => serial(nextStream, pipes, index + 1).then(resolve);

    pipe(stream, pipeDescriptor).then(next).catch(reject);
  })
}
