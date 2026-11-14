# How the taster works: a guide to the code

This guide walks through every file. It assumes you know some Python and a little HTML, CSS and JavaScript. Where JavaScript does something Python does not, the guide says so.

## 1. The big picture

The site has three layers. Each one knows nothing about the layer above it.

| Layer | File | Job |
| --- | --- | --- |
| Data | `js/tasks.js` | Describes the three tasks: size of the floor, where things are, the starter program, the hints. The story is here too |
| Rules | `js/engine.js` | Reads a program, moves the robot, describes the floor. It never touches the page |
| Page | `js/app.js` | Draws the floor and the pictures, listens to buttons, plays the moves, shows the result |

`index.html` holds the page structure. `css/site.css` holds the look, and `js/look.js` chooses which of the four colour schemes is used.

Version 2 added a second split. The **rules** do not know the **story**. The engine knows there is a goal and that some squares are blocked. Only `js/tasks.js` says the goal is a cup and the block is a plant. To tell a different story you change the data, and the rules and their tests stay as they are.

The reason for the split is testing. The engine has no page code in it, so `tests/engine.test.js` can check all the rules in under a second, with no browser.

## 2. What happens when someone presses Run

Follow one click from start to finish. The functions named here are in `js/app.js` unless the guide says otherwise.

1. The Run button calls `runProgram()`.
2. `runProgram()` sends the text in the code box to `engine.parse()`.
3. `parse()` returns either a list of commands, or a message about the first line it could not read. If there is a message, the page shows it and stops.
4. `runProgram()` sends the commands to `engine.run()`. The engine works out the whole journey at once and returns it as a list of **frames**: the robot's position after each command.
5. The page plays the frames one at a time. For each frame it moves the robot's picture, then waits about half a second.
6. `report()` turns the engine's verdict into words: "Task complete", "Not there yet" or "The program stopped at line 2".

The important idea is in steps 4 and 5. The engine decides everything first. The page only replays it. That keeps the rules and the animation apart.

## 3. `js/engine.js`: the rules

### The wrapper

The whole file sits inside this:

```js
(function (root) {
  "use strict";
  // ...
})(typeof window !== "undefined" ? window : globalThis);
```

This is a function that runs as soon as it is defined. Everything inside it is private, so names such as `MOVES` cannot clash with names in other files. `"use strict"` asks the browser to report mistakes that it would otherwise ignore, such as using a variable you never declared.

### The directions

```js
const DIRECTIONS = ["east", "north", "west", "south"];
```

The order matters. Each direction is followed by the one you face after turning left. So turning left is "go one place forward in the list", and turning right is "go three places forward", which is the same as one place back. The `% 4` wraps round the end of the list, like `%` in Python:

```js
DIRECTIONS[(facing + 1) % 4]   // turn left
DIRECTIONS[(facing + 3) % 4]   // turn right
```

`MOVES` says how one `move()` changes the row and column for each direction. Rows are counted from the top, so going north makes the row number smaller.

### `parse(source)`: reading the program

`parse` splits the text into lines and looks at each one.

```js
const text = lines[i].split("#")[0].trim();
```

This keeps the part before any `#` (so comments are ignored) and removes spaces from both ends. Empty lines are skipped.

Then one regular expression checks the shape of the line:

```js
/^([A-Za-z_][A-Za-z0-9_]*)\s*\(\s*\)\s*;?$/
```

Read it in pieces:

| Piece | Meaning |
| --- | --- |
| `^` | start of the line |
| `([A-Za-z_][A-Za-z0-9_]*)` | a name: a letter or underscore, then letters, digits or underscores. The round brackets capture it |
| `\s*` | any spaces |
| `\(\s*\)` | an opening bracket, any spaces, a closing bracket |
| `;?` | an optional semicolon |
| `$` | end of the line |

If the line matches and the name is one of the three commands, the command is added to the list with its line number. The line number is kept so that messages can say "line 2".

