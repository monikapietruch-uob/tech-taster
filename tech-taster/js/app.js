/*
  Tech taster page script (version 2)
  -----------------------------------
  This file connects the engine to the page. It:
    - draws the floor, the robot, the cup and the plant;
    - listens to the buttons and the code box;
    - plays the robot's moves one at a time and reports the result;
    - remembers progress in this browser only (nothing is sent anywhere).

  The rules of the robot's world live in engine.js. The tasks and the story
  live in tasks.js. The colours live in css/site.css and js/look.js.
*/
(function () {
  "use strict";

  const engine = window.TasterEngine;
  const tasks = window.TasterTasks;
  if (!engine || !tasks) {
    return; // the other two scripts did not load, so there is nothing to run
  }

  const STORE_KEY = "tech-taster-v2";
  const SVG = "http://www.w3.org/2000/svg";
  const CELL = 80; // size of one square in the drawing
  const PAD = 6; // space around the squares
  const TOP = 16; // extra space above the top row, so the steam has room to rise
  const START_ANGLES = { east: 0, south: 90, west: 180, north: -90 };

  // People who ask their device for less motion get short, plain steps.
  const calm = Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const STEP_MS = calm ? 160 : 460;

  const page = {
    steps: document.getElementById("steps"),
    title: document.getElementById("task-title"),
    intro: document.getElementById("task-intro"),
    world: document.getElementById("world"),
    description: document.getElementById("world-description"),
    result: document.getElementById("result"),
    resultTitle: document.getElementById("result-title"),
    resultDetail: document.getElementById("result-detail"),
    trace: document.getElementById("trace"),
    next: document.getElementById("next"),
    code: document.getElementById("code"),
    adders: document.getElementById("adder-buttons"),
    removeLast: document.getElementById("remove-last"),
    note: document.getElementById("note"),
    run: document.getElementById("run"),
    reset: document.getElementById("reset"),
    hint: document.getElementById("hint"),
    hintText: document.getElementById("hint-text"),
    wordTerm: document.getElementById("word-term"),
    wordMeaning: document.getElementById("word-meaning"),
    realLife: document.getElementById("real-life"),
    finish: document.getElementById("finish"),
    finishTitle: document.getElementById("finish-title"),
    again: document.getElementById("again")
  };

  let progress = loadProgress(); // which task is open, the code for each task, which are done
  let robotPicture = null; // the robot's drawing on the current floor
  let angle = 0; // how far the robot's drawing is turned, in degrees
  let running = false; // true while the robot is moving
  let hintsShown = 0;

  /* ---------- Remembering progress (this browser only) ---------- */

  function freshProgress() {
    return {
      current: 0,
      code: tasks.map(function (task) {
        return task.starter.join("\n");
      }),
      done: tasks.map(function () {
        return false;
      })
    };
  }

  function loadProgress() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORE_KEY));
      const usable =
        saved &&
        Array.isArray(saved.code) &&
        saved.code.length === tasks.length &&
        Array.isArray(saved.done) &&
        saved.done.length === tasks.length &&
        Number.isInteger(saved.current) &&
        saved.current >= 0 &&
        saved.current < tasks.length;
      if (usable) {
        return {
          current: saved.current,
          code: saved.code.map(String),
          done: saved.done.map(Boolean)
        };
      }
    } catch (error) {
      // Storage is switched off, full or empty. The taster still works without it.
    }
    return freshProgress();
  }

  function saveProgress() {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(progress));
    } catch (error) {
      // Nothing to do: progress simply will not be remembered.
    }
  }

  /* ---------- Drawing ---------- */

  // Makes one SVG shape with the attributes given.
  function shape(name, attributes) {
    const node = document.createElementNS(SVG, name);
    Object.keys(attributes).forEach(function (key) {
      node.setAttribute(key, attributes[key]);
    });
    return node;
  }

  // The middle of a square, measured in drawing units.
  function centreX(col) {
    return PAD + col * CELL + CELL / 2;
  }

  function centreY(row) {
    return TOP + row * CELL + CELL / 2;
  }

  // The small pictures. Each one is drawn around the point (0, 0), so the same
  // drawing can be put on any square. The colours come from css/site.css.

  function drawCup(group) {
    group.appendChild(shape("rect", { class: "cup-saucer", x: -22, y: 19, width: 44, height: 5, rx: 2.5 }));
    group.appendChild(shape("path", { class: "cup-handle", d: "M 16 -3 C 27 -3 27 11 14.4 11" }));
    group.appendChild(
      shape("path", { class: "cup-body", d: "M -16 -8 H 16 L 13 15 Q 12.6 18 9.6 18 H -9.6 Q -12.6 18 -13 15 Z" })
    );
    group.appendChild(shape("path", { class: "cup-stripe", d: "M -15.2 -2 H 15.2 L 14.7 2 H -14.7 Z" }));
    group.appendChild(shape("path", { class: "cup-stripe", d: "M -14.2 6 H 14.2 L 13.7 10 H -13.7 Z" }));
  }

  function drawPlant(group) {
    const leaf = "M 0 3 C -9 -7 -8 -22 0 -29 C 8 -22 9 -7 0 3 Z";
    group.appendChild(shape("path", { class: "plant-leaf", d: leaf, transform: "rotate(-42 0 3)" }));
    group.appendChild(shape("path", { class: "plant-leaf", d: leaf, transform: "rotate(42 0 3)" }));
    group.appendChild(shape("path", { class: "plant-leaf", d: leaf }));
    group.appendChild(shape("path", { class: "plant-pot", d: "M -13 7 H 13 L 9.5 27 H -9.5 Z" }));
    group.appendChild(shape("rect", { class: "plant-pot", x: -15, y: 2, width: 30, height: 7, rx: 2 }));
  }

  function drawFlag(group) {
    group.appendChild(shape("line", { class: "flag-pole", x1: -12, y1: 26, x2: -12, y2: -26 }));
    group.appendChild(shape("path", { class: "flag-cloth", d: "M -12 -26 L 22 -15 L -12 -4 Z" }));
  }

  function drawRock(group) {
    group.appendChild(shape("polygon", { class: "rock", points: "-25,16 -19,-9 -3,-25 18,-17 27,5 13,25 -12,25" }));
  }

  // Which drawing goes with which name in tasks.js.
  const PICTURES = { cup: drawCup, plant: drawPlant, flag: drawFlag, rock: drawRock };

  function drawWorld(task) {
    const width = task.cols * CELL + PAD * 2;
    const height = task.rows * CELL + TOP + PAD;
    const svg = shape("svg", { viewBox: "0 0 " + width + " " + height, "aria-hidden": "true", focusable: "false" });
    svg.style.maxWidth = Math.round(width * 1.25) + "px";

    for (let row = 0; row < task.rows; row++) {
      for (let col = 0; col < task.cols; col++) {
        const isGoal = row === task.goal.row && col === task.goal.col;
        svg.appendChild(
          shape("rect", {
            x: PAD + col * CELL,
            y: TOP + row * CELL,
            width: CELL,
            height: CELL,
            class: isGoal ? "tile tile-goal" : "tile"
          })
        );
      }
    }

    task.blocks.forEach(function (block) {
      const group = shape("g", { transform: "translate(" + centreX(block.col) + " " + centreY(block.row) + ")" });
      (PICTURES[block.name] || drawRock)(group);
      svg.appendChild(group);
    });

    // The goal: a ring that marks the square, with the cup inside it.
    const goal = shape("g", { transform: "translate(" + centreX(task.goal.col) + " " + centreY(task.goal.row) + ")" });
    goal.appendChild(shape("circle", { class: "goal-ring", r: 34 }));
    const goalPicture = shape("g", { transform: "translate(-2 -6)" });
    (PICTURES[task.goal.name] || drawFlag)(goalPicture);
    goal.appendChild(goalPicture);
    svg.appendChild(goal);

    // The robot is drawn facing right, around the point (0, 0). The page then
    // slides and turns the whole group with a CSS transform (see placeRobot).
    // Seen from above, it is a tea trolley: two wheels, a pot lid and a nose.
    robotPicture = shape("g", { class: "robot" });
    robotPicture.appendChild(shape("rect", { class: "robot-wheel", x: -17, y: -31, width: 34, height: 9, rx: 3 }));
    robotPicture.appendChild(shape("rect", { class: "robot-wheel", x: -17, y: 22, width: 34, height: 9, rx: 3 }));
    robotPicture.appendChild(shape("rect", { class: "robot-body", x: -25, y: -25, width: 50, height: 50, rx: 12 }));
    robotPicture.appendChild(shape("circle", { class: "robot-lid", cx: -7, cy: 0, r: 10 }));
    robotPicture.appendChild(shape("circle", { class: "robot-knob", cx: -7, cy: 0, r: 3.2 }));
    robotPicture.appendChild(shape("path", { class: "robot-nose", d: "M 8 -10 L 21 0 L 8 10 Z" }));
    svg.appendChild(robotPicture);

    // Steam rises above the goal when the task is complete. It is added last,
    // so it is drawn on top of the robot. The stylesheet hides it until then.
    const steam = shape("g", {
      class: "steam",
      transform: "translate(" + centreX(task.goal.col) + " " + (centreY(task.goal.row) - 28) + ")"
    });
    ["M -11 0 c -5 -5 5 -10 0 -15", "M 0 -3 c -5 -5 5 -10 0 -15", "M 11 0 c -5 -5 5 -10 0 -15"].forEach(function (d) {
      steam.appendChild(shape("path", { d: d }));
    });
    svg.appendChild(steam);

    page.world.replaceChildren(svg);
    jumpRobot(engine.startState(task));
  }

  // Slides the robot to a square. The CSS transition makes it glide.
  function placeRobot(state) {
    robotPicture.style.transform =
      "translate(" + centreX(state.col) + "px, " + centreY(state.row) + "px) rotate(" + angle + "deg)";
  }

  // Puts the robot on a square straight away, with no glide (used when starting again).
  function jumpRobot(state) {
    robotPicture.classList.add("is-jumping");
    angle = START_ANGLES[state.dir];
    placeRobot(state);
    void robotPicture.getBoundingClientRect(); // make the browser apply the jump now
    robotPicture.classList.remove("is-jumping");
  }

  /* ---------- Showing a task ---------- */

  function renderSteps() {
    const items = tasks.map(function (task, index) {
      const done = progress.done[index];
      const button = document.createElement("button");
      button.type = "button";
      button.className = done ? "step is-done" : "step";
      if (index === progress.current) {
        button.setAttribute("aria-current", "step");
      }

      const number = document.createElement("span");
      number.className = "step-number";
      number.setAttribute("aria-hidden", "true");
      number.textContent = done ? "✓" : String(index + 1);

      const spoken = document.createElement("span");
      spoken.className = "visually-hidden";
      spoken.textContent = "Task " + (index + 1) + (done ? ", done: " : ": ");

      const label = document.createElement("span");
      label.className = "step-label";
      label.textContent = task.title;

      button.append(number, spoken, label);
      button.addEventListener("click", function () {
        openTask(index, "step");
      });

      const item = document.createElement("li");
      item.appendChild(button);
      return item;
    });
    page.steps.replaceChildren.apply(page.steps, items);
  }

  function renderAdders(task) {
    const buttons = task.buttons.map(function (name) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button button-command";
      button.textContent = "Add " + name + "()";
      button.addEventListener("click", function () {
        addCommand(name);
      });
      return button;
    });
    page.adders.replaceChildren.apply(page.adders, buttons);
  }

  function showTask() {
    const task = tasks[progress.current];
    hintsShown = 0;
    renderSteps();
    page.title.textContent = "Task " + (progress.current + 1) + " of " + tasks.length + ": " + task.title;
    page.intro.textContent = task.intro;
    page.code.value = progress.code[progress.current];
    page.wordTerm.textContent = task.word.term;
    page.wordMeaning.textContent = task.word.meaning;
    renderAdders(task);
    drawWorld(task);
    showReady(task);
  }

  // The state before anything has been run.
  function showReady(task) {
    page.world.classList.remove("is-complete");
    page.description.textContent = engine.describe(task, engine.startState(task));
    showResult("ready", "Ready.", "Press Run to see what the program does.");
    page.trace.textContent = "";
    page.next.hidden = true;
    page.hintText.hidden = true;
    page.hintText.textContent = "";
    page.hint.textContent = "Show a hint";
    page.realLife.hidden = true;
    page.realLife.textContent = "";
    page.note.textContent = "";
  }

  function showResult(kind, title, detail) {
    page.result.className = "result is-" + kind;
    page.resultTitle.textContent = title;
    page.resultDetail.textContent = detail;
  }

  function openTask(index, cameFrom) {
    if (running) {
      return;
    }
    progress.current = index;
    saveProgress();
    showTask();
    if (cameFrom === "step") {
      // The step buttons were rebuilt, so put the keyboard focus back on the open one.
      const open = page.steps.querySelector('[aria-current="step"]');
      if (open) {
        open.focus();
      }
    } else {
      page.title.focus();
      page.title.scrollIntoView({ block: "start", behavior: calm ? "auto" : "smooth" });
    }
  }

  /* ---------- Changing the program ---------- */

  function codeChanged() {
    progress.code[progress.current] = page.code.value;
    saveProgress();
  }

  function countLines(text) {
    return text.split("\n").filter(function (line) {
      return line.trim() !== "";
    }).length;
  }

  function addCommand(name) {
    if (running) {
      return;
    }
    const text = page.code.value.replace(/\s+$/, "");
    page.code.value = (text ? text + "\n" : "") + name + "()";
    page.code.scrollTop = page.code.scrollHeight;
    codeChanged();
    page.note.textContent = "Added " + name + "(). The program has " + countLines(page.code.value) + " lines.";
  }

  function removeLastLine() {
    if (running) {
      return;
    }
    const lines = page.code.value.replace(/\s+$/, "").split("\n");
    const removed = lines.pop();
    page.code.value = lines.join("\n");
    codeChanged();
    page.note.textContent = removed ? "Removed the last line: " + removed.trim() : "The program is already empty.";
  }

  function resetTask() {
    if (running) {
      return;
    }
    const task = tasks[progress.current];
    progress.code[progress.current] = task.starter.join("\n");
    saveProgress();
    page.code.value = progress.code[progress.current];
    hintsShown = 0;
    jumpRobot(engine.startState(task));
    showReady(task);
  }

  function showHint() {
    const task = tasks[progress.current];
    if (hintsShown >= task.hints.length) {
      hintsShown = 0; // start the hints again from the first one
    }
    hintsShown += 1;
    page.hintText.hidden = false;
    page.hintText.textContent = "Hint " + hintsShown + " of " + task.hints.length + ": " + task.hints[hintsShown - 1];
    page.hint.textContent = hintsShown < task.hints.length ? "Show another hint" : "Show the hints again";
  }

  /* ---------- Running the program ---------- */

  function wait(milliseconds) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, milliseconds);
    });
  }

  function setRunning(isRunning) {
    running = isRunning;
    // aria-disabled keeps the keyboard focus on the button, which `disabled` would drop.
    page.run.setAttribute("aria-disabled", String(isRunning));
    page.code.readOnly = isRunning;
  }

  function plural(count, word) {
    return count + " " + word + (count === 1 ? "" : "s");
  }

  async function runProgram() {
    if (running) {
      return;
    }
    const task = tasks[progress.current];
    const parsed = engine.parse(page.code.value);
    if (!parsed.ok) {
      showResult("stopped", "The robot cannot read the program.", parsed.message);
      return;
    }

    const outcome = engine.run(task, parsed.commands);
    setRunning(true);
    page.next.hidden = true;
    page.realLife.hidden = true;
    page.world.classList.remove("is-complete");
    page.world.scrollIntoView({ block: "nearest", behavior: calm ? "auto" : "smooth" });
    jumpRobot(engine.startState(task));
    showResult("running", "Running the program.", "");
    await wait(STEP_MS * 0.6);

    for (const frame of outcome.frames) {
      page.trace.textContent = "Line " + frame.line + ": " + frame.name + "()";
      if (frame.name === "turn_left") {
        angle -= 90;
      }
      if (frame.name === "turn_right") {
        angle += 90;
      }
      placeRobot(frame.state);
      await wait(STEP_MS);
    }

    page.trace.textContent = "";
    page.description.textContent = engine.describe(task, outcome.state);
    report(task, outcome);
    setRunning(false);
  }

  // Turns the engine's outcome into words on the page. The names ("cup",
  // "plant") and the cheerful sentences come from the task, not from here.
  function report(task, outcome) {
    const goalName = engine.nameOf(task.goal, "goal");

    if (outcome.outcome === "complete") {
      progress.done[progress.current] = true;
      saveProgress();
      renderSteps();
      page.world.classList.add("is-complete");
      showResult(
        "complete",
        "Task complete.",
        (task.done ? task.done + " " : "") +
          "The robot reached the " + goalName + " in " + plural(outcome.used, "command") + "."
      );
      if (task.realLife) {
        page.realLife.textContent = "In real life: " + task.realLife;
        page.realLife.hidden = false;
      }
      const isLast = progress.current === tasks.length - 1;
      page.next.textContent = isLast ? "See what you did" : "Go to task " + (progress.current + 2);
      page.next.hidden = false;
      return;
    }

    if (outcome.outcome === "short") {
      const detail = outcome.passedGoal
        ? "The robot reached the " + goalName + " and then moved off it. Remove the extra commands and run it again."
        : "The robot stopped " + plural(outcome.distance, "square") + " from the " + goalName +
          ". Change the program and run it again.";
      showResult("short", "Not there yet.", detail);
      return;
    }

    const why =
      outcome.reason === "block"
        ? "A " + engine.nameOf(outcome.block, "block") + " is in the way. Change the program so the robot goes round it."
        : "The robot cannot go through the wall. Check which way it is facing.";
    showResult("stopped", "The program stopped at line " + outcome.line + ".", why);
  }

  /* ---------- Finishing ---------- */

  function goNext() {
    if (progress.current < tasks.length - 1) {
      openTask(progress.current + 1, "next");
    } else {
      showFinish(true);
    }
  }

  function showFinish(moveFocus) {
    page.finish.hidden = false;
    if (moveFocus) {
      page.finishTitle.focus();
      page.finishTitle.scrollIntoView({ block: "start", behavior: calm ? "auto" : "smooth" });
    }
  }

  function startOver() {
    if (running) {
      return;
    }
    progress = freshProgress();
    saveProgress();
    page.finish.hidden = true;
    openTask(0, "next");
  }

  /* ---------- Start ---------- */

  page.run.addEventListener("click", runProgram);
  page.reset.addEventListener("click", resetTask);
  page.hint.addEventListener("click", showHint);
  page.next.addEventListener("click", goNext);
  page.removeLast.addEventListener("click", removeLastLine);
  page.again.addEventListener("click", startOver);
  page.code.addEventListener("input", codeChanged);

  showTask();
  if (progress.done.every(Boolean)) {
    showFinish(false);
  }
})();
