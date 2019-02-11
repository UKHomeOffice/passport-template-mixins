'use strict';

const lambdas = require('../../lib/lambdas');
const _ = require('underscore');

describe('Template Mixins lambdas', () => {
    describe('addLambdas', () => {
        let req, res;

        beforeEach(() => {
            req = {
            };

            res = {
                locals: {}
            };
        });

        it('is a function', () => {
            lambdas.addLambdas.should.be.a('function');
        });

        it('returns a function', () => {
            lambdas.addLambdas().should.be.a('function');
            lambdas.addLambdas().length.should.equal(2);
        });

        describe('adds lambdas and values into res.locals', () => {
            beforeEach(() => {
                lambdas.addLambdas()(req, res);
            });

            _.each(lambdas.lambdas, (lambda, name) => {
                if (typeof lambda === 'function') {
                    it(`lambda ${name}`, () => {
                        res.locals[name].should.be.a('function');
                        res.locals[name]().should.be.a('function');
                    });
                } else {
                    it(`value ${name}`, () => {
                        res.locals[name].should.equal(lambda);
                    });
                }
            });
        });

        describe('adds translate function into res.locals', () => {
            let translate;
            beforeEach(() => {
                translate = sinon.stub().returns('translated');
            });

            it('calls translate function', () => {
                lambdas.addLambdas({ translate })(req, res);
                res.locals.translate.should.be.a('function');
                let result = res.locals.translate()('args');
                translate.should.have.been.calledWithExactly('args');
                result.should.equal('translated');
            });

            it('adds sharedTranslationsKey to keys', () => {
                lambdas.addLambdas({ translate, sharedTranslationsKey: 'foo' })(req, res);
                res.locals.translate()('args');
                translate.should.have.been.calledWithExactly('foo.args');
            });

            it('adds sharedTranslationsKey to array of keys', () => {
                lambdas.addLambdas({ translate, sharedTranslationsKey: 'foo' })(req, res);
                res.locals.translate()(['arg1', 'arg2']);
                translate.should.have.been.calledWithExactly(['foo.arg1', 'foo.arg2']);
            });
        });
    });

    describe('Template Mixins lambdas', () => {
        let middleware, req, res, translate;

        beforeEach(() => {
            req = {
            };
            res = {
                locals: {
                }
            };

            translate = sinon.stub().returnsArg(0);
            middleware = lambdas.addLambdas({
                translate
            });
            middleware(req, res);
        });

        describe('t', () => {
            it('adds a function to res.locals', () => {
                res.locals['t'].should.be.a('function');
            });

            it('returns a function', () => {
                res.locals['t']().should.be.a('function');
            });

            it('calls translate passing the given key', () => {
                res.locals['t']().call(res.locals, 'fields.field-1.label');
                translate.should.have.been.calledOnce.and.calledWithExactly('fields.field-1.label');
            });

            it('looks up variables in the returned translation', () => {
                res.locals.foo = 'bar';
                translate.withArgs('fields.field-1.label').returns('some text {{foo}}');
                res.locals['t']().call(res.locals, 'fields.field-1.label').should.be.equal('some text bar');
            });

            it('looks up variables in the returned translation with a shared translation key', () => {
                middleware = lambdas.addLambdas({
                    translate,
                    sharedTranslationsKey: 'shared.key'
                });
                middleware(req, res);
                res.locals.foo = 'bar';
                translate.withArgs('shared.key.fields.field-1.label').returns('some text {{foo}}');
                res.locals['t']().call(res.locals, 'fields.field-1.label').should.be.equal('some text bar');
            });
        });

        describe('date', () => {
            it('adds a function to res.locals', () => {
                res.locals['date'].should.be.a('function');
            });

            it('returns a function', () => {
                res.locals['date']().should.be.a('function');
            });

            it('formats a date', () => {
                res.locals['date']().call(res.locals, '2015-03-26').should.equal('26 March 2015');
            });

            it('applys a date format if specified', () => {
                res.locals['date']().call(res.locals, '2015-03|MMMM YYYY').should.equal('March 2015');
            });

        });

        describe('time', () => {
            it('adds a function to res.locals', () => {
                res.locals['time'].should.be.a('function');
            });

            it('returns a function', () => {
                res.locals['time']().should.be.a('function');
            });

            it('changes 12:00am to midnight', () => {
                res.locals['time']().call(res.locals, '26 March 2015 12:00am').should.equal('26 March 2015 midnight');
            });

            it('changes 12:00pm to midday', () => {
                res.locals['time']().call(res.locals, '26 March 2015 12:00pm').should.equal('26 March 2015 midday');
            });

            it('changes leading 12:00am to Midnight', () => {
                res.locals['time']().call(res.locals, '12:00am 26 March 2015').should.equal('Midnight 26 March 2015');
            });

            it('changes leading 12:00pm to Midday', () => {
                res.locals['time']().call(res.locals, '12:00pm 26 March 2015').should.equal('Midday 26 March 2015');
            });

            it('changes 4:00pm to 4pm', () => {
                res.locals['time']().call(res.locals, '26 March 2015 4:00pm').should.equal('26 March 2015 4pm');
            });

            it('changes 12:00pm to 12pm if options only specify short', () => {
                res.locals['time']().call(res.locals, '26 March 2015 12:00pm|short').should.equal('26 March 2015 12pm');
            });

            it('changes 12:00am to 12am if options do not specify midnight', () => {
                res.locals['time']().call(res.locals, '26 March 2015 12:00am|short,midday').should.equal('26 March 2015 12am');
            });

            it('should pass through other time formats', () => {
                res.locals['time']().call(res.locals, '6:30am 26 March 2015').should.equal('6:30am 26 March 2015');
            });

            it('returns the unchanged time with no options specified', () => {
                res.locals['time']().call(res.locals, '26 March 2015 12:00pm|none').should.equal('26 March 2015 12:00pm');
            });
        });

        describe('uppercase', () => {
            it('adds a function to res.locals', () => {
                res.locals['uppercase'].should.be.a('function');
            });

            it('returns a function', () => {
                res.locals['uppercase']().should.be.a('function');
            });

            it('changes text to uppercase', () => {
                res.locals['uppercase']().call(res.locals, 'abcdEFG').should.equal('ABCDEFG');
            });

            it('returns an empty string if no text given', () => {
                res.locals['uppercase']().call(res.locals).should.equal('');
            });
        });

        describe('lowercase', () => {

            beforeEach(() => {
                middleware(req, res);
            });

            it('adds a function to res.locals', () => {
                res.locals['lowercase'].should.be.a('function');
            });

            it('returns a function', () => {
                res.locals['lowercase']().should.be.a('function');
            });

            it('changes text to lowercase', () => {
                res.locals['lowercase']().call(res.locals, 'abcdEFG').should.equal('abcdefg');
            });

            it('returns an empty string if no text given', () => {
                res.locals['lowercase']().call(res.locals).should.equal('');
            });
        });

        describe('capscase', () => {

            beforeEach(() => {
                middleware(req, res);
            });

            it('adds a function to res.locals', () => {
                res.locals['capscase'].should.be.a('function');
            });

            it('returns a function', () => {
                res.locals['capscase']().should.be.a('function');
            });

            it('changes text to capscase', () => {
                res.locals['capscase']().call(res.locals, 'abcdef').should.equal('Abcdef');
            });

            it('capitalisaes only the first word', () => {
                res.locals['capscase']().call(res.locals, 'abc def').should.equal('Abc def');
            });

            it('does not change capitalisation of other words', () => {
                res.locals['capscase']().call(res.locals, 'abc DEF Hij').should.equal('Abc DEF Hij');
            });

            it('returns an empty string if no text given', () => {
                res.locals['capscase']().call(res.locals).should.equal('');
            });
        });

        describe('currency', () => {

            beforeEach(() => {
                middleware(req, res);
            });

            it('adds a function to res.locals', () => {
                res.locals['currency'].should.be.a('function');
            });

            it('returns a function', () => {
                res.locals['currency']().should.be.a('function');
            });

            it('formats whole numbers with no decimal places', () => {
                res.locals['currency']().call(res.locals, '3.00').should.equal('£3');
            });

            it('formats 3.50 to two decimal places', () => {
                res.locals['currency']().call(res.locals, '3.50').should.equal('£3.50');
            });

            it('formats and rounds 3.567 to two decimal places', () => {
                res.locals['currency']().call(res.locals, '3.567').should.equal('£3.57');
            });

            it('formats 4.5678 to two decimal places from a local variable', () => {
                res.locals.value = 4.5678;
                res.locals['currency']().call(res.locals, '{{value}}').should.equal('£4.57');
            });

            it('returns non float text as is', () => {
                res.locals['currency']().call(res.locals, 'test').should.equal('test');
            });

            it('returns non float template text as is', () => {
                res.locals.value = 'test';
                res.locals['currency']().call(res.locals, '{{value}}').should.equal('test');
            });

            it('returns an empty string if no text given', () => {
                res.locals['currency']().call(res.locals).should.equal('');
            });

            it('formats whole numbers with custom currency symbol', () => {
                res.locals.currencySymbol = '$';
                res.locals['currency']().call(res.locals, '3.00').should.equal('$3');
            });
        });

        describe('currencyOrFree', () => {

            beforeEach(() => {
                middleware(req, res);
            });

            it('adds a function to res.locals', () => {
                res.locals['currencyOrFree'].should.be.a('function');
            });

            it('returns a function', () => {
                res.locals['currencyOrFree']().should.be.a('function');
            });

            it('formats whole numbers with no decimal places', () => {
                res.locals['currencyOrFree']().call(res.locals, '3.00').should.equal('£3');
            });

            it('formats 3.50 to two decimal places', () => {
                res.locals['currencyOrFree']().call(res.locals, '3.50').should.equal('£3.50');
            });

            it('formats 4.5678 to two decimal places from a local variable', () => {
                res.locals.value = 4.5678;
                res.locals['currencyOrFree']().call(res.locals, '{{value}}').should.equal('£4.57');
            });

            it('returns zero as free', () => {
                res.locals['currencyOrFree']().call(res.locals, '0').should.equal('free');
            });

            it('returns 0.00 as free', () => {
                res.locals['currencyOrFree']().call(res.locals, '0.00').should.equal('free');
            });

            it('returns 0.00 from a variable as free', () => {
                res.locals.value = 0.00;
                res.locals['currencyOrFree']().call(res.locals, '{{value}}').should.equal('free');
            });

            it('returns non number as-is', () => {
                res.locals['currencyOrFree']().call(res.locals, 'test').should.equal('test');
            });

            it('returns empty string as-is', () => {
                res.locals['currencyOrFree']().call(res.locals, '').should.equal('');
            });
        });

        describe('hyphenate', () => {

            beforeEach(() => {
                middleware(req, res);
            });

            it('adds a function to res.locals', () => {
                res.locals['hyphenate'].should.be.a('function');
            });

            it('returns a function', () => {
                res.locals['hyphenate']().should.be.a('function');
            });

            it('hyphenates a string with a single whitespace character', () => {
                res.locals['hyphenate']().call(res.locals, 'apple blackberry').should.equal('apple-blackberry');
            });

            it('hyphenates a string with multiple whitespace characters', () => {
                res.locals['hyphenate']().call(res.locals, 'apple  blackberry   cherry').should.equal('apple-blackberry-cherry');
            });

        });

        describe('url', () => {

            beforeEach(() => {
            });

            it('prepends the baseUrl to relative paths', () => {
                res.locals.baseUrl = '/base';
                middleware(req, res);
                res.locals.url().call(res.locals, './path').should.equal('/base/path');
                res.locals.url().call(res.locals, 'path').should.equal('/base/path');
            });

            it('returns path if baseUrl is not set', () => {
                res.locals.baseUrl = undefined;
                middleware(req, res);
                res.locals.url().call(res.locals, 'path').should.equal('path');
                res.locals.url().call(res.locals, './path').should.equal('./path');
            });

            it('does not prepend the baseUrl to absolute paths', () => {
                res.locals.baseUrl = '/base';
                middleware(req, res);
                res.locals.url().call(res.locals, '/path').should.equal('/path');
            });

            it('supports urls defined in template placeholders', () => {
                res.locals.baseUrl = '/base';
                res.locals.href = './link';
                middleware(req, res);
                res.locals.url().call(res.locals, '{{href}}').should.equal('/base/link');
            });

        });

        describe('Multiple lambdas', () => {

            it('recursively runs lambdas wrapped in other lambdas correctly', () => {
                middleware(req, res);
                res.locals.value = '2016-01-01T00:00:00.000Z';
                let result = res.locals['uppercase']().call(res.locals,
                    '{{#time}}{{#date}}{{value}}|h:mma on D MMMM YYYY{{/date}}{{/time}}');
                result.should.equal('MIDNIGHT ON 1 JANUARY 2016');
            });

        });
    });
});
