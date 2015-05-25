_ = require ('underscore')


/*  Function extensions
    ======================================================================== */

_.tests.Function = {

    /*  Converts regular function (which returns result) to CPS function (which passes result to 'then')
     */
    'asContinuation': function () { $assertCalls (2, function (mkay) {

        var twoPlusTwo = function () { return 2 + 2 }
        var shouldBeFour = function (result) {
            $assert (result == 4)
            mkay () }

        twoPlusTwo.asContinuation (shouldBeFour)
        _.asContinuation (twoPlusTwo) (shouldBeFour) }) },

    /*  Returns function that executed after _.delay
     */
    'delayed': function (testDone) {
        var eat42           = function (_42, then) { $assert (_42, 42); then () }
        var eat42_after5ms  = eat42.delayed (5)

        $assertCalls (1, function (mkay, done) {
            eat42_after5ms (42, function () { mkay (); done (); testDone () }) }) } }

/*  Impl.
 */
$extensionMethods (Function, {

    bind:           _.bind,
    partial:        _.partial,
    tails:          _.tails,
    tails2:         _.tails2,
    tails3:         _.tails3,
    compose:        _.compose,
    then:           _.then,
    flip:           _.flip,
    flip2:          _.flip2,
    flip3:          _.flip3,
    asFreeFunction: _.asFreeFunction,
    asMethod:       _.asMethod,

    asContinuation: function (f) {
        return $restArg (function () { _.last (arguments) (f.apply (this, _.initial (arguments))) }) },

    arity0:         _.arity0,
    arity1:         _.arity1,
    arity2:         _.arity2,
    arity3:         _.arity3,

    or:     _.or,
    and:    _.and,
    not:    _.not,

    applies: _.applies,

    memoized: _.memoize,
    throttled: _.throttle,
    debounced: _.debounce,

    delay: _.delay,
    delayed: function (fn, time) {
        return function () {
            var args = arguments, context = this
            _.delay (function () { fn.apply (context, args) }, time) } } })
