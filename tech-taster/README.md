# Tech taster (prototype, version 2)

"Never written a line of code? Move the robot."

A ten-minute taster for people who think a tech course is not for them. It runs in a web browser with no sign-up, no cookies and no tracking.

This is a prototype for discussion. It is not an official University of Bedfordshire page.

## What is in version 2

- A story. Biscuit is a tea robot on its first day. It has to reach the cup, and in the last task a plant is in the way.
- Three tasks: reach the cup, turn the corner, fix the bug. Each one ends with a line about where the same idea turns up in real life.
- Four colour schemes: Tea trolley (the default), Battenberg, Night shift and Road sign (the look of version 1). The buttons are at the bottom of the taster page. An address can also choose one, for example `index.html?look=night`.
- A code box you can type in, plus Add buttons so nobody has to type on a phone.
- Plain-English messages for mistakes, such as "use small letters" and "add brackets".
- A description of the floor in words, a result that screen readers announce, and a Tab key that is never trapped.
- Notes for tutors (`tutors.html`), and an About page with accessibility and privacy notes (`about.html`).
- Two tasters marked "coming later": Your first program, and Try AI in ten minutes.

## Files

| File | What it does |
| --- | --- |
| `index.html` | The taster page |
| `tutors.html` | Notes for running it with a group, with answers |
| `about.html` | About, accessibility and privacy |
| `css/site.css` | All the styling, including the four colour schemes |
| `js/engine.js` | The robot's rules: reads a program, moves the robot, describes the floor |
| `js/tasks.js` | The three tasks and the story, as data |
| `js/app.js` | Connects the engine to the page and draws the pictures |
| `js/look.js` | Chooses the colour scheme |
| `tests/engine.test.js` | 27 tests for the engine and the tasks |
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

1. Upload what is inside this folder to a public repository, so that `index.html` sits at the top level. If you upload the folder itself, the site still works, but the folder name is repeated in the address.
2. On GitHub open Settings, then Pages. Choose "Deploy from a branch", branch `main`, folder `/ (root)`, and save.
3. About a minute later the site is at `https://<your-username>.github.io/<repository-name>/`.

Every page asks search engines not to list it (`<meta name="robots" content="noindex">`). Remove that line when the site is ready to be found.

## Change the story or the colours

- The story is in `js/tasks.js`: the names (`cup`, `plant`) and the sentences (`intro`, `hints`, `done`, `realLife`). The one sentence about Biscuit at the top of the page is in `index.html`.
- Each colour scheme is one block of variables at the top of `css/site.css`.

`GUIDE.md` section 10 gives the steps for both.

## Not done yet

- Testing with a screen reader, and in Safari and Firefox. Version 2 was tested in Chrome at laptop and phone sizes, and the contrast of all four colour schemes was checked by calculation.
- A short video for each task, with captions.
- The other two tasters.
- A real "what next" step, agreed with Marketing.
- A licence. None has been chosen, so all rights are reserved for now.

## How it was made

Built on 13 November 2026 with Claude. `GUIDE.md` explains every part of the code.
