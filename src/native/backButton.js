// A tiny stack of "close me" callbacks. Anything that sits on top of the page
// (drawer, modal, confirm dialog) registers while it is open, and the Android
// back button closes the topmost one before it navigates anywhere.
const handlers = [];

export function pushBackHandler(handler) {
  handlers.push(handler);
  return () => {
    const index = handlers.lastIndexOf(handler);
    if (index !== -1) handlers.splice(index, 1);
  };
}

export function runBackHandler() {
  const handler = handlers[handlers.length - 1];
  if (!handler) return false;
  handler();
  return true;
}
