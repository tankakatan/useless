/*  NOTE: WIP

    TODO: reference-counted Component

    Component model 2.0 (now exploiting superpowers provided by foundation.js).
    What for:

    -   Hierarchy management (parent-child relationship)
    -   Destructors ('destroy' method), propagating through hierarchy
    -   bindable on $prototypes, auto-disconnecting if involved component gets destroyed
    -   trigger/barrier on $prototypes, auto-disconnecting if involved component gets destroyed

    Component facility provides unified mechanics for deinitialization, thus allowing
    to freely combine distinct components into more complex structure with no need to
    know how to specifically deinitialize each of them.

    Use to define highly configurable/reusable objects having limited lifetime, holding
    system resources and organizing into hierarchies, e.g. UI components, like dialogs,
    menus, embeddable data views. They hold DOM references and bound events, so one needs
    to properly free those resources during deinitialization. Case studies:

    -   For example, a pop-up menu could render itself into top-level 'document' element, 
        so just by destroying its parent component's DOM, things created by this pop-up
        wont be destroyed, and that's why explicit 'destroy' method is needed. With
        Component, you call 'destroy' on parent component, and it propagates to child
        components automatically, triggering their 'destroy' methods.

    -   A component could dynamically bind to other components with help of $bindable and
        $trigger facilities. If such component gets destroyed, those links became invalid
        and should be removed, otherwise it's considered as 'memory leak'. Component handles
        such situation, removing those links if any involved component gets destroyed.

    Component could be considered as basic tool for dynamic code binding at macro level,
    promoting functional code binding tools (defined in dynamic/stream.js) to $prototypes.
 */

