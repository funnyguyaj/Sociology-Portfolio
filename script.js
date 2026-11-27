/* ==========================================================================
   script.js: Analicia Parish portfolio

   What this file does, in order:
     1. Theme buttons  – one per theme, under the intro text.
     2. Filtering      – clicking a theme shows only its publications.
     3. Dot field      – the canvas of dots in the hero. Hovering a theme
                         gathers its dots into a coloured cluster.
     4. Marquee        – the strip of publication titles along the bottom of
                         the hero. Pauses on hover and keyboard focus.
     5. Pinned name    – the big name shrinks into the top bar as you scroll.
     6. Docking        – the marquee joins the top bar when it scrolls up to it.

   The two lists right below are the parts you'll want to edit.
   ========================================================================== */


/* --------------------------------------------------------------------------
   THEMES  (edit me)
   id     – a short internal name, used in PUBLICATION_THEMES below
   label  – the text on the button
   color  – the name of a CSS variable in style.css (:root). Keeping colours
            in style.css means one change there updates everything.
   -------------------------------------------------------------------------- */
const THEMES = [
    { id: "race",   label: "Race",              color: "--theme-race" },
    { id: "gender", label: "Gender",            color: "--theme-gender" },
    { id: "queer",  label: "Queer culture",     color: "--theme-queer" },
    { id: "punk",   label: "Punk & resistance", color: "--theme-punk" },
];


/* --------------------------------------------------------------------------
   WHICH THEME EACH PUBLICATION BELONGS TO  (edit me)
   Matched by the publication's link (its href in main.html).
   One theme per publication; use an id from THEMES above.
   -------------------------------------------------------------------------- */
const PUBLICATION_THEMES = [
    {
        url: "https://digitalcollections.usfca.edu/digital/collection/p15129coll6/id/1809/rec/1",
        theme: "punk",
    },
    {
        url: "https://sffoghorn.com/gender-ambiguous-self-expression-raises-risks-for-people-of-color/",
        theme: "race",
    },
    {
        url: "https://sffoghorn.com/period-products-should-not-be-luxury-goods/",
        theme: "gender",
    },
    {
        url: "https://sffoghorn.com/cancellation-of-queer-shows-points-to-resurging-mainstream-homophobia/",
        theme: "queer",
    },
];


/* --------------------------------------------------------------------------
   TUNING  (safe to experiment with)
   -------------------------------------------------------------------------- */
const SETTINGS = {
    // Dot field
    dotRadius: 2.2,          // size of a resting dot, in CSS pixels
    clusterDotRadius: 3.2,   // size of a dot inside a cluster
    clusterSpacing: 5.2,     // how loosely a cluster packs (bigger = wider)
    restAlpha: 0.55,         // opacity of resting dots
    dimAlpha: 0.12,          // opacity of dots outside the highlighted theme
    pointerRadius: 125,      // how close the mouse must be to push dots
    pointerPush: 33,         // how far dots move away at most
    pointerGrow: 1,          // how much bigger dots get right under the mouse (px)
    // How quickly dots catch up with where they should be. Each frame a dot
    // covers a share of the remaining distance, which is an exponential
    // ease-out: quick at first, then settling gently. Higher = snappier.
    dotEase: 5.7,

    // Marquee
    marqueeSpeed: 40,        // pixels per second
    marqueeEase: 8,          // how quickly it glides to a stop / back up to speed (higher = quicker)

    // Pinned name
    pinnedNameSize: 24,      // final font size of the name in the top bar, in px
    shrinkDistance: 0.6,     // finish shrinking after scrolling 60% of the screen height
};


/* ==========================================================================
   Shared setup
   ========================================================================== */

const root = document.documentElement;
const rootStyles = getComputedStyle(root);

// Respect the visitor's "reduce motion" system setting.
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
let reduceMotion = reducedMotionQuery.matches;

// Elements from main.html
const hero = document.querySelector(".hero");
const canvas = document.querySelector(".dot-field");
const filterBar = document.querySelector(".theme-filters");
const statusLine = document.querySelector(".filter-status");
const marquee = document.querySelector(".marquee");
const marqueeTrack = document.querySelector(".marquee-track");
const nameEl = document.querySelector(".pin-name");
const heroInner = document.querySelector(".hero-inner");
const pinBg = document.querySelector(".pin-bg");
const publicationRows = Array.from(document.querySelectorAll(".pubs li"));

