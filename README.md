# passports-template-mixins
A middleware that exposes a series of Mustache mixins on `res.locals` to ease usage of forms, translations, and some other things.

It takes in three arguments [`t` a function that shall be executed to translate keys into strings of the current locale](https://github.com/i18next/i18next-node), a `fields` object describing config related to the keys that are passed into the mixins that refer to fields, and an options object that has three keys `viewsDirectory` that allows you override the directory that the module checks for partials in (defaults to looking inside the root of this project), `viewEngine` which allows you to alter the file extension of the templates, and `sharedTranslationsKey` which stores a relative key from which to look for field and button translations.

## Installation

```javascript
npm install [--save] hmpo-template-mixins;
```

## Usage

```javascript
var express = require('express');
var i18n = require('i18next');

var fields = require('./routes/renew-your-passport/fields');

app.set('view engine', 'html');
app.set('views', path.join(__dirname, '/views'));
app.use(require('hmpo-template-mixins')(i18n.t, fields, { sharedTranslationsKey: 'passport.renew' }));

app.use(function (req, res) {
    // NOTE: res.locals.partials has been set.

    res.render('example-template');
});
```

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
input-text-hidden-label
input-text-code
input-phone
radio-group
checkbox
checkbox-compound
checkbox-required
input-submit
input-email
```
