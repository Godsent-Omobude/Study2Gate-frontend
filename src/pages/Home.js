import { Fragment, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/study2gate-logo-transparent.png";
import "./Home.css";

const HEADLINE = ["Your academic resources.", "Your study tools.", "One place."];

// Size of the transparent logo file (width / height). Used to keep its shape in CSS.
const LOGO_RATIO = "452 / 196";

// getComputedStyle returns "rgb(r, g, b)"; theme-color is safest as a hex value.
const toHex = (rgb) => {
  const m = rgb.match(/\d+/g);
  if (!m || m.length < 3) return rgb;
  return `#${m.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, "0")).join("")}`;
};

export default function Home() {
  const rootRef = useRef(null);
  const gateRef = useRef(null);

  /* Match the page edges (overscroll, notch area, mobile browser bar) to the page background. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const bg = getComputedStyle(root).backgroundColor;
    const prevBody = document.body.style.backgroundColor;
    document.body.style.backgroundColor = bg;

    const meta = document.querySelector('meta[name="theme-color"]');
    const prevMeta = meta ? meta.getAttribute("content") : null;
    if (meta) meta.setAttribute("content", toHex(bg));

    return () => {
      document.body.style.backgroundColor = prevBody;
      if (meta && prevMeta !== null) meta.setAttribute("content", prevMeta);
    };
  }, []);

  /* Intro: gate opens, logo pops, headline types itself. Tap the logo to replay. */
  useEffect(() => {
    const root = rootRef.current;
    const gate = gateRef.current;
    if (!root || !gate) return undefined;

    const reduce =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const lines = Array.from(root.querySelectorAll(".s2g-line"));
    const chars = lines.map((line) => Array.from(line.querySelectorAll(".s2g-c")));

    const caret = document.createElement("span");
    caret.className = "s2g-caret";
    caret.setAttribute("aria-hidden", "true");

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    let run = 0;
    let busy = false;
    let disposed = false;

    const reset = () => {
      root.classList.remove("s2g-play", "s2g-typing");
      lines.forEach((line) => line.classList.remove("s2g-ul-on"));
      chars.forEach((arr) => arr.forEach((c) => c.classList.remove("s2g-on")));
      if (caret.parentNode) caret.parentNode.removeChild(caret);
    };

    const type = async (token) => {
      chars[0][0].before(caret);
      root.classList.add("s2g-typing");
      for (let l = 0; l < chars.length; l += 1) {
        for (let i = 0; i < chars[l].length; i += 1) {
          if (token !== run) return;
          const c = chars[l][i];
          c.classList.add("s2g-on");
          c.after(caret);
          await sleep(c.textContent === "." ? 110 : 24 + Math.random() * 22);
        }
        if (l < chars.length - 1) {
          await sleep(230);
          chars[l + 1][0].before(caret);
        }
      }
      lines[lines.length - 1].classList.add("s2g-ul-on");
      await sleep(1400);
      if (token === run) root.classList.remove("s2g-typing");
    };

    const play = async () => {
      if (busy || disposed) return;
      busy = true;
      run += 1;
      const token = run;
      reset();
      void root.offsetWidth; // restart the CSS animations cleanly

      if (reduce) {
        chars.forEach((arr) => arr.forEach((c) => c.classList.add("s2g-on")));
        root.classList.add("s2g-play");
        busy = false;
        return;
      }

      root.classList.add("s2g-play");
      await sleep(1000); // headline starts while the doors are still opening
      if (token !== run) return;
      await type(token);
      busy = false;
    };

    gate.addEventListener("click", play);

    // Wait for the web fonts (max 1.2s) so the text never re-wraps mid-animation.
    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    Promise.race([fontsReady, sleep(1200)]).then(() => {
      if (!disposed) requestAnimationFrame(play);
    });

    return () => {
      disposed = true;
      run += 1; // cancels any typing loop in flight
      gate.removeEventListener("click", play);
      reset();
    };
  }, []);

  return (
    <main
      ref={rootRef}
      className="s2g-home s2g-armed"
      style={{ "--logo": `url("${logo}")`, "--logo-ratio": LOGO_RATIO }}
    >
      <div className="s2g-page">
        <header className="s2g-nav">
          <Link to="/" className="s2g-nav-brand" aria-label="Study2Gate home">
            <span className="s2g-mark" role="img" aria-label="S2G logo" />
            <span className="s2g-wordmark">
              Study<span>2Gate</span>
            </span>
          </Link>
          <nav className="s2g-nav-actions" aria-label="Account">
            <Link to="/login" className="s2g-nav-link">
              Sign in
            </Link>
            <Link to="/register" className="s2g-nav-cta">
              Create account
            </Link>
          </nav>
        </header>

        {/* Logo animation. Tap or click it to replay the intro. */}
        <div className="s2g-stage">
          <div className="s2g-gate-wrap">
            <div className="s2g-frame" aria-hidden="true" />
            <button
              ref={gateRef}
              className="s2g-gate"
              type="button"
              aria-label="Study2Gate logo. Activate to replay the welcome animation."
            >
              <div className="s2g-logo-pos">
                <div className="s2g-logo" role="img" aria-label="S2G" />
              </div>
              <span className="s2g-door s2g-l" aria-hidden="true" />
              <span className="s2g-door s2g-r" aria-hidden="true" />
              <span className="s2g-seam" aria-hidden="true" />
            </button>
          </div>
        </div>

        <section className="s2g-copy">
          <h1 className="s2g-headline" aria-label={HEADLINE.join(" ")}>
            {HEADLINE.map((text, li) => (
              <span
                key={text}
                className={`s2g-line${li === HEADLINE.length - 1 ? " s2g-line-last" : ""}`}
                aria-hidden="true"
              >
                {text.split(" ").map((word, wi, words) => (
                  <Fragment key={`${word}-${wi}`}>
                    <span className="s2g-w">
                      {Array.from(word).map((ch, ci) => (
                        <span className="s2g-c" key={ci}>
                          {ch}
                        </span>
                      ))}
                    </span>
                    {wi < words.length - 1 ? " " : null}
                  </Fragment>
                ))}
              </span>
            ))}
          </h1>

          <p className="s2g-lede">
            Find and share course materials, turn your notes into flashcards, and study with your
            classmates from one organised platform.
          </p>

          <div className="s2g-actions">
            <Link to="/register" className="s2g-btn s2g-btn-primary">
              Create an account
            </Link>
            <Link to="/login" className="s2g-btn s2g-btn-ghost">
              Sign in
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
