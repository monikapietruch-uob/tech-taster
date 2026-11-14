/*
  The three tasks (version 2)
  ---------------------------
  Each task is plain data. To add or change a task you only edit this file.

  The story lives here too: Biscuit is a tea robot, the goal is a cup and the
  thing in the way is a plant. To tell a different story, change the names and
  the sentences below. The rules in engine.js stay the same.

    rows, cols   the size of the floor, in squares
    robot        where the robot starts (row and col count from 0, row 0 is the top)
                 and which way it faces: "east", "north", "west" or "south"
    goal         the square the robot must reach, and what is there
    blocks       squares the robot cannot enter, and what is there
    starter      the program that is already in the code box
    buttons      the commands offered as tap buttons under the code box
    word         the new word this task teaches
    hints        shown one at a time when someone asks for a hint
    done         one sentence for the moment the task is complete
    realLife     where the same idea turns up away from this page
    answer       one program that works (used by the tests and the tutor page)

  The page has a drawing for these names: "cup", "plant", "flag" and "rock".
*/
(function (root) {
  "use strict";

  const tasks = [
    {
      id: "reach-the-cup",
      title: "Reach the cup",
      intro:
        "Somebody wants tea. Each line is one command, done from the top. Press Run, watch, then add what is missing.",
      rows: 1,
      cols: 4,
      robot: { row: 0, col: 0, dir: "east" },
      goal: { row: 0, col: 3, name: "cup" },
      blocks: [],
      starter: ["move()", "move()"],
      buttons: ["move"],
      word: { term: "command", meaning: "One instruction for the robot, such as move()." },
      hints: [
        "Count the squares between the robot and the cup.",
        "Each move() takes the robot one square forward. The program needs one more."
      ],
      done: "Tea is served.",
      realLife: "A lift, a washing machine and a cash machine all follow lists of commands like this one.",
      answer: ["move()", "move()", "move()"]
    },
    {
      id: "turn-the-corner",
      title: "Turn the corner",
      intro:
        "This cup is round the corner. move() goes one square forward. turn_left() turns the robot without moving it.",
      rows: 2,
      cols: 3,
      robot: { row: 1, col: 0, dir: "east" },
      goal: { row: 0, col: 2, name: "cup" },
      blocks: [],
      starter: ["move()", "move()"],
      buttons: ["move", "turn_left"],
      word: { term: "program", meaning: "A list of commands. The robot does them in order, from the top." },
      hints: [
        "Run the program first. Which way does the robot need to face next?",
        "turn_left() only turns the robot. Add a move() after it to go forward."
      ],
      done: "Tea is served, round the corner.",
      realLife: "A sat nav gives a driver a program too: go forward, turn left, go forward.",
      answer: ["move()", "move()", "turn_left()", "move()"]
    },
    {
      id: "fix-the-bug",
      title: "Fix the bug",
      intro:
        "Someone has moved the plant, and this program has a bug: the robot drives into it. Run it, then fix it.",
      rows: 2,
      cols: 4,
      robot: { row: 1, col: 0, dir: "east" },
      goal: { row: 0, col: 3, name: "cup" },
      blocks: [{ row: 1, col: 2, name: "plant" }],
      starter: ["move()", "move()", "move()"],
      buttons: ["move", "turn_left", "turn_right"],
      word: { term: "bug", meaning: "A mistake in a program. Finding and fixing it is called debugging." },
      hints: [
        "The plant is on the bottom row. The top row is clear.",
        "To go up, turn left first. Then move, and turn right to face the cup again.",
        "One answer: turn_left(), move(), turn_right(), move(), move(), move()."
      ],
      done: "Tea is served, and the plant is fine.",
      realLife: "Finding and fixing bugs is a normal part of the job. Programmers do it every day.",
      answer: ["turn_left()", "move()", "turn_right()", "move()", "move()", "move()"]
    }
  ];

  if (typeof module !== "undefined" && module.exports) {
    module.exports = tasks;
  } else {
    root.TasterTasks = tasks;
  }
})(typeof window !== "undefined" ? window : globalThis);
