export const options = {
  logging: false,
  formatObject: (x) => x,
};

export const getOptions = () => options;

export const setOptions = (moreOptions) => {
  Object.assign(options, moreOptions);
};