If the line does not match, `explainBadLine()` writes a sentence about it. It strips the brackets and spaces, then asks three questions in order:

1. Is it a real command with capital letters? Then say "use small letters".
2. Is it a real command without brackets? Then say "add brackets".
3. Is it close to a real command? `guessCommand()` looks for the words "left", "right" or "mov", and then uses `editDistance()` to count how many single-letter changes separate the word from each command. One or two changes counts as a typing mistake, so `mvoe()` becomes "Did you mean move()?".

`parse` returns an object. Either `{ ok: true, commands: [...] }` or `{ ok: false, line: 2, message: "..." }`. Returning a result instead of raising an error keeps the calling code simple: it checks `ok` and carries on.

### `apply(task, state, name)`: one command

The robot's **state** is three values: `row`, `col` and `dir`. `apply` takes a state and a command and returns a new state. It never changes the old one. That is why the frames can be stored safely: each one is its own object.

For `move`, it works out the square in front of the robot. It refuses if that square is outside the floor (`"edge"`), or if something blocks it (`"block"`). In the second case it also hands back the thing that is in the way, so the page can name it.

### `run(task, commands)`: the whole program

`run` starts from the task's starting state and applies each command in turn. It stops early if a command is refused. At the end it returns one of three outcomes:

| Outcome | Meaning | Extra information |
| --- | --- | --- |
| `"complete"` | the robot is on the goal | `used`: how many commands |
| `"short"` | the program ended somewhere else | `distance` to the goal, and `passedGoal` if the robot reached the goal and left it |
| `"stopped"` | the robot hit something or the wall | `reason`, `line`, and `block` (the thing in the way, or `null` for the wall) |

Every outcome also carries `frames` and the final `state`.

### `describe(task, state)`: the floor in words

This builds the sentence under the picture, such as "The floor is one row of 4 squares. The robot is on square 1, facing right. The cup is on square 4." People who cannot see the picture get the same information from it. It uses "right" and "up" instead of "east" and "north" because those are easier words.

The words "cup" and "plant" are not written in the engine. They come from the task, through one small function:

```js
function nameOf(thing, fallback) {
  return thing && thing.name ? thing.name : fallback;
}
```

`condition ? a : b` means "if the condition is true use `a`, otherwise `b`". So a goal with a name is called by its name, and a goal without one is called "goal". One of the tests uses a task with no names at all, to prove the rules do not depend on the story.

### The last lines

```js
if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
} else {
  root.TasterEngine = api;
}
```

The file is used in two places. In Node, for the tests, `module.exports` hands the functions to `require()`. In a browser there is no `module`, so the functions are attached to `window` as `TasterEngine`, where `app.js` finds them.

## 4. `js/tasks.js`: the tasks as data

Each task is one object. To change a task you edit this file and nothing else.

```js
{
  id: "reach-the-cup",
  title: "Reach the cup",
  intro: "Somebody wants tea. Each line is one command, ...",
  rows: 1,
  cols: 4,
  robot: { row: 0, col: 0, dir: "east" },
  goal: { row: 0, col: 3, name: "cup" },
  blocks: [],
  starter: ["move()", "move()"],
  buttons: ["move"],
  word: { term: "command", meaning: "One instruction for the robot, such as move()." },
  hints: ["...", "..."],
  done: "Tea is served.",
  realLife: "A lift, a washing machine and a cash machine all follow lists of commands like this one.",
  answer: ["move()", "move()", "move()"]
}
```

Rows and columns count from 0, and row 0 is the top row. So `{ row: 0, col: 3 }` is the top row, fourth square.

Four of these values carry the story:

| Value | Where it shows |
| --- | --- |
| `name` inside `goal` and `blocks` | In the description, in the messages ("A plant is in the way"), and it picks the drawing |
| `intro` and `hints` | Above the floor, and when someone asks for a hint |
| `done` | At the start of the result when the task is complete |
| `realLife` | In the green box under the code, when the task is complete |

