export const options = {
  logging: false,
  formatObject: (x) => x,
  decorateCb: (x) => x,
};

export const getOptions = () => options;

export const setOptions = (moreOptions) => {
  Object.assign(options, moreOptions);
};

export const decorateCb = (x: any) => options.decorateCb(x);
