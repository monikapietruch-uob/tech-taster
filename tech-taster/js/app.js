/*
  Tech taster page script (version 1)
  -----------------------------------
  This file connects the engine to the page. It:
    - draws the world and the robot;
    - listens to the buttons and the code box;
    - plays the robot's moves one at a time and reports the result;
    - remembers progress in this browser only (nothing is sent anywhere).

  The rules of the robot's world live in engine.js. The tasks live in tasks.js.
*/
(function () {
  "use strict";

  const engine = window.TasterEngine;
  const tasks = window.TasterTasks;
  if (!engine || !tasks) {
    return; // the other two scripts did not load, so there is nothing to run
  }

  const STORE_KEY = "tech-taster-v1";
  const SVG = "http://www.w3.org/2000/svg";
  const CELL = 80; // size of one square in the drawing
  const PAD = 6; // space around the squares
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
    finish: document.getElementById("finish"),
    finishTitle: document.getElementById("finish-title"),
    again: document.getElementById("again")
  };

  let progress = loadProgress(); // which task is open, the code for each task, which are done
  let robotPicture = null; // the robot's drawing in the current world
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

  /* ---------- Drawing the world ---------- */

  // Makes one SVG shape with the attributes given.
  function shape(name, attributes) {
    const node = document.createElementNS(SVG, name);
    Object.keys(attributes).forEach(function (key) {
      node.setAttribute(key, attributes[key]);
    });
    return node;
  }

  // The middle of square number `index`, measured in drawing units.
  function centre(index) {
    return PAD + index * CELL + CELL / 2;
  }

  function drawWorld(task) {
    const width = task.cols * CELL + PAD * 2;
    const height = task.rows * CELL + PAD * 2;
    const svg = shape("svg", { viewBox: "0 0 " + width + " " + height, "aria-hidden": "true", focusable: "false" });
    svg.style.maxWidth = Math.round(width * 1.25) + "px";

    for (let row = 0; row < task.rows; row++) {
      for (let col = 0; col < task.cols; col++) {
        const isGoal = row === task.flag.row && col === task.flag.col;
        svg.appendChild(
          shape("rect", {
            x: PAD + col * CELL,
            y: PAD + row * CELL,
            width: CELL,
            height: CELL,
            class: isGoal ? "tile tile-goal" : "tile"
          })
        );
      }
    }

    task.rocks.forEach(function (rock) {
      const group = shape("g", { transform: "translate(" + centre(rock.col) + " " + centre(rock.row) + ")" });
      group.appendChild(shape("polygon", { class: "rock", points: "-25,16 -19,-9 -3,-25 18,-17 27,5 13,25 -12,25" }));
      svg.appendChild(group);
    });

    const flag = shape("g", { transform: "translate(" + centre(task.flag.col) + " " + centre(task.flag.row) + ")" });
    flag.appendChild(shape("line", { class: "flag-pole", x1: -12, y1: 26, x2: -12, y2: -26 }));
    flag.appendChild(shape("path", { class: "flag-cloth", d: "M -12 -26 L 22 -15 L -12 -4 Z" }));
    svg.appendChild(flag);

    // The robot is drawn facing right, around the point (0, 0). The page then
    // slides and turns the whole group with a CSS transform (see placeRobot).
    robotPicture = shape("g", { class: "robot" });
    robotPicture.appendChild(shape("rect", { class: "robot-wheel", x: -17, y: -31, width: 34, height: 9, rx: 3 }));
    robotPicture.appendChild(shape("rect", { class: "robot-wheel", x: -17, y: 22, width: 34, height: 9, rx: 3 }));
    robotPicture.appendChild(shape("rect", { class: "robot-body", x: -25, y: -25, width: 50, height: 50, rx: 12 }));
    robotPicture.appendChild(shape("path", { class: "robot-nose", d: "M 3 -12 L 19 0 L 3 12 Z" }));
    svg.appendChild(robotPicture);

    page.world.replaceChildren(svg);
    jumpRobot(engine.startState(task));
  }

  // Slides the robot to a square. The CSS transition makes it glide.
  function placeRobot(state) {
    robotPicture.style.transform =
      "translate(" + centre(state.col) + "px, " + centre(state.row) + "px) rotate(" + angle + "deg)";
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
    report(outcome);
    setRunning(false);
  }

  // Turns the engine's outcome into words on the page.
  function report(outcome) {
    if (outcome.outcome === "complete") {
      progress.done[progress.current] = true;
      saveProgress();
      renderSteps();
      page.world.classList.add("is-complete");
      showResult("complete", "Task complete.", "The robot reached the flag in " + plural(outcome.used, "command") + ".");
      const isLast = progress.current === tasks.length - 1;
      page.next.textContent = isLast ? "See what you did" : "Go to task " + (progress.current + 2);
      page.next.hidden = false;
      return;
    }

    if (outcome.outcome === "short") {
      const detail = outcome.passedFlag
        ? "The robot reached the flag and then moved off it. Remove the extra commands and run it again."
        : "The robot stopped " + plural(outcome.distance, "square") + " from the flag. Change the program and run it again.";
      showResult("short", "Not there yet.", detail);
      return;
    }

    const why =
      outcome.reason === "rock"
        ? "A rock is in the way. Change the program so the robot goes round it."
        : "The robot cannot leave the world. Check which way it is facing.";
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