To add a fourth task, copy one object, change the values and add it to the end of the list. The page reads the length of the list, so the title becomes "Task 4 of 4" by itself. The tests check every task automatically: its `answer` must reach the goal, its `starter` must not, and its names must be ones the page can draw. One thing is not automatic: the finish panel in `index.html` says "You wrote three programs", so change that sentence too.

## 5. `js/app.js`: the page

### Finding the parts of the page

```js
const page = {
  steps: document.getElementById("steps"),
  title: document.getElementById("task-title"),
  // ...
};
```

Each part of the page that the script changes has an `id` in `index.html`. The script looks them all up once and keeps them in one object, so the rest of the code can say `page.code` or `page.result`.

### Remembering progress

```js
let progress = loadProgress();
// { current: 0, code: ["move()\nmove()", ...], done: [false, false, false] }
```

`progress` holds which task is open, the text in the code box for each task, and which tasks are done. `saveProgress()` writes it to `localStorage`, a small store that belongs to this site in this browser. Nothing is sent anywhere.

Both functions use `try` and `catch`, which work like `try` and `except` in Python. Some browsers switch `localStorage` off, for example in private windows on older phones. If that happens the taster still works. It just forgets progress when the page is closed.

`loadProgress()` also checks that what it found has the right shape before trusting it. Saved data can be old or damaged.

### Drawing the floor

The picture is an SVG, a drawing made of shapes described in text. `drawWorld()` builds it with `document.createElementNS(...)`. The `NS` matters: SVG shapes must be created in the SVG "namespace" or the browser treats them as unknown HTML and draws nothing. The small helper `shape(name, attributes)` hides that detail.

```js
const svg = shape("svg", { viewBox: "0 0 " + width + " " + height, "aria-hidden": "true", focusable: "false" });
```

The `viewBox` sets the drawing's own units: each square is 80 units wide (`CELL`). The browser scales the whole drawing to fit the space, so it stays sharp on a phone and on a projector. `aria-hidden="true"` hides the picture from screen readers, because the sentence underneath says the same thing in words.

The small pictures each have their own function: `drawCup()`, `drawPlant()`, `drawFlag()` and `drawRock()`. Each one draws around the point (0, 0), so the same picture can be put on any square by moving its group. One object connects the names in `tasks.js` to the functions:

```js
const PICTURES = { cup: drawCup, plant: drawPlant, flag: drawFlag, rock: drawRock };

(PICTURES[block.name] || drawRock)(group);
```

The second line reads: look up the function for this name, use `drawRock` if there is none, then call it. In JavaScript a function is a value like any other, so it can be stored in an object and called later. The flag and the rock are not used by the tea story. They are kept so that a different story has something to draw.

The goal is drawn as a dashed ring with the cup inside it. When the robot arrives it covers the cup, and the ring is what still shows where the goal was. The steam is added to the drawing last, because SVG draws shapes in order and later shapes sit on top. The stylesheet keeps the steam invisible until the floor has the class `is-complete`.

`TOP` is a little extra space above the top row. Without it, steam from a cup in the top row would be cut off by the edge of the drawing.

The robot is drawn around the point (0, 0), facing right. To put it on a square, `placeRobot()` sets one CSS property:

```js
robotPicture.style.transform = "translate(200px, 46px) rotate(-90deg)";
```

`translate` slides the group to the middle of the square. `rotate` turns it. Because the robot was drawn around (0, 0), it turns on the spot.

The glide comes from one line in `css/site.css`:

```css
.robot { transition: transform 0.38s ease; }
```

The script never animates anything itself. It changes the transform, and the browser fills in the movement.

### The angle

`angle` is kept as a running total. Turning left subtracts 90 and turning right adds 90. If the script set the angle from the direction instead (east is 0, south is 90, west is 180, north is -90), a left turn from north to west would spin the robot three quarters of the way round the wrong way. A running total always takes the short way.

