/*
  Tests for the engine and the three tasks.
  Run them from the project folder with:   node tests/engine.test.js
  They need nothing installed except Node.
*/
const assert = require("node:assert/strict");
const engine = require("../js/engine.js");
const tasks = require("../js/tasks.js");

let passed = 0;
function test(name, check) {
  try {
    check();
    passed += 1;
    console.log("  ok   " + name);
  } catch (error) {
    console.log("  FAIL " + name);
    console.log("       " + error.message);
    process.exitCode = 1;
  }
}

function runProgram(task, lines) {
  const parsed = engine.parse(lines.join("\n"));
  assert.equal(parsed.ok, true, "the program should be readable");
  return engine.run(task, parsed.commands);
}

const [reach, corner, bug] = tasks;

console.log("Reading programs");

test("reads commands and remembers their line numbers", () => {
  const parsed = engine.parse("move()\n\nturn_left()\n");
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.commands, [
    { name: "move", line: 1 },
    { name: "turn_left", line: 3 }
  ]);
});

test("ignores comments, spaces and a final semicolon", () => {
  const parsed = engine.parse("  move( )  # go forward\n# a note\nturn_right();");
  assert.equal(parsed.ok, true);
  assert.equal(parsed.commands.length, 2);
});

test("explains capital letters", () => {
  const parsed = engine.parse("Move()");
  assert.equal(parsed.ok, false);
  assert.equal(parsed.line, 1);
  assert.match(parsed.message, /small letters/);
  assert.match(parsed.message, /move\(\)/);
});

test("explains missing brackets", () => {
  const parsed = engine.parse("move()\nturn_left");
  assert.equal(parsed.ok, false);
  assert.equal(parsed.line, 2);
  assert.match(parsed.message, /brackets/);
});

test("guesses a mistyped command", () => {
  assert.match(engine.parse("mvoe()").message, /Did you mean move\(\)/);
  assert.match(engine.parse("turnleft()").message, /Did you mean turn_left\(\)/);
  assert.match(engine.parse("right()").message, /Did you mean turn_right\(\)/);
});

test("lists the commands when it cannot guess", () => {
  const parsed = engine.parse("jump()");
  assert.equal(parsed.ok, false);
  assert.match(parsed.message, /It knows move\(\), turn_left\(\) and turn_right\(\)/);
});

test("says when the program is empty or too long", () => {
  assert.match(engine.parse("   \n# nothing").message, /empty/);
  const long = new Array(41).fill("turn_left()").join("\n");
  assert.match(engine.parse(long).message, /up to 40 commands/);
});

console.log("Moving the robot");

test("task 1 starter stops one square short", () => {
  const result = runProgram(reach, reach.starter);
  assert.equal(result.outcome, "short");
  assert.equal(result.distance, 1);
  assert.equal(result.passedFlag, false);
});

test("task 1 answer reaches the flag", () => {
  const result = runProgram(reach, reach.answer);
  assert.equal(result.outcome, "complete");
  assert.equal(result.used, 3);
  assert.equal(result.frames.length, 3);
});

test("walking off the edge stops the program", () => {
  const result = runProgram(reach, ["move()", "move()", "move()", "move()"]);
  assert.equal(result.outcome, "stopped");
  assert.equal(result.reason, "edge");
  assert.equal(result.line, 4);
});

test("going past the flag is noticed", () => {
  const result = runProgram(reach, ["move()", "move()", "move()", "turn_left()", "turn_left()", "move()"]);
  assert.equal(result.outcome, "short");
  assert.equal(result.passedFlag, true);
});

test("turning left four times faces the same way", () => {
  const result = runProgram(reach, ["turn_left()", "turn_left()", "turn_left()", "turn_left()"]);
  assert.equal(result.state.dir, "east");
});

test("turning right is the opposite of turning left", () => {
  const result = runProgram(reach, ["turn_left()", "turn_right()"]);
  assert.equal(result.state.dir, "east");
  assert.equal(runProgram(reach, ["turn_right()"]).state.dir, "south");
});

test("task 3 starter walks into the rock on line 2", () => {
  const result = runProgram(bug, bug.starter);
  assert.equal(result.outcome, "stopped");
  assert.equal(result.reason, "rock");
  assert.equal(result.line, 2);
});

console.log("The three tasks");

tasks.forEach((task, index) => {
  test("task " + (index + 1) + " answer works and its starter does not", () => {
    assert.equal(runProgram(task, task.answer).outcome, "complete");
    assert.notEqual(runProgram(task, task.starter).outcome, "complete");
  });

  test("task " + (index + 1) + " only offers commands the engine knows", () => {
    task.buttons.forEach((name) => assert.ok(engine.COMMANDS.includes(name)));
    assert.ok(task.hints.length >= 2);
  });
});

console.log("Describing the world");

test("describes a one-row world", () => {
  assert.equal(
    engine.describe(reach, engine.startState(reach)),
    "The world is one row of 4 squares. The robot is on square 1, facing right. The flag is on square 4."
  );
});

test("describes rows, rocks and arriving", () => {
  assert.equal(
    engine.describe(bug, engine.startState(bug)),
    "The world has 2 rows of 4 squares. Row 1 is at the top. The robot is on row 2, square 1, facing right. There is a rock on row 2, square 3. The flag is on row 1, square 4."
  );
  const done = runProgram(corner, corner.answer);
  assert.match(engine.describe(corner, done.state), /The robot is on the flag\.$/);
});

console.log("\n" + passed + " tests passed" + (process.exitCode ? ", some failed" : ""));
