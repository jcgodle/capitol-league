# Scoreboard Parity Pack (optional skin)
This **does not replace** your CSS. It adds a *scoped* skin that only applies on the Scoreboard page,
so it matches your other pages' look.

## Use
1) Add a class to your Scoreboard page's `<body>` tag:
```html
<body class="scoreboard">
```
2) Include the parity skin *after* your normal CSS:
```html
<link rel="stylesheet" href="css/scoreboard.parity.css">
```

That's it. Because it's scoped to `body.scoreboard`, it won't touch Cards/Draft/Votes.

If you prefer no HTML edits, change all selectors `body.scoreboard` → `body` inside the CSS (then it applies globally).