### `jumpRobot()`: moving without a glide

When a task starts again, the robot should appear on its start square at once. `jumpRobot()` does this in four lines:

```js
robotPicture.classList.add("is-jumping");      // 1. switch the glide off
angle = START_ANGLES[state.dir];
placeRobot(state);                              // 2. move
void robotPicture.getBoundingClientRect();      // 3. make the browser apply it now
robotPicture.classList.remove("is-jumping");    // 4. switch the glide back on
```

Line 3 looks odd. Browsers save work by applying style changes in batches. Without line 3 the browser would see steps 1 to 4 as one batch, notice that the glide is on at the end, and glide. Asking for the element's size forces it to apply the jump first.

### Playing the moves: `async` and `await`

```js
function wait(milliseconds) {
  return new Promise(function (resolve) {
    window.setTimeout(resolve, milliseconds);
  });
}
```

JavaScript in a browser has no `time.sleep()`. A sleeping script would freeze the whole page. Instead, `wait()` returns a **promise**: an object that says "I will be finished later". Inside a function marked `async`, the word `await` pauses that one function until the promise is finished, while the rest of the page keeps working.

```js
for (const frame of outcome.frames) {
  page.trace.textContent = "Line " + frame.line + ": " + frame.name + "()";
  placeRobot(frame.state);
  await wait(STEP_MS);
}
```

So the loop reads like Python with `time.sleep()`, but the page stays alive.

`STEP_MS` is 460 milliseconds. If the visitor's device is set to reduce motion, it is 160 and the glide is switched off in the stylesheet.

### While the robot is moving

`setRunning(true)` sets the variable `running`, and every button's function starts with `if (running) return;`. The Run button gets `aria-disabled="true"` instead of the usual `disabled`. A truly disabled button loses the keyboard focus, and a keyboard user would then have to find their place again after every run.

### Words on the page

`showResult(kind, title, detail)` changes the result box. `kind` becomes a class name, such as `is-complete`, which sets the colour. The box has `role="status"` in the HTML, so a screen reader reads the new words out without the visitor moving.

`report()` builds the sentences. It takes the names from the task, so the same code says "The robot reached the cup" here and would say "the flag" in another story. When a task is complete it also shows the task's `realLife` sentence in the green box under the code.

Text from the code box is only ever put on the page with `textContent`, never `innerHTML`. `textContent` shows text exactly as typed. `innerHTML` would treat it as HTML, which is how pages get attacked.

### The step buttons and focus

`renderSteps()` rebuilds the three task buttons each time something changes. Rebuilding throws away the button that had the keyboard focus, so `openTask()` puts the focus back on the new button for the open task. When someone presses "Go to task 2" instead, the focus moves to the task's heading, so a screen reader starts reading the new task from the top.

## 6. `index.html`: structure and accessibility

The page is built from standard parts: `header`, `main`, `footer`, headings in order, real `button` elements and a real `label` for the code box. Assistive technology understands these without extra work.

The taster was written to avoid each problem found in the earlier check of the teaching site:

| Problem found before | What the taster does |
| --- | --- |
| The Tab key was trapped in the code box | The code box is a plain `textarea`, so Tab moves on. The Add buttons replace typing |
| Nothing announced the result | The result box has `role="status"` |
| The result was far down the page | It sits straight under the world. In the first task, on a 1280 by 720 screen, the world, code box, Run button and result fit together |
| The world had no description | `describe()` writes one, including the plant and the cup, and updates it after each run |
| The focus ring vanished on dark areas | The ring has two colours, one light and one dark, so one of them always shows |
| Grid lines were too faint | Grid lines are at least 4.7 to 1 against the floor in every colour scheme |
| No main area and a broken skip link | `main` has `id="main"`, and the skip link points to it |
| Every screen had the same title | Each page has its own title |
| Vague link names | Links say where they go |

