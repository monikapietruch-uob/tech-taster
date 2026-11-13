# Tech taster (prototype, version 1)

"Never written a line of code? Move the robot."

A ten-minute taster for people who think a tech course is not for them. It runs in a web browser with no sign-up, no cookies and no tracking.

This is a prototype for discussion. It is not an official University of Bedfordshire page.

## What is in version 1

- Three robot tasks: reach the flag, turn the corner, fix the bug.
- A code box you can type in, plus Add buttons so nobody has to type on a phone.
- Plain-English messages for mistakes, such as "use small letters" and "add brackets".
- A description of the robot's world in words, a result that screen readers announce, and a Tab key that is never trapped.
- Notes for tutors (`tutors.html`), and an About page with accessibility and privacy notes (`about.html`).
- Two tasters marked "coming later": Your first program, and Try AI in ten minutes.

## Files

| File | What it does |
| --- | --- |
| `index.html` | The taster page |
| `tutors.html` | Notes for running it with a group, with answers |
| `about.html` | About, accessibility and privacy |
| `css/site.css` | All the styling |
| `js/engine.js` | The robot's rules: reads a program, moves the robot, describes the world |
| `js/tasks.js` | The three tasks, as data |
| `js/app.js` | Connects the engine to the page |
| `tests/engine.test.js` | 22 tests for the engine and the tasks |
| `GUIDE.md` | How the code works, step by step |

## Try it on your own computer

```
python3 -m http.server 8000
```

Then open `http://localhost:8000` in a browser. Opening `index.html` with a double-click also works.

## Run the tests

```
node tests/engine.test.js
```

The tests need Node and nothing else.

## Put it on GitHub Pages

1. Push this folder to a public repository.
2. On GitHub open Settings, then Pages. Choose "Deploy from a branch", branch `main`, folder `/ (root)`, and save.
3. About a minute later the site is at `https://<your-username>.github.io/<repository-name>/`.

Every page asks search engines not to list it (`<meta name="robots" content="noindex">`). Remove that line when the site is ready to be found.

## Not done yet

- Testing with a screen reader, and in Safari and Firefox. Version 1 was tested in Chrome at laptop and phone sizes.
- A short video for each task, with captions.
- The other two tasters.
- A real "what next" step, agreed with Marketing.
- A licence. None has been chosen, so all rights are reserved for now.

## How it was made

Built on 13 November 2026 with Claude. `GUIDE.md` explains every part of the code.
