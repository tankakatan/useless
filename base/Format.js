/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
------------------------------------------------------------------------

NOTE:   This is really old and obsolete piece of code.
        Should revise, refactor, write tests.
        Also needs l10n for string constants.

------------------------------------------------------------------------
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - */

_ = require ('underscore')

Format = {

    /*  Use this to print objects as JavaScript (supports functions and $-tags output)
     */
    javascript: function (obj) {
        return _.stringify (obj, {
                    pretty: true,
                    pure: true,
                    formatter: function (x) {
                                    if (_.isTypeOf (Tags, x)) {
                                        return _.reduce (
                                                    _.keys (_.pick (x, _.keyIsKeyword)),
                                                        function (memo, key) { return key + ' ' + _.quote (memo, '()') },
                                                            _.stringify (Tags.unwrap (x))) }

                                    else if (_.isFunction (x)) {
                                        return x.toString () }

                                    else {
                                        return undefined } } }) },

    /*  example: _.urlencode ({ email: 'foo@bar.com', name: 'Боря' }) // gives 'email=foo%40bar%2ecom&name=%D0%91%D0%BE%D1%80%D1%8F'
     */
    urlencode: function (obj) {
        return _.map (obj, function (v, k) { 
            return k + '=' + _.fixedEncodeURIComponent (v) }).join ('&') },
    
    randomHexString: function (length) {
        var string = '';
        for (var i = 0; i < length; i++) {
            string += Math.floor (Math.random () * 16).toString (16) }
        return string },

    /*  TODO: l10n
     */
    monthNames: ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'],
    monthNamesCase: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
    monthNamesShort: ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
    
    bool: function (x) {
        return x ? 'Да' : 'Нет' },

    leadingZero: function (x) {
        return x < 10 ? '0' + x : x.toString () },

    sum: function (value) {
        var numberParts = value.toString ().split ('.')
        var decimal = numberParts[1] ? ('.' + numberParts[1]) : ''
        var major = numberParts[0]
        var prettyPrintedMajor = ''
        var negative = major[0] == '-'
        for (var i = 0; i < major.length; i++) {
            if ((major.length - i) % 3 == 0 && i > 0 && !(negative && i == 1)) {
                prettyPrintedMajor += " " }
            prettyPrintedMajor += major[i] }
        return prettyPrintedMajor + decimal },

    russianRoubles: function (value) {
        return Format.sum (value) + ' ₽' },

    russianRoublesSigned: function (value) {
        var cls = (value > 0) ? 'income' : ((value < 0) ? 'outcome' : '')
        return '<span class="' + cls + '">' + Format.sum (value) + '</span> ₽' },

    russianRoublesHtml: function (value) {
        return Format.sum (value) + ' <span class="rouble-sign"></span>' },

    phoneNumber: function (normalized) {
        var groups = ((normalized || '') + '').match(/(\d)(\d\d\d)(\d\d\d)(\d\d)(\d+)/)
        if (groups) {
            return '+' + groups[1] + ' (' + groups[2] + ') ' + groups[3] + '-' + groups[4] + '-' + groups[5] }
        else {
            return normalized } },

    plural: function (n, a, b, c) /* ex.: plural (21, 'час', 'часа', 'часов') */ {
        if (_.isArray (a)) {
            c = a[2]
            b = a[1]
            a = a[0] }
        var cases = [c, a, b, b, b, c]
        return n + ' ' + ((n % 100 > 4) && (n % 100 < 20) ? c : cases[Math.min(n % 10, 5)]) },
    
    cm: function (cm) {
        return cm + ' см' },

    kg: function (kg) {
        return kg + ' кг' },

    dateFromDate: function (date) {
        return (Format.leadingZero (date.getDate ()) + '.' +
            Format.leadingZero (date.getMonth () + 1) + '.' +
            Format.leadingZero (date.getFullYear () % 100)) },

    timeFromDate: function (date) {
        return (Format.leadingZero (date.getHours ()) + ':' +
            Format.leadingZero (date.getMinutes ())) },

    dateTimeFromDate: function (date) {
        return Format.dateFromDate (date) + ' ' + Format.timeFromDate (date) },

    dateFromTimestamp: function (timestamp) {
        return Format.dateFromDate (new Date (timestamp)) },

    dateTimeFromTimestamp: function (timestamp) {
        var date = new Date (timestamp)
        return (Format.dateFromDate (date) + ' <span class="time">' +
            Format.leadingZero (date.getHours ()) + ':' + Format.leadingZero (date.getMinutes ()) + '</span>') },


    /*  Calendar-accurate version of Format.relativeTime, use it to derive person's
        age from timestamp of the person's birth date:

            _.ageFromTimestamp (978296400000)                           // 13 лет
            _.ageFromTimestamp (978296400000, { withMonths: true })     // 13 лет 10 мес.
     */
    ageFromTimestamp: function (timestamp, cfg_) { // calendar-accurate version of relativeTime
        var cfg = cfg_ || {}
        var date = new Date (timestamp)
        var now = new Date ()
        var monthsDelta = Math.floor ((now.getFullYear () * 12 + now.getMonth ()) - (date.getFullYear () * 12 + date.getMonth ()))
        var years = Math.floor (monthsDelta / 12)
        var monthsRest = monthsDelta % 12
        var text = []
        if (monthsRest && (date.getDate () >= now.getDate ())) {
            monthsRest = monthsRest - 1 }
        if (years) {
            if ((date.getMonth () == now.getMonth ()) && (date.getDate () > now.getDate ())) {
                years = years - 1 }
            text.push (Format.plural (years, ['год', 'года', 'лет'])) }
        if (!years || (monthsRest && cfg.withMonths)) {
            text.push (Format.plural (monthsRest, ['мес.', 'мес.', 'мес.'])) }
        return text.join (' ') },


    /*  This is really silly and should be replaced by real date formatting utility. I wrote this
        while porting html templates from Django. Because the only format option we used was 'd.m.Y',
        it was considered to implement Format.date as a stub, accepting that only format option.
        Avoid using it in production code, as its only a back-compat stub, not a real utility.
     */
    date: function (timestamp, template) {
        if (template != "d.m.Y") {
            throw "unsupported format" }
        var date = new Date (timestamp)
        return (Format.leadingZero (date.getDay ()) + '.' +
                Format.leadingZero (date.getMonth () + 1) + '.' +
                date.getFullYear ()) },


    /*  This one should be calendar-accurate and general, but for now its just
        a hard-coded stub, solving a single particular case of use.

        TODO: rewrite (actually, write)
     */
    dateFromNow: function (years, months, days) {
        if (days !== undefined) {
            throw '_.dateFromNow: days not supported yet' }
        if (months > 12) {
            throw '_.dateFromNow: months delta over 12 not supported yet' }
        var now = new Date ()
        var targetYear = now.getFullYear () - years,
            targetMonth = now.getMonth () - months,
            targetDate = now.getDate ()
        if (months > now.getMonth ()) {
            targetYear = targetYear - 1
            targetMonth = 12 + targetMonth }
        return new Date (targetYear, targetMonth, targetDate) },

    /*  SQL datetime utils
     */
    dateFromSQLDate: function (sqlDate) {
        if (!sqlDate) {
            return undefined
        }
        var dateTime = sqlDate.split (' ')
        var date = dateTime[0].split ('-')
        var time = dateTime.length > 1 ? dateTime[1].split (':') : ['0', '0', '0']
        var seconds = parseFloat (time[2])
        return new Date (
            parseInt (date[0], 10), parseInt (date[1], 10) - 1, parseInt (date[2], 10),
            parseInt (time[0], 10), parseInt (time[1], 10), Math.floor (seconds),
            (seconds - Math.floor (seconds)) * 1000) },

    timestampFromSQLDate: function (value) {
        var date = _.dateFromSQLDate (value)
        var timestamp = date ? date.getTime () : undefined
        return timestamp > 0 ? timestamp : undefined },

    /*  Format.relativeTime (date, { withAgoText: false, shortUnits: false, minDelta: undefined })
     */
    relativeTime: (function () {
        var conversions = [
            { units: ['мс', 'мс', 'мс'],        shortUnits: ['мс', 'мс', 'мс'],     multiplier: 1 },
            { units: ['сек.', 'сек.', 'сек.'],  shortUnits: ['с', 'с', 'с'],        multiplier: 1000 },
            { units: ['мин.', 'мин.', 'мин.'],  shortUnits: ['м', 'м', 'м'],        multiplier: 60 },
            { units: ['час', 'часа', 'часов'],  shortUnits: ['ч', 'ч', 'ч'],        multiplier: 60 },
            { units: ['день', 'дня', 'дней'],   shortUnits: ['д', 'д', 'д'],        multiplier: 24 },
            { units: ['мес.', 'мес.', 'мес.'],  shortUnits: ['мес', 'мес', 'мес'],multiplier: 30 },
            { units: ['год', 'года', 'лет'],    shortUnits: ['г', 'г', 'г'],        multiplier: 12 },
        ]
        var msInDay = 1000 * 60 * 60 * 24
        return function (date, cfg) {
            if (!date) {
                return '' }
            if (typeof date == 'number') {
                date = new Date (date) }
            cfg = cfg || {}
            opts = {
                withAgoText: cfg.withAgoText || false,
                shortUnits: cfg.shortUnits || false,
                minDelta: cfg.minDelta }

            var now = new Date ()
            var delta = now - date
            var future = (delta < 0)
            delta = Math.abs (delta)
            if (opts.minDelta && delta < opts.minDelta) {
                return 'только что' }
            if (delta <= 6 * msInDay) {
                var day
                var weekday = date.getDay(),
                    dayDiff = weekday - now.getDay()
                if (dayDiff == 0)                       day = 'сегодня'
                else if (dayDiff == -1)                 day = 'вчера'
                else if (dayDiff == -2)                 day = 'позавчера'
                else if (dayDiff == 1 && date > now)    day = 'завтра'
                else if (dayDiff == 2 && date > now)    day = 'послезавтра' }
            var units = null;
            for (var i = 0, n = conversions.length; i < n; i++) {
                var conversion = conversions[i]
                if (delta < conversion.multiplier)
                    break;
                units = opts.shortUnits ? conversion.shortUnits : conversion.units
                delta = delta / conversion.multiplier }
            if (!units) {
                return 'только что' }
            else {
                var text = Format.plural (Math.floor(delta), units[0], units[1], units[2])
                if (future) {
                    return 'через ' + text }
                else {
                    return text + (opts.withAgoText ? ' назад' : '') } } } })()
}