// Which theme is CLICKED (filters the list), and which is HOVERED/FOCUSED
// (previews in the dot field). Both hold a theme's index (0, 1, 2…) or null.
let activeTheme = null;
let previewTheme = null;

// The dot field calls this when either of those changes. (Filled in below.)
let refreshDots = () => {};

// The marquee section fills this in; the docking code calls it after
// moving the strip into or out of the top bar. (See sections 4 and 5.)
let resyncMarqueePause = () => {};
// Slides the marquee's titles sideways by some pixels (filled in by section 4).
let shiftMarquee = () => {};

// Look up the theme of one publication row, by its link.
// Returns the theme's position in THEMES (0, 1, 2…), or null if not found.
function themeForRow(row) {
    const link = row.querySelector("a");
    if (!link) return null;
    const entry = PUBLICATION_THEMES.find((item) => sameUrl(item.url, link.href));
    const index = entry ? THEMES.findIndex((theme) => theme.id === entry.theme) : -1;
    if (index === -1) {
        // A note in the browser console (F12) if a publication was missed.
        console.warn("No valid theme in PUBLICATION_THEMES for:", link.href);
        return null;
    }
    return index;
}

// A small coloured dot for a theme (used in buttons, rows and the marquee).
function makeSwatch(themeIndex) {
    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.setAttribute("aria-hidden", "true");
    swatch.style.setProperty("--swatch", `var(${THEMES[themeIndex].color})`);
    return swatch;
}


/* ==========================================================================
   1. Theme buttons
   ========================================================================== */

const themeButtons = THEMES.map((theme, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "theme-button";
    // aria-pressed tells screen readers this button is an on/off toggle.
    button.setAttribute("aria-pressed", "false");
    button.append(makeSwatch(index), theme.label);

    // Hover and keyboard focus PREVIEW the theme in the dot field.
    const startPreview = () => { previewTheme = index; refreshDots(); };
    const endPreview = () => { previewTheme = null; refreshDots(); };
    button.addEventListener("pointerenter", startPreview);
    button.addEventListener("pointerleave", endPreview);
    button.addEventListener("focus", startPreview);
    button.addEventListener("blur", endPreview);

    // Click FILTERS the list. Clicking the selected theme again clears it.
    button.addEventListener("click", () => setFilter(activeTheme === index ? null : index));

    if (filterBar) filterBar.append(button);
    return button;
});

// Each publication row also gets its theme's dot on the right.
for (const row of publicationRows) {
    const themeIndex = themeForRow(row);
    if (themeIndex === null) continue;
    const holder = document.createElement("span");
    holder.className = "row-themes";
    const swatch = makeSwatch(themeIndex);
    swatch.title = THEMES[themeIndex].label; // tooltip on hover
    holder.append(swatch);
    row.append(holder);
}


/* ==========================================================================
   2. Filtering the publication list
   ========================================================================== */

function setFilter(themeIndex) {
    activeTheme = themeIndex;

    // Update which button looks pressed.
    themeButtons.forEach((button, index) => {
        button.setAttribute("aria-pressed", index === themeIndex ? "true" : "false");
    });

    // Show or hide each row.
    let shown = 0;
    for (const row of publicationRows) {
        const visible = themeIndex === null || themeForRow(row) === themeIndex;
        if (visible) shown++;

        // Rows coming back get a short fade-up (.is-revealed in style.css).
        if (visible && row.hidden) {
            row.classList.add("is-revealed");
            row.addEventListener("animationend", () => row.classList.remove("is-revealed"), { once: true });
        }
        row.hidden = !visible;
    }

    // Status line next to the "Publications" heading, with a Show all button.
    if (statusLine) {
        statusLine.textContent = "";
        if (themeIndex !== null) {
            statusLine.append(`Showing ${THEMES[themeIndex].label} · ${shown} of ${publicationRows.length}`);
            const showAll = document.createElement("button");
            showAll.type = "button";
            showAll.textContent = "Show all";
            showAll.addEventListener("click", () => {
                setFilter(null);
                // Return keyboard focus to the theme button that was on.
                themeButtons[themeIndex].focus({ preventScroll: true });
            });
            statusLine.append(showAll);
        }
    }

    refreshDots();
}


