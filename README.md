# PostCSS define Function [![Build Status][ci-img]][ci]

[PostCSS] plugin to implement sass @function.

[PostCSS]: https://github.com/postcss/postcss
[ci-img]:  https://travis-ci.org/titancat/postcss-define-function.svg
[ci]:      https://travis-ci.org/titancat/postcss-define-function

```css
@define-function rem($val) {
    @return $val / 640 * 10 * 1rem;
}
.foo {
    /* Input example */
    height: rem(640);
}
```

```css
.foo {
  /* Output example */
  height: 10rem;
}
```

## Usage

```js
postcss([ require('postcss-define-function') ])
```

See [PostCSS] docs for examples for your environment.

##Thanks

- [postcss-plugin-boilerplate](https://github.com/postcss/postcss-plugin-boilerplate)
- [postcss-mixins](https://github.com/postcss/postcss-mixins)
