# Jiffies DOM

Jiffies DOM is an HTML microframework, exposing access to the DOM in a functional-first way.

```js
import {form, input, label} from 'jiffies/dom/html';

export const Form({
        title,
        action="#",
        onSubmit = (event) => {},
    },
    ...children
) =>
    form({
            action,
            events: {
              submit: (event) => {
                event.preventDefault();
                onSubmit(event);
              }
            }
        },
        h3(title),
        ...children,
        button({type: "submit"}, "Submit")
    );

export const Input(name, type="string") => {
    let id = name.replace(/\s+/g, '_').toLowerCase();
    return label(
        {for: id},
        name,
        input({name, id, type})
    )
}

document.body.append(
    Form(
        {
            title: "Details",
            onSubmit: (event) => {
                console.log(event.target);
            }
        },
        Input({name: "First Name"}),
        Input({name: "Last Name"}),
        Input({name: "Number of cats", type: "number"})
    )
);
```

Exposing HTML as a tree of function calls makes it very easy to compose units of HTML.
Creating new functions which pass HTML fragments is natural and intuitive, and creating reusable chunks of common HTML patterns is easy.

## Functional Components

Exposing HTML as functions makes it easy on the programmer to create and compose HTML, but those functions lose context when they return.
To capture HTML chunks and update them, use the `FC` function.
The `FC` function creates new WebComponent elements in the DOM, and exposes an interface that matches native HTML elements.

```js
export const GameSquare = FC<{piece: Piece}>('game-square', (el, {piece}) => {
    el.textContent = piece;
    // `el` is retained between updates
    return el;
});

export const GameBoard = FC<{pieces: Piece[]}>('game-board', (el, {pieces} => {
    return el;
}));
```

## Style Blocks

The `compileFstyle` function streamlines creating nested style rules.
When used with the `style` HTML tag, this can create complex layouts inline with components.

```js
const MyPage = () => [
  style(
    compileFstyle({
      main: {
        display: "flex",
        flexDirection: "row",
      },
      "@media max-width(768px)": {
        main: {
          flexDirection: "column",
        },
      },
    })
  ),
  section("..."),
  section("..."),
  section("..."),
];
```

## Pico CSS

Including [Pico.css](https://picocss.com/) provides a high-quality semantic HTML base to begin styling from.
