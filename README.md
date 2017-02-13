# passports-template-mixins
A middleware that exposes a series of Mustache mixins on `res.locals` to ease usage of forms, translations, and some other things.

It takes an optional [options object](#options) argument.

## Installation

```javascript
npm install [--save] hmpo-template-mixins;
```

## Usage

```javascript
var express = require('express');
var i18n = require('i18n-future');
var mixins = require('hmpo-template-mixins');

app.set('view engine', 'html');
app.set('views', path.join(__dirname, '/views'));

app.use(i18n.middleware());
app.use(mixins({ sharedTranslationsKey: 'passport.renew' }));

app.use(function (req, res) {
    // NOTE: res.locals.partials has been set.

    res.render('example-template');
});
```

If rendering as part of an HMPO controller's middleware chain then the field configuration will automatically be set to `res.locals.options.fields` by the controller, and will be loaded from here by the mixins.

Alternatively, if not using HMPO controllers, you can explicitly set field configuration with instantiating the middleware by passing a `fields` option. This should not be used for dynamic field configuration.

## Translation

By default any function set to `req.translate` will be used for translation if it exists. For example, that generated using [i18n-future](https://npmjs.com/package/i18n-future) middleware.

## Options

### viewsDirectory

Allows you override the directory that the module checks for partials in - Default: the root of this project

### viewEngine

Allows you to alter the file extension of the templates - Default: 'html'

### sharedTranslationsKey

Prefixes keys for translation - Default: '' (empty string)

### translate

Defines a custom translation method - Default: `req.translate`

### fields

Static field configuration - Default: `{}`

## Mustache mixins available

```
t
time
selected
lowercase
uppercase
hyphenate
date
currency
select
input-text
input-date
input-text-compound
input-text-code
input-number
input-phone
radio-group
checkbox
checkbox-compound
checkbox-required
input-submit
textarea
```

## Field options

- `className`: A string or array of string class names.
- `label`: The intended value of the HTML `label` attribute.
- `type`: The value of the HTML input `type` attribute.
- `required`: Value applied to `aria-required` HTML attribute.
- `hint`: This adds context to the label, which it is a part of, for input text, radio groups and textarea. It is used within the input by aria-describedby for screen readers.
- `maxlength`: Applicable to text-based fields and mapped to the `maxlength` HTML attribute.
- `options`: Applicable to HTML `select` and `radio` controls and used to generate the items of either HTML element.
- `selected`: Applicable to `select`, `checkbox`, and `radio` controls. Will render the selected HTML option/element selected or checked.
- `legend`: Applicable to `radio` button controls, which are wrapped in a HTML `fieldset` with a `legend` element.
- `legendClassName`: Applied as a class name to HTML `legend` attribute.
- `toggle`: Can be used to toggle the display of the HTML element with a matching `id`. See [passports-frontend-toolkit](https://github.com/UKHomeOffice/passports-frontend-toolkit/blob/master/assets/javascript/progressive-reveal.js) for details.
- `attributes`: A hash of key/value pairs applicable to a HTML `textarea` field. Each key/value is assigned as an attribute of the `textarea`. For example `spellcheck="true"`.
- `child`: Render a child partial beneath each option in an `optionGroup`. Accepts a custom mustache template string, a custom partial in the format `partials/{your-partial-name}` or a template mixin key which will be rendered within a panel element partial.