It has not been tested with a screen reader yet. The About page says so.

Each page also has `<meta name="robots" content="noindex">`, which asks search engines not to list a prototype.

## 7. `css/site.css`: the look

The top of the file defines every colour once, as a variable:

```css
:root {
  --brand: #1f5fa8;   /* main buttons and the open task */
  --accent: #ffb238;  /* highlights */
  --ink: #14253d;     /* text */
}
```

The rest of the file never writes a colour. It only says `var(--brand)` or `var(--ink)`. That is what makes the four colour schemes possible. Each scheme, or **look**, is one more block that gives some of the variables new values:

```css
[data-look="battenberg"] {
  --brand: #b4235a;
  --accent: #ffd84d;
  --ink: #2b1220;
}
```

`[data-look="battenberg"]` means "any element with the attribute `data-look` set to `battenberg`". The attribute is put on the `<html>` element, and every element inside inherits the variables. So one attribute recolours the whole page, including the drawing, because the shapes in the SVG take their colours from the same variables.

| Look | Idea |
| --- | --- |
| `tea` | Blue-and-white china with tea amber. It is in `:root`, so it is used when nothing else is chosen |
| `battenberg` | Pink and yellow, like the cake |
| `night` | Light text on dark panels, for a dim room or a projector |
| `sign` | The green road sign of version 1 |

None of them uses the university's colours. That is on purpose, because this is not a university page.

The names of the variables say what a colour is for, not what it looks like: `--brand`, `--ok-bg`, `--robot-body`. A variable called `--green` would be wrong as soon as a look made it pink.

No fonts are downloaded. Each font setting is a list, and the browser uses the first one the device has. A Mac shows the headline in Gill Sans. A Windows computer shows Gill Sans MT if Office is installed, or Trebuchet MS. Downloading a font would mean a request to another company's server, and the site promises no tracking.

Layout uses CSS grid:

```css
@media (min-width: 56rem) {
  .bench {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}
```

On a narrow screen the two parts of the bench stack: the world first, then the code. On a screen wider than 56rem (about 900 pixels) they sit side by side. `minmax(0, 1fr)` means "share the space equally, and allow a column to shrink".

On a phone, the names of the tasks that are not open are hidden from view but kept for screen readers. That saves enough room for the robot to appear on the first screen.

## 8. `js/look.js`: choosing the colour scheme

This small file sets the `data-look` attribute. It looks in three places, in this order:

1. The address. `index.html?look=night` asks for the night look. The part after `?` is in `window.location.search`, and a regular expression picks out the word after `look=`.
2. `localStorage`, where the last choice in this browser is kept.
3. The first name in the list `LOOKS`, which is `tea`.

A name that is not in `LOOKS` is ignored, so a mistyped address cannot break the page.

The file is loaded in the `<head>` of each page with a plain `<script src="js/look.js"></script>`. A script in the head runs before the browser draws anything, so the page appears in the right colours straight away. The other scripts are at the end of the `<body>`, because they need the page's elements to exist first.

The four buttons in the footer of `index.html` each carry the name of a look:

```html
<button type="button" class="look-choice" data-look-choice="night" aria-pressed="false">Night shift</button>
```

The script does not attach a function to each button. It listens for clicks on the whole page and asks whether the click was on, or inside, such a button:

```js
const button = event.target.closest("[data-look-choice]");
```

`closest()` walks up from the thing that was clicked until it finds a matching element. That matters here because a click can land on the small coloured dot inside the button. `aria-pressed` tells a screen reader which look is in use.

## 9. The tests

`tests/engine.test.js` uses Node's built-in `assert`. Each test is a name and a function:

```js
test("task 1 starter stops one square short", () => {
  const result = runProgram(reach, reach.starter);
  assert.equal(result.outcome, "short");
  assert.equal(result.distance, 1);
});
```

