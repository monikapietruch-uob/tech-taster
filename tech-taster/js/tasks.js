/*
  The three tasks (version 1)
  ---------------------------
  Each task is plain data. To add or change a task you only edit this file.

    rows, cols   the size of the world, in squares
    robot        where the robot starts (row and col count from 0, row 0 is the top)
                 and which way it faces: "east", "north", "west" or "south"
    flag         the square the robot must reach
    rocks        squares the robot cannot enter
    starter      the program that is already in the code box
    buttons      the commands offered as tap buttons under the code box
    word         the new word this task teaches
    hints        shown one at a time when someone asks for a hint
    answer       one program that works (used by the tests and the tutor page)
*/
(function (root) {
  "use strict";

  const tasks = [
    {
      id: "reach-the-flag",
      title: "Reach the flag",
      intro:
        "Each line is one command, done in order from the top. Press Run and watch, then add what is missing.",
      rows: 1,
      cols: 4,
      robot: { row: 0, col: 0, dir: "east" },
      flag: { row: 0, col: 3 },
      rocks: [],
      starter: ["move()", "move()"],
      buttons: ["move"],
      word: { term: "command", meaning: "One instruction for the robot, such as move()." },
      hints: [
        "Count the squares between the robot and the flag.",
        "Each move() takes the robot one square forward. The program needs one more."
      ],
      answer: ["move()", "move()", "move()"]
    },
    {
      id: "turn-the-corner",
      title: "Turn the corner",
      intro:
        "The flag is round the corner. move() goes one square forward. turn_left() turns the robot without moving it.",
      rows: 2,
      cols: 3,
      robot: { row: 1, col: 0, dir: "east" },
      flag: { row: 0, col: 2 },
      rocks: [],
      starter: ["move()", "move()"],
      buttons: ["move", "turn_left"],
      word: { term: "program", meaning: "A list of commands. The robot does them in order, from the top." },
      hints: [
        "Run the program first. Which way does the robot need to face next?",
        "turn_left() only turns the robot. Add a move() after it to go forward."
      ],
      answer: ["move()", "move()", "turn_left()", "move()"]
    },
    {
      id: "fix-the-bug",
      title: "Fix the bug",
      intro:
        "This program has a bug: the robot walks into a rock. Run it to see, then change it so the robot goes round.",
      rows: 2,
      cols: 4,
      robot: { row: 1, col: 0, dir: "east" },
      flag: { row: 0, col: 3 },
      rocks: [{ row: 1, col: 2 }],
      starter: ["move()", "move()", "move()"],
      buttons: ["move", "turn_left", "turn_right"],
      word: { term: "bug", meaning: "A mistake in a program. Finding and fixing it is called debugging." },
      hints: [
        "The rock is on the bottom row. The top row is clear.",
        "To go up, turn left first. Then move, and turn right to face the flag again.",
        "One answer: turn_left(), move(), turn_right(), move(), move(), move()."
      ],
      answer: ["turn_left()", "move()", "turn_right()", "move()", "move()", "move()"]
    }
  ];

  if (typeof module !== "undefined" && module.exports) {
    module.exports = tasks;
  } else {
    root.TasterTasks = tasks;
  }
})(typeof window !== "undefined" ? window : globalThis);
