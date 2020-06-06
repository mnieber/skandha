import { getSignal } from "../internal/events";
import { getCtr } from "../internal/ctr";

const _type = "facet.Message";

function matchFilename(str: string, rule: string) {
  var escapeRegex = (str: string) =>
    str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
  return new RegExp(
    "^" + rule.split("*").map(escapeRegex).join(".*") + "$"
  ).test(str);
}

export function sendMsg(facet, topic, details = {}) {
  const ctr = getCtr(facet);
  const signal = getSignal(ctr);
  signal.dispatch({
    type: _type,
    topic,
    details,
  });
}

export function subscribe(facet, messageFilter, callback) {
  getSignal(getCtr(facet)).add((event) => {
    if (event.type === _type && matchFilename(event.topic, messageFilter)) {
      callback(event);
    }
  });
}