`() => { ... }` is a short way to write a function. Run all 27 tests with `node tests/engine.test.js`.

Run them after every change to `engine.js` or `tasks.js`. If you add a rule, add a test for it first, watch it fail, then write the rule.

The tests cover the rules, not the page. The page was checked separately in Chrome at laptop and phone sizes, and the contrast of each colour scheme was checked by calculation.

## 10. How to change things

**Change the wording of a task.** Edit `intro`, `hints`, `word`, `done` or `realLife` in `js/tasks.js`.

**Change a result message.** Edit `report()` in `js/app.js`. Messages about unreadable lines are in `explainBadLine()` in `js/engine.js`.

**Change the story.** Say the robot should collect a parcel and avoid a chair.

1. In `js/tasks.js`, change `name: "cup"` to `name: "parcel"` and `name: "plant"` to `name: "chair"`, and rewrite `intro`, `hints`, `done` and `realLife`.
2. In `js/app.js`, write `drawParcel(group)` and `drawChair(group)` in the same way as `drawCup()`, and add them to `PICTURES`. Until you do, the page draws a flag and a rock instead.
3. In `tests/engine.test.js`, add the two names to the list called `drawable`.
4. In `index.html`, change the sentence about Biscuit and the small picture in the headline.

**Add a command, for example `turn_around()`.**

1. In `js/engine.js`, add `"turn_around"` to `COMMANDS`.
2. In `apply()`, add a case that moves two places along `DIRECTIONS`: `(facing + 2) % 4`.
3. In `runProgram()` in `js/app.js`, add `if (frame.name === "turn_around") { angle += 180; }`.
4. Add `"turn_around"` to the `buttons` of any task that should offer it.
5. Add a test.

**Change the colours.** Edit the variables in one of the four blocks at the top of `css/site.css`. Check the contrast of any new pair of colours: text needs 4.5 to 1 against its background, and large text and graphics need 3 to 1.

**Add a fifth look.**

1. In `css/site.css`, copy the Battenberg block, change the name in `[data-look="..."]` and change the colours. Add a `.swatch-...` rule for the dot on its button.
2. In `js/look.js`, add the name to `LOOKS`.
3. In `index.html`, copy one of the four buttons in the footer and change `data-look-choice`, the swatch class and the label.

**Make a different look the default.** Move its name to the front of `LOOKS` in `js/look.js`. People who have already chosen a look keep their choice.

**Change the speed.** Edit `STEP_MS` in `js/app.js` and the `0.38s` in the `.robot` rule in `css/site.css`. Keep the glide shorter than the step.

## 11. JavaScript words used in this code

| Word | Meaning | Closest thing in Python |
| --- | --- | --- |
| `const` | a name that is set once | a variable you never reassign |
| `let` | a name that can change | an ordinary variable |
| `function (x) { ... }` | a function without a name | `lambda`, but with many lines |
| `() => { ... }` | a shorter way to write the same | `lambda` |
| `array.map(f)` | a new list made by calling `f` on each item | `[f(x) for x in items]` |
| `array.some(f)` | true if `f` is true for any item | `any(f(x) for x in items)` |
| `array.every(f)` | true if `f` is true for every item | `all(f(x) for x in items)` |
| `array.includes(x)` | is `x` in the list | `x in items` |
| `array.find(f)` | the first item for which `f` is true | `next((x for x in items if f(x)), None)` |
| `array.forEach(f)` | call `f` on each item | a `for` loop |
| `condition ? a : b` | `a` if the condition is true, otherwise `b` | `a if condition else b` |
| `a \|\| b` | `a`, or `b` if `a` is empty or missing | `a or b` |
| `===` | equal, with no automatic conversion | `==` |
| `{ row: 0, col: 3 }` | an object with named values | a dictionary |
| `async` and `await` | pause this function without freezing the page | `async` and `await` in Python |
| `try` and `catch` | carry on if something fails | `try` and `except` |
