var mixins = require('../lib/template-mixins');

var Hogan = require('hogan.js');

function translate(key) {
    return key;
}

describe('Template Mixins', function () {

    var req, res, next, render, middleware;

    beforeEach(function () {
        req = {};
        res = {
            locals: {}
        };
        next = sinon.stub();
    });

    it('returns a middleware', function () {
        mixins().should.be.a('function');
        mixins().length.should.equal(3);
    });

    it('calls next', function () {
        mixins()(req, res, next);
        next.should.have.been.calledOnce;
    });

    describe('with stubbed Hogan', function () {

        beforeEach(function () {
            render = sinon.stub();
            sinon.stub(Hogan, 'compile').returns({
                render: render
            });
        });

        afterEach(function () {
            Hogan.compile.restore();
        });

        describe('input-text', function () {

            beforeEach(function () {
                middleware = mixins(translate, {});
            });

            it('adds a function to res.locals', function () {
                middleware(req, res, next);
                res.locals['input-text'].should.be.a('function');
            });

            it('returns a function', function () {
                middleware(req, res, next);
                res.locals['input-text']().should.be.a('function');
            });

            it('looks up field label', function () {
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'fields.field-name.label'
                }));
            });

            it('prefixes translation lookup with namespace if provided', function () {
                middleware = mixins(translate, {}, { sharedTranslationsKey: 'name.space' });
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'name.space.fields.field-name.label'
                }));
            });

            it('should have classes if one or more were specified against the field', function () {
                middleware = mixins(translate, {
                    'field-name': {
                        'className': ['abc', 'def']
                    }
                });
                middleware(req, res, next);
                res.locals['input-text']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    className: 'abc def'
                }));
            });

            it('uses maxlength property set at a field level over default option', function () {
                middleware = mixins(translate, {
                    'field-name': {
                        'validate': [
                            { type: 'maxlength', arguments: 10 }
                        ]
                    }
                });
                middleware(req, res, next);
                res.locals['input-phone']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    maxlength: 10
                }));
            });

            it('uses locales translation property', function () {
                middleware = mixins(sinon.stub().withArgs({'label': 'field-name.label'}).returns('Field name'), {
                    'field-name': {
                        'label': 'field-name.label'
                    }
                });
                middleware(req, res, next);
                res.locals['input-phone']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'Field name'
                }));
            });

        });

        describe('input-date', function () {

            beforeEach(function () {
                middleware = mixins(translate, {});
            });

            it('adds a function to res.locals', function () {
                middleware(req, res, next);
                res.locals['input-date'].should.be.a('function');
            });

            it('returns a function', function () {
                middleware(req, res, next);
                res.locals['input-date']().should.be.a('function');
            });

            it('renders thrice if the field is not marked as inexact', function () {
                middleware(req, res, next);
                res.locals['input-date']().call(res.locals, 'field-name');
                render.should.have.been.calledThrice;
            });

            it('renders twice if the field is marked as inexact', function () {
                var middlewareWithFieldNameMarkedAsInexact = mixins(translate, {
                    'field-name': {
                        'inexact': true
                    }
                });
                middlewareWithFieldNameMarkedAsInexact(req, res, next);
                res.locals['input-date']().call(res.locals, 'field-name');
                render.should.have.been.calledTwice;
            });

            it('looks up field label', function () {
                middleware(req, res, next);
                res.locals['input-date']().call(res.locals, 'field-name');

                render.called;

                var dayCall = render.getCall(0),
                    monthCall = render.getCall(1),
                    yearCall = render.getCall(2);

                dayCall.should.have.been.calledWith(sinon.match({
                  label: 'fields.field-name-day.label'
                }));

                monthCall.should.have.been.calledWith(sinon.match({
                  label: 'fields.field-name-month.label'
                }));

                yearCall.should.have.been.calledWith(sinon.match({
                  label: 'fields.field-name-year.label'
                }));
            });

            it('prefixes translation lookup with namespace if provided', function () {
                middleware = mixins(translate, {}, { sharedTranslationsKey: 'name.space' });
                middleware(req, res, next);
                res.locals['input-date']().call(res.locals, 'field-name');

                render.called;

                var dayCall = render.getCall(0),
                    monthCall = render.getCall(1),
                    yearCall = render.getCall(2);

                dayCall.should.have.been.calledWith(sinon.match({
                  label: 'name.space.fields.field-name-day.label'
                }));

                monthCall.should.have.been.calledWith(sinon.match({
                  label: 'name.space.fields.field-name-month.label'
                }));

                yearCall.should.have.been.calledWith(sinon.match({
                  label: 'name.space.fields.field-name-year.label'
                }));
            });

        });

        describe('input-submit', function () {

            beforeEach(function () {
                middleware = mixins(translate, {});
            });

            it('adds a function to res.locals', function () {
                middleware(req, res, next);
                res.locals['input-submit'].should.be.a('function');
            });

            it('returns a function', function () {
                middleware(req, res, next);
                res.locals['input-submit']().should.be.a('function');
            });

            it('looks up button value with default key of "next"', function () {
                middleware(req, res, next);
                res.locals['input-submit']().call(res.locals);
                render.should.have.been.calledWith(sinon.match({
                    value: 'buttons.next'
                }));
            });

            it('looks up button value with key if provided', function () {
                middleware(req, res, next);
                res.locals['input-submit']().call(res.locals, 'button-id');
                render.should.have.been.calledWith(sinon.match({
                    value: 'buttons.button-id'
                }));
            });

            it('prefixes translation lookup with namespace if provided', function () {
                middleware = mixins(translate, {}, { sharedTranslationsKey: 'name.space' });
                middleware(req, res, next);
                res.locals['input-submit']().call(res.locals, 'button-id');
                render.should.have.been.calledWith(sinon.match({
                    value: 'name.space.buttons.button-id'
                }));
            });

        });

        describe('input-email', function () {

            beforeEach(function () {
                middleware = mixins(translate, {});
            });

            it('adds a function to res.locals', function () {
                middleware(req, res, next);
                res.locals['input-email'].should.be.a('function');
            });

            it('returns a function', function () {
                middleware(req, res, next);
                res.locals['input-email']().should.be.a('function');
            });

            it('looks up field label', function () {
                middleware(req, res, next);
                res.locals['input-email']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'fields.field-name.label'
                }));
            });

            it('prefixes translation lookup with namespace if provided', function () {
                middleware = mixins(translate, {}, { sharedTranslationsKey: 'name.space' });
                middleware(req, res, next);
                res.locals['input-email']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'name.space.fields.field-name.label'
                }));
            });

            it('should have classes if one or more were specified against the field', function () {
                middleware = mixins(translate, {
                    'field-name': {
                        'className': ['abc', 'def']
                    }
                });
                middleware(req, res, next);
                res.locals['input-email']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    className: 'abc def'
                }));
            });

            it('has email type property', function () {
                middleware(req, res, next);
                res.locals['input-email']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    type: 'email'
                }));
            });

            it('has a default pattern property', function () {
                middleware(req, res, next);
                res.locals['input-email']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    pattern: '/^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/'
                }));
            });

            it('uses pattern property set at a field level over default option', function () {
                middleware = mixins(translate, {
                    'field-name': {
                        'validate': [
                            { type: 'pattern', arguments: '/^[a-zA-Z0-9]$/' }
                        ]
                    }
                });
                middleware(req, res, next);
                res.locals['input-email']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    pattern: '/^[a-zA-Z0-9]$/'
                }));
            });

            it('uses locales translation property', function () {
                middleware = mixins(sinon.stub().withArgs({'label': 'field-name.label'}).returns('Field name'), {
                    'field-name': {
                        'label': 'field-name.label'
                    }
                });
                middleware(req, res, next);
                res.locals['input-email']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'Field name'
                }));
            });

        });

        describe('checkbox', function () {

            beforeEach(function () {
                middleware = mixins(translate, {});
            });

            it('adds a function to res.locals', function () {
                middleware(req, res, next);
                res.locals['checkbox'].should.be.a('function');
            });

            it('returns a function', function () {
                middleware(req, res, next);
                res.locals['checkbox']().should.be.a('function');
            });

            it('looks up field label', function () {
                middleware(req, res, next);
                res.locals['checkbox']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'fields.field-name.label'
                }));
            });

            it('prefixes translation lookup with namespace if provided', function () {
                middleware = mixins(translate, {}, { sharedTranslationsKey: 'name.space' });
                middleware(req, res, next);
                res.locals['checkbox']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'name.space.fields.field-name.label'
                }));
            });

            it('uses locales translation property', function () {
                middleware = mixins(sinon.stub().withArgs({'label': 'field-name.label'}).returns('Field name'), {
                    'field-name': {
                        'label': 'field-name.label'
                    }
                });
                middleware(req, res, next);
                res.locals['checkbox']().call(res.locals, 'field-name');
                render.should.have.been.calledWith(sinon.match({
                    label: 'Field name'
                }));
            });

        });

    });

    describe('without stubbed Hogan', function () {

        describe('date', function () {

            beforeEach(function () {
                middleware = mixins(translate, {});
            });

            it('adds a function to res.locals', function () {
                middleware(req, res, next);
                res.locals['date'].should.be.a('function');
            });

            it('returns a function', function () {
                middleware(req, res, next);
                res.locals['date']().should.be.a('function');
            });

            it('formats a date', function () {
                middleware(req, res, next);
                res.locals['date']().call(res.locals, '2015-03-26').should.equal('26 March 2015');
            });

            it('applys a date format if specified', function () {
                middleware(req, res, next);
                res.locals['date']().call(res.locals, '2015-03|MMMM YYYY').should.equal('March 2015');
            });

        });

        describe('hyphenate', function () {

            beforeEach(function () {
                Hogan = require('hogan.js');
                middleware = mixins(translate, {});
            });

            it('adds a function to res.locals', function () {
                middleware(req, res, next);
                res.locals['hyphenate'].should.be.a('function');
            });

            it('returns a function', function () {
                middleware(req, res, next);
                res.locals['hyphenate']().should.be.a('function');
            });

            it('hyphenates a string with a single whitespace character', function () {
                middleware(req, res, next);
                res.locals['hyphenate']().call(res.locals, 'apple blackberry').should.equal('apple-blackberry');
            });

            it('hyphenates a string with multiple whitespace characters', function () {
                middleware(req, res, next);
                res.locals['hyphenate']().call(res.locals, 'apple  blackberry   cherry').should.equal('apple-blackberry-cherry');
            });

        });

        describe('url', function () {

            beforeEach(function () {
                middleware = mixins(translate, {});
            });

            it('prepends the baseUrl to relative paths', function () {
                req.baseUrl = '/base';
                middleware(req, res, next);
                res.locals.url().call(res.locals, './path').should.equal('/base/path');
                res.locals.url().call(res.locals, 'path').should.equal('/base/path');
            });

            it('does not prepend the baseUrl to absolute paths', function () {
                req.baseUrl = '/base';
                middleware(req, res, next);
                res.locals.url().call(res.locals, '/path').should.equal('/path');
            });

            it('supports urls defined in template placeholders', function () {
                req.baseUrl = '/base';
                res.locals.href = './link'
                middleware(req, res, next);
                res.locals.url().call(res.locals, '{{href}}').should.equal('/base/link');
            });

        });

    });

});
