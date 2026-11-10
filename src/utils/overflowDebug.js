// Finds elements that stick out past the right edge of the screen.
//
// index.css clips sideways overflow (overflow-x: hidden), which keeps the page
// from scrolling but also hides the bug: content is just cut off. This
// outlines offenders in red and logs them so they can be fixed at the source.
//
// Runs automatically in development. In a production/native build, switch it
// on from the device console (chrome://inspect) with:
//   localStorage.setItem("debugOverflow", "1")   (then reload)
// or by opening the app with ?debugOverflow=1. Mark an intentional scroller
// with data-allow-overflow so it is ignored.

const enabled = () => {
  try {
    return (
      process.env.NODE_ENV !== "production" ||
      localStorage.getItem("debugOverflow") === "1" ||
      new URLSearchParams(window.location.search).get("debugOverflow") === "1"
    );
  } catch {
    return false;
  }
};

const describe = (el) => {
  const id = el.id ? `#${el.id}` : "";
  const cls = typeof el.className === "string" && el.className.trim()
    ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".")
    : "";
  return `${el.tagName.toLowerCase()}${id}${cls}`;
};

export default function watchHorizontalOverflow() {
  if (typeof window === "undefined" || !enabled()) return;

  const reported = new WeakSet();
  let timer;

  const scan = () => {
    const viewportWidth = document.documentElement.clientWidth;
    document.querySelectorAll("body *").forEach((el) => {
      if (reported.has(el)) return;
      if (el.closest("[data-allow-overflow], .overflow-x-auto, .overflow-x-scroll, .materials-file-strip")) return;
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.right > viewportWidth + 1) {
        reported.add(el);
        el.style.outline = "2px solid red";
        console.warn(
          `[overflow] ${describe(el)} ends at ${Math.round(rect.right)}px but the screen is ${viewportWidth}px wide`,
          el
        );
      }
    });
  };

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(scan, 400);
  };

  window.addEventListener("load", schedule);
  window.addEventListener("resize", schedule);
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
}
