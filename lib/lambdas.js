'use strict';

const debug = require('debug')('hmpo:mixins:lambdas');

const _ = require('underscore');
const path = require('path');
const moment = require('moment');
const Hogan = require('hogan.js');


let hoganRender = (text, ctx) => {
    if (!text) { return ''; }
    return Hogan.compile(text).render(ctx);
};

let lambdas = {
    currencySymbol: '£',

    currency(txt) {
        txt = hoganRender(txt, this);
        var value = parseFloat(txt);
        if (isNaN(value)) {
            return txt;
        } else if (value % 1 === 0) {
            value = value.toString();
        } else {
            value = value.toFixed(2);
        }
        return this.currencySymbol + value;
    },

    currencyOrFree(txt) {
        var value = parseFloat(hoganRender(txt, this));
        if (value === 0) {
            return this.translate().call(this, 'free');
        }
        return this.currency().call(this, txt);
    },

    date(txt) {
        debug('DATE', txt, this);
        txt = hoganRender(txt, this).split('|');
        let value = txt[0];
        let format = txt[1] || 'D MMMM YYYY';
        return moment(value).format(format);
    },

    hyphenate(txt) {
        var value = hoganRender(txt, this);
        return value.trim().toLowerCase().replace(/\s+/g, '-');
    },

    uppercase(txt) {
        return hoganRender(txt, this).toUpperCase();
    },

    lowercase(txt) {
        return hoganRender(txt, this).toLowerCase();
    },

    capscase(txt) {
        txt = hoganRender(txt, this);
        return txt.substr(0, 1).toUpperCase() + txt.substr(1);
    },

    /**
    * Use on whole sentences
    */
    time(txt) {
        txt = hoganRender(txt, this).split('|');
        let value = txt[0];
        let options = txt[1] || 'short,midnight,midday';
        options = _.indexBy(options.split(/\s*,\s*/));
        if (options.midnight) {
            value = value.replace(/12:00am/ig, 'midnight');
            value = value.replace(/^midnight/, 'Midnight');
        }
        if (options.midday) {
            value = value.replace(/12:00pm/ig, 'midday');
            value = value.replace(/^midday/, 'Midday');
        }
        if (options.short) {
            value = value.replace(/:00(am|pm)/ig, '$1');
        }
        return value;
    },

    t(txt) {
        txt = hoganRender(txt, this);
        return this.translate().call(this, txt);
    },

    url(url) {
        url = hoganRender(url, this);
        return this.baseUrl ? path.resolve(this.baseUrl, url) : url;
    }
};

let addLambdas = options => {
    options = Object.assign({
        sharedTranslationsKey: ''
    }, options);
    if (options.sharedTranslationsKey.match(/[^.]$/)) options.sharedTranslationsKey += '.';

    return (req, res) => {
        debug('adding lambdas');
        let translate = options.translate || req.translate || _.identity;
        res.locals.translate = () => function (key) {
            if (options.sharedTranslationsKey) {
                if (Array.isArray(key)) {
                    key = key.map(k => options.sharedTranslationsKey + k);
                } else  {
                    key = options.sharedTranslationsKey + key;
                }
            }
            debug('translate', key);
            return hoganRender(translate(key), this);
        };

        _.each(lambdas, (lambda, name) => {
            res.locals[name] = typeof lambda !== 'function' ? lambda : () => function (txt) {
                let ctx = Object.assign({}, res.locals, this);
                return lambda.call(ctx, txt);
            };
        });
    };
};

module.exports = {
    lambdas,
    hoganRender,
    addLambdas
};
