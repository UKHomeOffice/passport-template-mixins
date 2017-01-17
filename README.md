# passports-template-mixins
A middleware that exposes a series of Mustache mixins on `res.locals` to ease usage of forms, translations, and some other things.

It takes in two arguments, a `fields` object containing field configuration, and an [options object](#options).

## Installation

```javascript
npm install [--save] hmpo-template-mixins;
```

## Usage

```javascript
var express = require('express');

var i18n = require('i18n-future');

var fields = require('./routes/renew-your-passport/fields');

app.set('view engine', 'html');
app.set('views', path.join(__dirname, '/views'));

app.use(i18n.middleware());
app.use(require('hmpo-template-mixins')(fields, { sharedTranslationsKey: 'passport.renew' }));

app.use(function (req, res) {
    // NOTE: res.locals.partials has been set.

    res.render('example-template');
});
```

## Translation

By default any function set to `req.translate` will be used for translation if it exists. For example, that generated using [i18n-future](https://npmjs.com/package/i18n-future) middleware.

## Options

### viewsDirectory

Allows you override the directory that the module checks for partials in - Default: the root of this project

### viewEngine

Allows you to alter the file extension of the templates - Default: 'html'

### sharedTranslationsKey

Prefixes keys for translation - Default: ''

### translate

Defines a custom translation method - Default: `req.translate`

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

## Options

- `className`: A string or array of string class names.
- `label`: The intended value of the HTML `label` attribute.
- `type`: The value of the HTML input `type` attribute.
- `required`: Value applied to `aria-required` HTML attribute.
- `hint`: This adds context to the label, which it is a part of, for input text, radio groups and textarea. It is used within the input by aria-describedby for screen readers.
- `maxlength`: Applicable to text-based fields and mapped to the `maxlength` HTML attribute.
- `options`: Applicable to HTML `select` and `radio` controls and used to generate the items of either HTML element.
  Here is an example of it being used on radio buttons asking if someone's passport has changed:
  ```
  'use strict';

  module.exports = {
    'passportChanged': {
      validate: ['required'],
      className: ['inline', 'form-group'],
      legend: {
        className: ['visuallyhidden']
      },
      options: [{
        value: 'Yes',
        label: 'Yes'
      }, {
        value: 'No',
        label: 'No'
      }]
    }
  };
  ```
- `selected`: Applicable to `select`, `checkbox`, and `radio` controls. Will render the selected HTML option/element selected or checked.
- `legend`: Applicable to `radio` button controls, which are wrapped in a HTML `fieldset` with a `legend` element.
- `legendClassName`: Applied as a class name to HTML `legend` attribute.
- `labelClassName`: Applicable to mixins with a `label` attribute where you can set its CSS class.
- `validate`: Applicate to nearly all mixins requiring user input to check whether a selection has been made and, if
this fails, what validation should be displayed on the page.
- `toggle`: Can be used to toggle the display of the HTML element with a matching `id`. See [passports-frontend-toolkit](https://github.com/UKHomeOffice/passports-frontend-toolkit/blob/master/assets/javascript/progressive-reveal.js) for details.
- `attributes`: A hash of key/value pairs applicable to a HTML `textarea` field. Each key/value is assigned as an attribute of the `textarea`. For example `spellcheck="true"`. It can also be applied to other fields such as `input-text` for instance. It can be applied in your `/apps/<app name>/fields` folder in the relevant file like so:
  ```
  'use strict';

  module.exports = {
    <field name>: {
      attributes: [{
        attribute: <key>,
        value: <value>
      }]
    },
  }
  ```
  Here is an example where an `input-text` field is being
  prepopulated with an example email e.g. `value="example@hotmail.com"`:
  ```
  'use strict';

  module.exports = {
    'emailAddress': {
      validate: ['required', 'email'],
      attributes: [{
        attribute: 'value',
        value: 'example@hotmail.com'
      }]
    }
  };
  ```

- `child`: Render a child partial beneath each option in an `optionGroup`. Accepts a custom mustache template string, a custom partial in the format `partials/{your-partial-name}` or a template mixin key which will be rendered within a panel element partial.
