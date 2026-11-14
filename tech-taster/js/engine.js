/*
  Tech taster engine (version 2)
  ------------------------------
  This file knows nothing about the web page. It does three jobs:

    1. parse()    reads a program (plain text) and turns it into a list of commands;
    2. run()      moves the robot across a small floor of squares, one command at a time;
    3. describe() says in plain English where everything is.

  It knows nothing about the story either. A task says where the goal is and
  which squares are blocked, and gives them names ("cup", "plant"). The rules
  only use the positions. The names are only used to build sentences.

  Because it never touches the page, it can be tested on its own:
      node tests/engine.test.js
*/
(function (root) {
  "use strict";

  // The four directions, in the order you meet them when you keep turning left.
  const DIRECTIONS = ["east", "north", "west", "south"];

  // How one move() changes the robot's row and column.
  // Rows are counted from the top, so going north makes the row number smaller.
  const MOVES = {
    east: { row: 0, col: 1 },
    north: { row: -1, col: 0 },
    west: { row: 0, col: -1 },
    south: { row: 1, col: 0 }
  };

  // Plain words for the description. "Facing right" is easier than "facing east".
  const FACING_WORDS = { east: "right", north: "up", west: "left", south: "down" };

  const COMMANDS = ["move", "turn_left", "turn_right"];
  const MAX_COMMANDS = 40;

  /* ---------- 1. Reading the program ---------- */

  // Turns the text in the code box into a list such as
  //   [{ name: "move", line: 1 }, { name: "turn_left", line: 2 }]
  // or, if a line is wrong, into { ok: false, line, message }.
  function parse(source) {
    const commands = [];
    const lines = String(source).split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const lineNumber = i + 1;
      const text = lines[i].split("#")[0].trim(); // drop comments and spaces
      if (text === "") {
        continue; // empty lines are fine
      }
      const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*\(\s*\)\s*;?$/.exec(text);
      if (match && COMMANDS.includes(match[1])) {
        commands.push({ name: match[1], line: lineNumber });
      } else {
        return { ok: false, line: lineNumber, message: explainBadLine(text, lineNumber) };
      }
    }

    if (commands.length === 0) {
      return { ok: false, line: 0, message: "The program is empty. Add a command, such as move()." };
    }
    if (commands.length > MAX_COMMANDS) {
      return {
        ok: false,
        line: commands[MAX_COMMANDS].line,
        message: "That is a long program. The robot reads up to " + MAX_COMMANDS + " commands."
      };
    }
    return { ok: true, commands: commands };
  }

  // Writes a helpful sentence about a line the robot cannot read.
  function explainBadLine(text, lineNumber) {
    const shown = text.length > 30 ? text.slice(0, 30) + "…" : text;
    const bare = text.replace(/[\s();]/g, ""); // the word without brackets
    const lower = bare.toLowerCase();
    const start = "Line " + lineNumber + ": ";

    if (COMMANDS.includes(lower)) {
      if (bare !== lower) {
        return start + "use small letters. Write " + lower + "().";
      }
      return start + "add brackets at the end. Write " + lower + "().";
    }

    const guess = guessCommand(lower);
    if (guess) {
      return start + "the robot does not know “" + shown + "”. Did you mean " + guess + "()?";
    }
    return start + "the robot does not know “" + shown + "”. It knows move(), turn_left() and turn_right().";
  }

  // Tries to work out which command a mistyped word was meant to be.
  function guessCommand(word) {
    if (word.includes("left")) return "turn_left";
    if (word.includes("right")) return "turn_right";
    if (word.includes("mov") || ["go", "forward", "step", "walk"].includes(word)) return "move";
    let best = null;
    let bestDistance = 3; // only accept words that are one or two letters away
    for (const command of COMMANDS) {
      const distance = editDistance(word, command);
      if (distance < bestDistance) {
        best = command;
        bestDistance = distance;
      }
    }
    return best;
  }

  // Counts how many single-letter changes turn one word into another.
  function editDistance(a, b) {
    const table = [];
    for (let i = 0; i <= a.length; i++) {
      table.push([i]);
    }
    for (let j = 1; j <= b.length; j++) {
      table[0][j] = j;
    }
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const change = a[i - 1] === b[j - 1] ? 0 : 1;
        table[i][j] = Math.min(table[i - 1][j] + 1, table[i][j - 1] + 1, table[i - 1][j - 1] + change);
      }
    }
    return table[a.length][b.length];
  }

  /* ---------- 2. Moving the robot ---------- */

  function startState(task) {
    return { row: task.robot.row, col: task.robot.col, dir: task.robot.dir };
  }

  function isInside(task, row, col) {
    return row >= 0 && row < task.rows && col >= 0 && col < task.cols;
  }

  // The thing that blocks a square, or null if the square is free.
  function blockAt(task, row, col) {
    const found = task.blocks.find(function (block) {
      return block.row === row && block.col === col;
    });
    return found || null;
  }

  function atGoal(task, state) {
    return state.row === task.goal.row && state.col === task.goal.col;
  }

  // How many squares the robot is from the goal (counting along rows and columns).
  function distanceToGoal(task, state) {
    return Math.abs(task.goal.row - state.row) + Math.abs(task.goal.col - state.col);
  }

  // Does one command. Returns the new state, or says why the robot cannot do it.
  function apply(task, state, name) {
    const facing = DIRECTIONS.indexOf(state.dir);
    if (name === "turn_left") {
      return { ok: true, state: { row: state.row, col: state.col, dir: DIRECTIONS[(facing + 1) % 4] } };
    }
    if (name === "turn_right") {
      return { ok: true, state: { row: state.row, col: state.col, dir: DIRECTIONS[(facing + 3) % 4] } };
    }
    const change = MOVES[state.dir];
    const row = state.row + change.row;
    const col = state.col + change.col;
    if (!isInside(task, row, col)) {
      return { ok: false, reason: "edge" };
    }
    const block = blockAt(task, row, col);
    if (block) {
      return { ok: false, reason: "block", block: block };
    }
    return { ok: true, state: { row: row, col: col, dir: state.dir } };
  }

  // Runs a whole list of commands. The result has:
  //   outcome  "complete" (on the goal), "short" (not there yet) or "stopped" (hit something)
  //   frames   the robot's state after each command, so the page can animate them
  function run(task, commands) {
    let state = startState(task);
    const frames = [];
    let touchedGoal = atGoal(task, state);

    for (const command of commands) {
      const result = apply(task, state, command.name);
      if (!result.ok) {
        return {
          outcome: "stopped",
          reason: result.reason,
          block: result.block || null,
          line: command.line,
          frames: frames,
          state: state,
          used: frames.length
        };
      }
      state = result.state;
      frames.push({ line: command.line, name: command.name, state: state });
      if (atGoal(task, state)) {
        touchedGoal = true;
      }
    }

    if (atGoal(task, state)) {
      return { outcome: "complete", frames: frames, state: state, used: commands.length };
    }
    return {
      outcome: "short",
      frames: frames,
      state: state,
      used: commands.length,
      distance: distanceToGoal(task, state),
      passedGoal: touchedGoal
    };
  }

  /* ---------- 3. Describing the floor ---------- */

  // The story's name for a thing, or a plain word if the task gives none.
  function nameOf(thing, fallback) {
    return thing && thing.name ? thing.name : fallback;
  }

  function place(task, row, col) {
    if (task.rows === 1) {
      return "square " + (col + 1);
    }
    return "row " + (row + 1) + ", square " + (col + 1);
  }

  // A plain-English description of the floor. The page shows it under the
  // picture, so people who cannot see the picture get the same information.
  function describe(task, state) {
    const goalName = nameOf(task.goal, "goal");
    const parts = [];
    if (task.rows === 1) {
      parts.push("The floor is one row of " + task.cols + " squares.");
    } else {
      parts.push("The floor has " + task.rows + " rows of " + task.cols + " squares. Row 1 is at the top.");
    }
    parts.push("The robot is on " + place(task, state.row, state.col) + ", facing " + FACING_WORDS[state.dir] + ".");
    task.blocks.forEach(function (block) {
      parts.push("There is a " + nameOf(block, "block") + " on " + place(task, block.row, block.col) + ".");
    });
    if (atGoal(task, state)) {
      parts.push("The robot has reached the " + goalName + ".");
    } else {
      parts.push("The " + goalName + " is on " + place(task, task.goal.row, task.goal.col) + ".");
    }
    return parts.join(" ");
  }

  const api = {
    COMMANDS: COMMANDS,
    DIRECTIONS: DIRECTIONS,
    parse: parse,
    run: run,
    describe: describe,
    startState: startState,
    atGoal: atGoal,
    nameOf: nameOf
  };

  // In Node (for the tests) export the functions. In a browser, hang them on window.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.TasterEngine = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