_.tests.component = {

    /*  - Passing config to constructor will extend constructed instance with that object
        - Component constructors exhibit CPS interface (last function argument interprets as continuation)
     */
    'constructor([cfg, ][then])': function () { $assertCalls (0, function (mkay) {

        var Compo = $component ({})

        /*  1. constructor (cfg)
         */
        $assertMatches (new Compo ({ foo: 42 }), { foo: 42 })

        /*  2. constructor (then)
         */
        //new Compo (mkay)

        /*  3. constructor (cfg, then)
         */
        /*$assertMatches (new Compo ({ foo: 42 }, mkay), { foo: 42 })*/ }) },


    /*  init() should be entry point to a component, calling at constructor by default
     */
    'init': function () { $assertCalls (1, function (mkay) {
                            $singleton (Component, {
                                init: function () {
                                    mkay () } }) }) },


    /*  init(then) means your initialization is defined in CPS style
     */
    /*'CPS init': function () { $assertCalls (2, function (mkay) {

                            var Compo = $prototype ({
                                init: function (then) { // you're required to call then, to complete init
                                    then () } })

                            var compo = new Compo (function () {
                                mkay () })

                            var compo2 = new Compo ({ _42: 42 }, function () {
                                $assert (this._42, 42)
                                mkay () }) }) },*/

    /*  constructor overriding is prohibited (by $final), use init() API for configuration means
     */
    'no constructor overriding': function () { $assertThrows (function () {
                                        $singleton (Component, {
                                            constructor: function () {} }) }) },


    /*  If you don't want init() to be called at constructor (to call it manually later),
        pass init:false to constructor's config
     */
    'manual init()': function () { $assertCalls (0, function (fail) {
                                        var Compo = $component ({ init: function () { fail () } })
                                        var compo = new Compo ({ init: false })
                                        $assert (typeof compo.init, 'function') }) }, // shouldn't be replaced by false


    /*  initialized is a _.barrier that opens after initialization
     */
    'initialized (barrier)': function () {
        var Compo = $component ({ init: function () {} })
        var compo = new Compo ({ init: false })

        $assert (!compo.initialized.already)
        $assertCalls (1, function (mkay) {
            compo.initialized (function () { mkay () })
            compo.init () }) },


    /*  Pluggable init/destroy with $traits (tests all combinations of CPS / sequential style method calling)
     */
    'pluggable init with $traits': function () {

        var Base = $component ({
            assertBeforeInitCalls: function () {
                $assertMatches (this, { foo: 'beforeInit called' }) } })

        var assertAfterInitCalls = function (Compo) {
            $assertCalls (1, function (mkay) {
                new Compo ().initialized (function () {
                    $assertMatches (this, { foo: 'afterInit called' }); mkay () }) }) }

        var assertTraitsInitCalls = function (trait) {

            //  CPS init()
            $assertCalls (1, function (mkay) {
                assertAfterInitCalls ($extends (Base, {
                    $trait: trait,
                    init: function (then) { this.assertBeforeInitCalls (); mkay (); then () } })) })

            //  Sequential init()
            $assertCalls (1, function (mkay) {
                assertAfterInitCalls ($extends (Base, {
                    $trait: trait,
                    init: function () { this.assertBeforeInitCalls (); mkay () } })) }) }

        //  Sequential afterInit/beforeInit
        assertTraitsInitCalls ($trait ({
            beforeInit: function () { this.foo = 'beforeInit called' },
            afterInit: function () { this.foo = 'afterInit called' } }))

        //  CPS afterInit/beforeInit
        assertTraitsInitCalls ($trait ({
            beforeInit: function (then) { this.foo = 'beforeInit called'; then () },
            afterInit: function (then) { this.foo = 'afterInit called'; then () } })) },


    /*  $defaults is convenient macro to extract _.defaults thing from init() to definition level
     */
    '$defaults': function () {
        var Trait = $trait ({ $defaults: { pff: 'pff' }})
        var Base = $component ({ $defaults: { foo: 12, qux: 'override me' } })
        var Derived = $extends (Base, {
            $trait: Trait,
            $defaults: { bar: 34, qux: 'overriden', obj: {} } })

        $assert (new Derived ().obj !== new Derived ().obj) // should clone $defaults at instance construction

        $assertMatches (new Derived (), { pff: 'pff', foo: 12, bar: 34, qux: 'overriden' }) },


    /*  Use $requires to specify required config params along with their type signatures
     */
    '$requires': function () {
        var SomeType = $prototype ()
        var CompoThatRequires = $component ({
                                    $requires: {
                                        foo: SomeType,                      // requires foo to be instance of SomeType
                                        ffu: { a: 'number', b: 'string' },  // breakdown test
                                        bar: 'number',
                                        qux: ['number'],
                                        baz: _.not (_.isEmpty) } })         // custom requirement predicate


        var DerivedCompoThatRequiresMore =
            $extends (CompoThatRequires, {
                $requires: { more: 'string' } })


        $assertFails (function () {
            new CompoThatRequires ({ baz: {} }) }) // $requires behaves like assertion in case of failure

        $assertFails (function () {
            new DerivedCompoThatRequiresMore ({ more: 'hey how about other requirements' }) })

        new DerivedCompoThatRequiresMore ({
            foo: new SomeType (),
            bar: 42,
            qux: [1,2,3],
            more: 'blah blah',
            ffu: { a: 1, b: '2' },
            baz: 'blahblah' }) },


    /*  $overrideThis is a macro that requires a method to be overriden
     */
    /*'overrideThis': function () {
        $assertThrows (function () { $singleton (Component, { foo: $overrideThis (function () {}) }) },
            _.matches ({ message: 'foo should be overriden' })) },*/


    /*  $bindable lifts _.bindable to Component level, opening new venues to hooking onto existing impl,
        in ad-hoc way, with no need to specify hard-coded callback structure beforehand.

        Use to implement common beforeXXX and afterXXX semantics.
     */
    '$bindable': function () { $assertCalls (3, function (mkay) {

        var compo = $singleton (Component, {
                        method: $bindable (function (x) { mkay ()
                            return 42 }) })

        compo.method.onBefore (function (_5) { mkay ()
            $assert (this === compo)
            $assert (_5, 5) })

        compo.method.onAfter (function (_5, _result) { mkay ()
            $assert (this === compo)
            $assert (_5, 5)
            $assert (_result, 42) })

        $assert (compo.method (5), 42) }) },


    /*  Trigger has many names in outer world, like Event, Signal (and legion of
        many other misleading buzzwords).

        In our implementation, Trigger is a partial case of 'stream' concept, which
        is a highly abstract functional I/O primitive for multicasting of data/events).
        See dynamic/stream.js for its amazingly simple implementation.

            1.  If called with some value arguments (or no argument), it performs
                multicast of these arguments to all bound listeners (readers).
                In terms of 'streams' that operation is called 'write'.

            2.  If called with function argument, it adds that function to the wait
                queue mentioned before. In terms of 'streams' it is called 'read'.

        Component manages those streams (defined by $-syntax at its prototype definition),
        auto-disconnecting bound methods, so that no method of Component bound
        to such streams will ever be called after destroy().
     */
    '$trigger': function () { $assertCalls (2, function (mkay) {
        
        var compo = $singleton (Component, {
                        mouseMoved: $trigger () })

        compo.mouseMoved (function (x, y) { $assert ([x, y], [7, 12]); mkay () })
        compo.mouseMoved (7, 12)
        compo.mouseMoved (7, 12) }) },


    /*  A variation of trigger. On 'write' operation, it flushes wait queue, so
        no callback bound previously gets called in future (until explicitly
        queued again by 'read' operation).
     */
    '$triggerOnce': function () {
        var compo = $singleton (Component, {
                        somthingHappened: $triggerOnce () })

        $assertCalls (2, function (mkay) {
            compo.somthingHappened (function (what) { $assert (what, 'somthin'); mkay () })
            compo.somthingHappened (function (what) { $assert (what, 'somthin'); mkay () })
            compo.somthingHappened ('somthin')  })

        $assertCalls (0, function (mkay) {
            compo.somthingHappened ('no one will receive that') }) },


    /*  Another variation of stream, having 'memory fence / memory barrier' semantics,
        widely known as synchronization primitive in concurrent programming.

            1.  At first, barrier is in closed state, putting any callback passed to it
                to a queue.

            2.  When barrier is called with value argument, it state changes to 'opened',
                triggering all queued callbacks with that value argument passed in.

            3.  After barrier had opened, any futher callback gets called immediately
                with that value argument passed before, i.e. short-circuits.
     */
    '$barrier': function () { $assertCalls (2, function (mkay) {
        
        var compo = $singleton (Component, {
                        hasMessage: $barrier () })

        compo.hasMessage (function (_msg) { $assert (_msg, 'mkay'); mkay () })
        compo.hasMessage ('mkay')
        compo.hasMessage (function (_msg) { $assert (_msg, 'mkay'); mkay () }) }) },


    /*  $observableProperty is a powerful compound mechanism for data-driven dynamic
        code binding, built around streams described previously.
     */
    '$observableProperty': function () { $assertCalls (2, function (mkay) {

        var Compo = $component ({
                        color: $observableProperty ('red'),
                        smell: $observableProperty (),
                        init: function () {
                            this.colorChange (function (now, prev) { mkay ()
                                $assert ([now, prev], ['blue', 'red']) }) } })

        var compo = new Compo ({
            color: 'blue' })

        compo.smellChange (function (now, was) { mkay ()
            $assert (compo.smell, now, 'bad')
            $assert (undefined,   was) })

        compo.smell = 'bad' }) },


    'hierarchy management': function () { $assertCalls (9, function (mkay) {
        
        var Compo = $extends (Component, {
            init:    function () { mkay () },
            destroy: function () { mkay () } })

        var parent = new Compo ().attach (
                        new Compo ().attach (
                            new Compo ()))

        var parrot = new Compo ()
                        .attachTo (parent)
                        .attachTo (parent)

        $assert (parrot.attachedTo === parent)
        $assert (parrot.detach ().attachedTo === undefined)

        var carrot = new Compo ()
        parent.attach (carrot)
        parent.attach (carrot)

        parent.destroy () })},


    'thiscall for streams': function () {
        
        var compo = $singleton (Component, {
            trig: $trigger () })

        compo.trig (function () {
            $assert (this === compo) })

        compo.trig.call ({}) },


    'observableProperty.force (regression)': function () { $assertCalls (1, function (mkay) {
        
        var compo = $singleton (Component, {
            prop: $observableProperty () })

        compo.prop = 42
        compo.propChange (function (value) {
            $assert (value, 42)
            $assert (this === compo)
            mkay () })

        compo.propChange.force () }) },


    'destroyAll()': function () { $assertCalls (2, function (mkay) {
        
        var Compo = $extends (Component, {
            destroy: function () { mkay () } })

        var parent = new Compo ()
                        .attach (new Compo ())
                        .attach (new Compo ())

        $assert (parent.attached.length === 2)

        parent.destroyAll ()
        parent.destroyAll ()

        $assert (parent.attached.length === 0) })},


    /*  Auto-unbinding
     */
    'unbinding (simple)': function () {
        var somethingHappened = _.trigger ()
        var compo = $singleton (Component, { fail: function () { $fail } })

        somethingHappened (compo.fail)
        compo.destroy ()
        somethingHappened () }, // should not invoke compo.fail


    /*  Regression tests
     */
    '(regression) was not able to define inner compos at singleton compos': function () {
        var Foo = $singleton (Component, {
            InnerCompo: $component ({
                foo: $observableProperty () }) })

        var Bar = $extends (Foo.InnerCompo, { bar: $observableProperty () })
        var bar = new Bar ()

        $assertTypeof (_.pick (bar, 'fooChange', 'barChange'), { fooChange: 'function', barChange: 'function' }) },

    '(regression) properties were evaluated before init': function () {
        $singleton (Component, { fail: $property (function () { $fail }) }) },

    '(regression) misinterpretation of definition': function () {
        $singleton (Component, { get: function () { $fail } }) },

    '(regression) alias incorrectly worked with destroy': function () {
            var test = $singleton (Component, {
                destroy: function () { mkay () },
                close: $alias ('destroy') })

            $assert (test.close, test.destroy) } }