/* ==========================================================================
   3. Dot field
   ========================================================================== */

if (hero && canvas) {
    const ctx = canvas.getContext("2d");

    // Colours as [r, g, b] numbers so they can be blended.
    const inkRgb = hexToRgb(rootStyles.getPropertyValue("--ink"));
    const themeColors = THEMES.map((theme) => hexToRgb(rootStyles.getPropertyValue(theme.color)));
    const dotGap = parseFloat(rootStyles.getPropertyValue("--dot-gap")) || 26;

    let dots = [];
    let width = 0;
    let height = 0;
    let pointer = null; // mouse position inside the hero, or null

    // The theme whose dots should cluster: hover wins, otherwise the clicked one.
    const highlighted = () => (previewTheme !== null ? previewTheme : activeTheme);

    // Build (or rebuild) the grid. Runs at the start and when the hero resizes.
    function layout() {
        width = hero.clientWidth;
        height = hero.clientHeight;

        // HIGH-DPI SCREENS: "retina" screens have 2+ real pixels per CSS pixel.
        // Make the canvas that many times bigger, then scale the drawing back
        // down, so dots stay crisp instead of blurry.
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Where the clusters gather: upper right (a bit higher on phones,
        // so the cluster clears the name).
        const wide = width > 700;
        const clusterX = width * (wide ? 0.68 : 0.72);
        const clusterY = height * (wide ? 0.22 : 0.16);

        dots = [];
        const seatsTaken = THEMES.map(() => 0);

        for (let y = dotGap / 2; y < height; y += dotGap) {
            for (let x = dotGap / 2; x < width; x += dotGap) {
                // Randomly assign a theme to this dot.
                const theme = Math.floor(Math.random() * THEMES.length);

                // This dot's seat in its theme's cluster, laid out like
                // sunflower seeds: each seat turns by the "golden angle"
                // (about 137.5°) and steps outward. That packs a round,
                // even cluster with no overlaps.
                const seat = seatsTaken[theme]++;
                const angle = seat * 2.39996;
                const distance = SETTINGS.clusterSpacing * Math.sqrt(seat);

                dots.push({
                    theme,
                    homeX: x,                    // place in the grid
                    homeY: y,
                    clusterX: clusterX + Math.cos(angle) * distance, // place in the cluster
                    clusterY: clusterY + Math.sin(angle) * distance,
                    x,                           // where it's drawn right now
                    y,
                    tint: 0,                     // 0 = ink, 1 = full theme colour
                    alpha: SETTINGS.restAlpha,   // current opacity
                    grow: 0,                     // extra size near the mouse
                });
            }
        }
    }

    // Move every dot one step toward where it should be.
    // Returns true while anything is still moving.
    function update(seconds) {
        const active = highlighted();
        // Share of the remaining distance to cover this frame. Using elapsed
        // time keeps the speed the same on 60 Hz and 120 Hz screens.
        const step = reduceMotion ? 1 : 1 - Math.exp(-SETTINGS.dotEase * seconds);
        let moving = false;

        for (const dot of dots) {
            const inTheme = active !== null && dot.theme === active;

            // 1. Target position: cluster seat or grid home.
            //    With reduced motion, dots never travel; they only change colour.
            let targetX = inTheme && !reduceMotion ? dot.clusterX : dot.homeX;
            let targetY = inTheme && !reduceMotion ? dot.clusterY : dot.homeY;

            // 2. Move away from the mouse pointer, and swell a little near it.
            let targetGrow = 0;
            if (pointer && !reduceMotion) {
                const dx = targetX - pointer.x;
                const dy = targetY - pointer.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 0.01 && dist < SETTINGS.pointerRadius) {
                    // 1 right under the pointer, fading smoothly to 0 at the edge.
                    // (This curve is "smoothstep": no hard ring where the effect stops.)
                    const t = 1 - dist / SETTINGS.pointerRadius;
                    const strength = t * t * (3 - 2 * t);
                    targetX += (dx / dist) * strength * SETTINGS.pointerPush;
                    targetY += (dy / dist) * strength * SETTINGS.pointerPush;
                    targetGrow = strength * SETTINGS.pointerGrow;
                }
            }

            // 3. Target colour and opacity.
            const targetTint = inTheme ? 1 : 0;
            const targetAlpha = inTheme ? 1 : active !== null ? SETTINGS.dimAlpha : SETTINGS.restAlpha;

            // 4. Ease everything toward its target.
            dot.x += (targetX - dot.x) * step;
            dot.y += (targetY - dot.y) * step;
            dot.tint += (targetTint - dot.tint) * step;
            dot.alpha += (targetAlpha - dot.alpha) * step;
            dot.grow += (targetGrow - dot.grow) * step;

            if (
                Math.abs(targetX - dot.x) > 0.1 ||
                Math.abs(targetY - dot.y) > 0.1 ||
                Math.abs(targetAlpha - dot.alpha) > 0.005
            ) {
                moving = true;
            }
        }
        return moving;
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);

        // Two passes: plain dots first, coloured dots second, so the
        // coloured cluster always sits on top.
        for (const colouredPass of [false, true]) {
            for (const dot of dots) {
                if ((dot.tint > 0.01) !== colouredPass) continue;

                // Blend from ink toward the theme colour by `tint`.
                const color = themeColors[dot.theme];
                const r = Math.round(inkRgb[0] + (color[0] - inkRgb[0]) * dot.tint);
                const g = Math.round(inkRgb[1] + (color[1] - inkRgb[1]) * dot.tint);
                const b = Math.round(inkRgb[2] + (color[2] - inkRgb[2]) * dot.tint);
                const radius = SETTINGS.dotRadius
                    + (SETTINGS.clusterDotRadius - SETTINGS.dotRadius) * dot.tint
                    + dot.grow;

                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${dot.alpha.toFixed(3)})`;
                ctx.beginPath();
                ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // ---- Animation loop ----
    // requestAnimationFrame calls us just before the screen refreshes.
    // The loop only runs while dots are moving or the mouse is over the hero,
    // so an idle page uses no CPU.
    let frameRequested = false;
    let lastTime = 0;
    let heroOnScreen = true;

    function requestFrame() {
        if (frameRequested || !heroOnScreen || reduceMotion) return;
        frameRequested = true;
        lastTime = performance.now();
        requestAnimationFrame(tick);
    }

    function tick(now) {
        frameRequested = false;
        // Seconds since the last frame, capped so dots don't jump after a pause.
        const seconds = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;

        const moving = update(seconds);
        draw();

        if ((moving || pointer) && heroOnScreen && !reduceMotion) {
            frameRequested = true;
            requestAnimationFrame(tick);
        }
    }

    // Called whenever the highlighted theme changes.
    // With reduced motion: apply the change in one step and draw once.
    refreshDots = () => {
        if (reduceMotion) {
            update(1);
            draw();
        } else {
            requestFrame();
        }
    };

    // ---- Events ----
    hero.addEventListener("pointermove", (event) => {
        const rect = hero.getBoundingClientRect();
        pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        requestFrame();
    });

    hero.addEventListener("pointerleave", () => {
        pointer = null;
        refreshDots(); // let pushed dots ease back home
    });

    // Rebuild the grid when the hero changes size (window resize, phone
    // rotation). Waiting one frame avoids rebuilding many times while a
    // window is being dragged.
    let resizePending = false;
    new ResizeObserver(() => {
        if (resizePending) return;
        resizePending = true;
        requestAnimationFrame(() => {
            resizePending = false;
            layout();
            update(1); // snap straight into place after a resize
            draw();
        });
    }).observe(hero);

    // Pause the loop while the hero is scrolled out of view.
    new IntersectionObserver((entries) => {
        heroOnScreen = entries[0].isIntersecting;
        if (heroOnScreen) refreshDots();
    }).observe(hero);

    // ---- Start ----
    layout();
    update(1);
    draw();
    // Tell the CSS the live canvas is drawing, so it hides the static fallback.
    root.classList.add("has-field");
}


/* ==========================================================================
   4. Marquee
   ========================================================================== */

if (marquee && marqueeTrack && publicationRows.length) {
    let groupWidth = 0;   // width of one full set of titles
    let offset = 0;       // how far the track is slid left, in px (always ≤ 0)
    let velocity = 0;     // current speed in px/second (negative = moving left)
    let paused = false;   // true while hovered or focused
    let running = false;
    let lastTime = 0;
    let marqueeOnScreen = true;

    // Build one set of titles from the publication list, so the marquee
    // always matches the list. `isCopy` marks the duplicate set used for
    // the seamless loop: screen readers skip it and Tab skips its links.
    function buildGroup(isCopy) {
        const group = document.createElement("div");
        group.className = "marquee-group";
        if (isCopy) group.setAttribute("aria-hidden", "true");

        for (const row of publicationRows) {
            const source = row.querySelector("a");
            const title = row.querySelector(".title");
            if (!source || !title) continue;

            const link = document.createElement("a");
            link.className = "marquee-item";
            link.href = source.href;
            link.textContent = title.textContent.trim();
            if (isCopy) link.tabIndex = -1;

            group.append(link);

            // The theme's coloured dot between this title and the next.
            const themeIndex = themeForRow(row);
            if (themeIndex !== null) {
                const dot = document.createElement("span");
                dot.className = "marquee-dots";
                dot.setAttribute("aria-hidden", "true");
                dot.append(makeSwatch(themeIndex));
                group.append(dot);
            }
        }
        return group;
    }

    function buildMarquee() {
        marqueeTrack.textContent = "";
        marqueeTrack.style.transform = "";
        offset = 0;
        marqueeTrack.append(buildGroup(false));
        // Reduced motion: one set only, scrolled sideways by hand (see CSS).
        if (!reduceMotion) marqueeTrack.append(buildGroup(true));
        measure();
    }

    function measure() {
        const first = marqueeTrack.firstElementChild;
        groupWidth = first ? first.getBoundingClientRect().width : 0;
    }

    function tick(now) {
        const seconds = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;

        // Ease the speed toward its target, so pausing is a quick glide to a
        // stop rather than a hard freeze. Negative = moving left.
        const target = paused ? 0 : -SETTINGS.marqueeSpeed;
        velocity += (target - velocity) * (1 - Math.exp(-SETTINGS.marqueeEase * seconds));

        offset += velocity * seconds;

        // The seamless loop: keep offset between -groupWidth and 0.
        // Jumping by exactly one set's width looks like nothing happened.
        if (groupWidth > 0) {
            while (offset <= -groupWidth) offset += groupWidth;
            while (offset > 0) offset -= groupWidth;
        }

        marqueeTrack.style.transform = `translate3d(${offset}px, 0, 0)`;

        if (marqueeOnScreen && !reduceMotion) {
            requestAnimationFrame(tick);
        } else {
            running = false;
        }
    }

    function start() {
        if (running || reduceMotion || !marqueeOnScreen) return;
        running = true;
        lastTime = performance.now();
        requestAnimationFrame(tick);
    }

    // Pause on hover…
    marquee.addEventListener("pointerenter", () => { paused = true; });
    marquee.addEventListener("pointerleave", () => { paused = marquee.contains(document.activeElement); });

    // …and on keyboard focus. When a title gets focus, slide it into view
    // (the strip hides overflow, so it could otherwise be off-screen).
    marquee.addEventListener("focusin", (event) => {
        paused = true;
        if (reduceMotion) return;
        marquee.scrollLeft = 0; // undo the browser's own attempt to reveal it
        offset = Math.min(0, -(event.target.offsetLeft - 24));
        velocity = 0;
        marqueeTrack.style.transform = `translate3d(${offset}px, 0, 0)`;
    });
    marquee.addEventListener("focusout", (event) => {
        if (!marquee.contains(event.relatedTarget)) paused = marquee.matches(":hover");
    });

    // Moving an element in the page doesn't fire "pointerleave" or
    // "focusout", so after docking we re-check whether it should be paused.
    resyncMarqueePause = () => {
        paused = marquee.matches(":hover") || marquee.contains(document.activeElement);
    };

    // Used when docking: the strip's left edge moves, so we slide the titles
    // the same amount the other way and they stay put on screen.
    shiftMarquee = (px) => {
        if (reduceMotion) return;
        offset += px;
        if (groupWidth > 0) {
            while (offset <= -groupWidth) offset += groupWidth;
            while (offset > 0) offset -= groupWidth;
        }
        marqueeTrack.style.transform = `translate3d(${offset}px, 0, 0)`;
    };

    // Only animate while the strip is on screen.
    new IntersectionObserver((entries) => {
        marqueeOnScreen = entries[0].isIntersecting;
        if (marqueeOnScreen) start();
    }).observe(marquee);

    // Re-measure when fonts finish loading or the window resizes,
    // because the titles' width changes.
    new ResizeObserver(measure).observe(marqueeTrack);
    if (document.fonts) document.fonts.ready.then(measure);

    // Rebuild if the visitor changes their motion setting while here.
    reducedMotionQuery.addEventListener("change", () => {
        buildMarquee();
        start();
    });

    buildMarquee();
    velocity = -SETTINGS.marqueeSpeed; // start already moving left
    start();
}


/* ==========================================================================
   5. Pinned name
   ========================================================================== */

if (nameEl && heroInner) {
    let bigSize = 0;   // the name's starting font size, in px
    let startY = 0;    // where the name starts (distance from the top of the screen)
    let endY = 0;      // where it ends up inside the bar
    let endScale = 1;  // how much it's scaled down at the end
    let framePending = false;

    // Work out the start and end positions. Runs at load and on resize.
    function measureName() {
        nameEl.style.transform = "none";
        bigSize = parseFloat(getComputedStyle(nameEl).fontSize);
        endScale = SETTINGS.pinnedNameSize / bigSize;

        const nameHeight = nameEl.offsetHeight;
        const barHeight = pinBg ? pinBg.offsetHeight : 58;

        // Start: vertically centred in the dotted space above the intro text.
        const introTop = heroInner.getBoundingClientRect().top + window.scrollY;
        startY = Math.max(barHeight + 16, (introTop - nameHeight) / 2);

        // End: vertically centred in the bar.
        endY = (barHeight - nameHeight * endScale) / 2;

        placeName();
    }

    // Position the name for the current scroll position.
    function placeName() {
        framePending = false;
        // progress: 0 at the top of the page, 1 once we've scrolled far enough.
        const distance = window.innerHeight * SETTINGS.shrinkDistance;
        const progress = Math.min(1, Math.max(0, window.scrollY / distance));
        // Ease-out cubic: most of the shrinking happens early, then it settles.
        const eased = 1 - Math.pow(1 - progress, 3);

        const scale = 1 + (endScale - 1) * eased;
        const y = startY + (endY - startY) * eased;
        nameEl.style.transform = `translateY(${y}px) scale(${scale})`;

        // Show the bar's background and links once the name is nearly small.
        root.classList.toggle("is-pinned", eased > 0.85);
    }

    // Scroll events can fire many times per frame; only update once per frame.
    window.addEventListener("scroll", () => {
        if (framePending) return;
        framePending = true;
        requestAnimationFrame(placeName);
    }, { passive: true });

    window.addEventListener("resize", measureName);
    if (document.fonts) document.fonts.ready.then(measureName);
    measureName();
}


/* ==========================================================================
   6. Marquee docks into the header

   When the marquee scrolls up and reaches the pinned bar, it slides up INTO
   the bar and keeps running in the space between the small name (left) and
   the links (right). Scroll back up and it drops back into the hero.

   It's the SAME element that moves (not a copy), so the titles carry on
   from where they were. Two tricks hide the move:
     - the titles are shifted sideways by exactly how far the strip's left
       edge moved, so they don't jump horizontally;
     - a short slide animation carries the strip up (or down) the distance
       it just moved, so it travels instead of teleporting.
   ========================================================================== */

const pinLayer = document.querySelector(".pin");
const pinNav = document.querySelector(".pin-nav");

if (marquee && pinLayer && hero && nameEl && pinNav) {
    // An empty box that keeps the marquee's place in the hero, so the page
    // doesn't jump up by the strip's height when the strip leaves.
    const spot = document.createElement("div");
    spot.className = "marquee-spot";
    marquee.before(spot);
    spot.append(marquee);

    const GAP = 24;           // space between the strip and the name / links, in px
    const MIN_WIDTH = 180;    // narrower than this (phones) and it doesn't dock
    let docked = false;
    let dockLeft = 0;         // where the docked strip starts, from the left edge
    let framePending = false;

    // Lock the spot's height to the strip's normal (undocked) height.
    function measureSpot() {
        if (!docked) spot.style.height = `${marquee.offsetHeight}px`;
    }

    // The free space in the bar: from the name's right edge to the links' left edge.
    function freeSpace() {
        const left = nameEl.getBoundingClientRect().right + GAP;
        const right = pinNav.getBoundingClientRect().left - GAP;
        return { left, right, width: right - left };
    }

    // Move the strip between the hero and the bar, keeping keyboard focus
    // if it was on one of its links (moving an element normally drops focus).
    function moveMarquee(newParent) {
        const focused = marquee.contains(document.activeElement) ? document.activeElement : null;
        newParent.append(marquee);
        if (focused) focused.focus({ preventScroll: true });
        resyncMarqueePause();
    }

    // Slide from `fromY` pixels away back to where it now is. Uses the Web
    // Animations API (element.animate), because a CSS transition doesn't run
    // on an element that was just moved. Strong ease-out: fast start, soft landing.
    function slideIn(fromY, duration) {
        if (reduceMotion) return;
        marquee.animate(
            [{ transform: `translateY(${fromY}px)` }, { transform: "translateY(0)" }],
            { duration, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }
        );
    }

    function dock(space) {
        const spotTop = spot.getBoundingClientRect().top;
        docked = true;
        dockLeft = space.left;

        // Size the strip to the free space in the bar.
        marquee.style.left = `${space.left}px`;
        marquee.style.width = `${space.width}px`;

        moveMarquee(pinLayer);
        root.classList.add("is-marquee-docked");
        shiftMarquee(-dockLeft);   // titles stay put horizontally
        slideIn(spotTop, 320);     // travels up from where it was
    }

    function undock() {
        docked = false;
        marquee.style.left = "";
        marquee.style.width = "";

        moveMarquee(spot);
        root.classList.remove("is-marquee-docked");
        shiftMarquee(dockLeft);    // undo the sideways shift
        // It was at the top of the screen; now it's back at its spot.
        slideIn(-spot.getBoundingClientRect().top, 240); // exit a little faster
    }

    function updateDock() {
        framePending = false;
        const barHeight = pinBg ? pinBg.offsetHeight : 58;
        const space = freeSpace();

        // Dock when: the bar is showing, the strip has reached it, and there's
        // room for it in the bar (on phones there isn't, so it just scrolls away).
        const shouldDock =
            root.classList.contains("is-pinned") &&
            spot.getBoundingClientRect().top <= barHeight &&
            space.width >= MIN_WIDTH;

        if (shouldDock && !docked) dock(space);
        else if (!shouldDock && docked) undock();
    }

    window.addEventListener("scroll", () => {
        if (framePending) return;
        framePending = true;
        requestAnimationFrame(updateDock);
    }, { passive: true });

    // On resize: re-measure, and if still docked, refit the strip to the new space.
    window.addEventListener("resize", () => {
        measureSpot();
        if (docked) {
            const space = freeSpace();
            if (space.width >= MIN_WIDTH) {
                shiftMarquee(dockLeft - space.left);
                dockLeft = space.left;
                marquee.style.left = `${space.left}px`;
                marquee.style.width = `${space.width}px`;
            }
        }
        updateDock();
    });
    if (document.fonts) document.fonts.ready.then(measureSpot);

    measureSpot();
    updateDock();
}


/* ==========================================================================
   Start
   ========================================================================== */

setFilter(null);


/* ==========================================================================
   Small helpers
   ========================================================================== */

// "#B0302A" -> [176, 48, 42]. Also accepts the short form "#B32".
function hexToRgb(hex) {
    let value = hex.trim().replace("#", "");
    if (value.length === 3) value = value.split("").map((c) => c + c).join("");
    const number = parseInt(value, 16);
    return [(number >> 16) & 255, (number >> 8) & 255, number & 255];
}

// Compare two links while ignoring a trailing slash.
function sameUrl(a, b) {
    const clean = (url) => new URL(url, location.href).href.replace(/\/$/, "");
    return clean(a) === clean(b);
}