/*  Syntax
 */
_([ 'bindable', 'trigger', 'triggerOnce', 'barrier', 'observable', 'observableProperty',
    'memoize', 'debounce', 'throttle', 'overrideThis'])
    .each (_.defineTagKeyword)

_.defineKeyword ('component', function (definition) {
    return $extends (Component, definition) })


/*  Make $defaults and $requires inherit base values
 */
$prototype.inheritsBaseValues = function (keyword) {
    $prototype.macro (keyword, function (def, value, name, Base) {
        _.defaults (value, Base && Base[keyword])

        if (def.$trait || def.$traits) {
            _.each ((def.$trait && [def.$trait]) || def.$traits, function (Trait) {
                _.defaults (value, Trait[keyword]) }) }

        def[keyword] = $static ($builtin ($property (_.constant (value))))
        return def }) } 

$prototype.inheritsBaseValues ('$defaults')
$prototype.inheritsBaseValues ('$requires')

/*  Impl
 */
Component = $prototype ({

    /*  Syntax helper
     */
    isStreamDefinition: $static (function (def) {
        return _.isObject (def) && (
            def.$trigger || def.$triggerOnce ||
            def.$barrier || def.$observable || def.$observableProperty) }),
    

    /*  Another helper (it was needed because _.methods actually evaluate $property values while enumerating keys,
        and it ruins most of application code, because it happens before Component is actually created).
     */
    enumMethods: function (iterator) {
        var methods = []
        for (var k in this) {
            var def = this.constructor.$definition[k]
            if (!(def && def.$property)) { var fn = this[k]
                if (_.isFunction (fn) && !$prototype.isConstructor (fn))  {
                    iterator.call (this, fn, k) } } } },

    /*  Thou shall not override this
     */
    constructor: $final (function (arg1, arg2) {

        var cfg                 = this.cfg = ((typeof arg1 === 'object') ? arg1 : {}),
            componentDefinition = this.constructor.$definition


        /*  Apply $defaults
         */
        if (this.constructor.$defaults) {
            _.defaults (this, _.cloneDeep (this.constructor.$defaults)) }


        /*  Add thiscall semantics to methods
            TODO: execute this substitution at $prototype code-gen level, not at instance level
         */
        this.enumMethods (function (fn, name) { if (name !== '$' && name !== 'init') { this[name] = this.$ (fn) } })


        /*  Listen self destroy method
         */
        _.onBefore  (this, 'destroy', this.beforeDestroy)
        _.onAfter   (this, 'destroy', this.afterDestroy)


        /*  Apply cfg thing (stream definitions, init and attach will be handled later)
         */
        _.extend (this, {
            parent_: undefined,
            children_: [] },
            _.omit (_.omit (cfg, 'init', 'attachTo', 'attach'), function (v, k) {
                    return Component.isStreamDefinition (componentDefinition[k]) }, this))

        /*  Expand macros
            TODO: execute this substitution at $prototype code-gen level, not at instance level
         */
        _.each (componentDefinition, function (def, name) {

            /*  Expand $observableProperty
             */
            if (def.$observableProperty) { var value = this[name]

                /*  xxxChange stream
                 */
                var observable  = this[name + 'Change'] = value ? _.observable (value) : _.observable ()
                    observable.context = this

                /*  property
                 */
                _.defineProperty (this, name, {
                        get: function ()  { return observable.value },
                        set: function (x) { observable.call (this, x) } }) }

            /*  Expand streams
             */
            else if (Component.isStreamDefinition (def)) {
                var stream =    (def.$trigger       ? _.trigger :
                                (def.$triggerOnce   ? _.triggerOnce :
                                (def.$observable    ? _.observable :
                                (def.$barrier       ? _.barrier : undefined)))) (this[name])

                this[name] = _.extend (stream, { context: this }) }

            /*  Expand $bindable
             */
            if (def.$bindable) { $assert (_.isFunction (this[name]))
                this[name] = _.bindable (this[name], this) }

            /*  Expand $debounce
             */
            if (def.$debounce) { var fn = this[name]
                this[name] = _.debounce (fn, fn.wait || 500, fn.immediate) }

            /*  Expand $throttle
             */
            if (def.$throttle) { var fn = this[name]
                this[name] = _.throttle (fn, fn.wait || 500, _.pick (fn, 'leading', 'trailing')) }

            /*  Expand $memoize
             */
            if (def.$memoize) {
                this[name] = _.memoize (this[name]) } }, this)

        

        /*  Bind stuff to init (either in CPS, or in sequential flow control style)
         */
        _.intercept (this, 'init', function (init) {
            var evalChain = _.hasArgs (this.constructor.prototype.init) ? _.cps.sequence : _.sequence
                evalChain ([this._beforeInit, init.bind (this), this._afterInit]).call (this) })

        /*  Fixup aliases (they're now pointing to nothing probably, considering what we've done at this point)
         */
        _.each (componentDefinition, function (def, name) {
            if (def.$alias) {
                this[name] = this[Tags.unwrap (def)] } }, this)


        /*  Check $overrideThis
         */
        /*_.each (componentDefinition, function (def, name) {
            if (def.$overrideThis && this[name] === undefined) {
                throw new Error (name + ' should be overriden') } })*/


        /*  Check $requires (TODO: make human-readable error reporting)
         */
        _.each (this.constructor.$requires, function (contract, name) {
            $assertTypeof (this[name], contract) }, this)


        /*  Call init (if not marked as deferred)
         */
        if (cfg.init !== false) {
            this.init () } }),

    /*  Arranges methods defined in $traits in chains and evals them
     */
    callTraitsMethod: function (name, then) {

        //  Continuation-passing style chain
        if (then) {
            _.cps.sequence (_.filterMap.call (this, this.constructor.$traits, function (Trait) {
                var method = Trait.prototype[name]
                return method && _.cps.arity0 ((
                    _.noArgs (method) ?             // convert to CPS convention if needed
                        method.asContinuation :
                        method)).bind (this) }).concat (then.arity0)) () }

        //  Sequential style chain
        else {
            _.sequence (_.filterMap.call (this, this.constructor.$traits, function (Trait) {
                var method = Trait.prototype[name]
                return method && (_.hasArgs (method) ?
                                    method.bind (this, _.identity) : // if method is CPS, give identity function as (unused) 'then' argument,
                                    method.bind (this)) })) () } },  // (to prevent errors, as trait methods not required to support both calling styles)

    /*  Lifecycle
     */
    _beforeInit: function (then) {
        if (this.initialized.already) {
            throw new Error ('Component: I am already initialized. Probably you\'re doing it wrong.') }

        this.callTraitsMethod ('beforeInit', then) },

    init: function (/* then */) {},

    _afterInit: function (then) { var cfg = this.cfg

        if (cfg.attach && !_.isFunction (cfg.attach)) {
            this.attach (cfg.attach) }

        if (cfg.attachTo && !_.isFunction (cfg.attachTo)) {
            this.attachTo (cfg.attachTo) }

        /*  Push initial values from cfg to target streams
         */
        _.each (this.constructor.$definition, function (def, name) {
            if (def.$observableProperty) { var change = name + 'Change'
                if (cfg[change])
                    this[change] (cfg[change])
                if (cfg[name]) {
                    this[name] = cfg[name] } }
            else if (Component.isStreamDefinition (def) && cfg[name]) {
                this[name] (cfg[name]) } }, this)

        this.callTraitsMethod ('afterInit', then)

        this.initialized (true) },
    
    initialized: $barrier (),

    beforeDestroy: function () {
        if (this.destroyed_) {
            throw new Error ('Component: I am already destroyed. Probably you\'re doing it wrong.') }
        if (this.destroying_) {
            throw new Error ('Component: Recursive destroy() call detected. Probably you\'re doing it wrong.') }
            this.destroying_ = true

        /*  Unbind streams
         */
        this.enumMethods (_.off)

        /*  Destroy children
         */
        _.each (this.children_, _.method ('destroy'))
                this.children_ = [] },

    destroy: function () {},

    afterDestroy: function () {

        _.each (this.constructor.$traits, function (Trait) {
            if (Trait.prototype.destroy) {
                Trait.prototype.destroy.call (this) } }, this)

        delete this.destroying_
        this.parent_ = undefined
        this.destroyed_ = true },


    /*  Parent manip.
     */ 
    attachedTo: $property (function () {
                            return this.parent_ }),

    attachTo: function (p) {
                    if (p === this) {
                        throw new Error ('smells like time-travel paradox.. how else can I be parent of myself?') }

                    if (this.parent_ !== p) {
                        if ((this.parent_) !== undefined) {
                            this.parent_.children_.remove (this) }
                            
                        if ((this.parent_ = p) !== undefined) {
                            this.parent_.children_.push (this) }} return this },

    detach: function () {
                return this.attachTo (undefined) },

    /*  Child manip.
     */
    attached: $property (function () {
                            return this.children_ }),

    attach: function (c) {
                _.invoke (_.coerceToArray (c), 'attachTo', this); return this },

    detachAll: function () {
                    _.each (this.children_, function (c) { c.parent_ = undefined })
                            this.children_ = []
                            return this },

    destroyAll: function () {
                    _.each (this.children_, function (c) { c.parent_ = undefined; c.destroy () })
                            this.children_ = []
                            return this }

})



