var fs				= require ('fs'),
    path			= require ('path'),
    util            = require ('../util'),
    exec			= require ('child_process').exec

module.exports = $trait ({

    /*  Require 2.0
     */
    require: function (modules) { return this.$ (function (then) {

        _.mapReduce (_.coerceToArray (modules), {
            next: function (module, i, next, skip, memo) {
                    try         {   require (module)
                                    skip () }

                    catch (e)   {   log.warn ('Installing', module, 'from npm')
                                    exec ('npm install ' + module, function (e, stdout, stderr) {
                                                                        if (e) {
                                                                            util.fatalError (stderr) }
                                                                        else {
                                                                            next () } }) } },
            complete: then.arity0 }) }) },


    /*  Self deployment protocol
     */
    beforeInit: function (then) { log.info ('Deploying shared modules')

        var srcPath             = path.join (process.cwd (), './base')
        var dstPath             = path.join (process.cwd (), './client/base')
        var srcFiles            = fs.readdirSync (srcPath).filter (_.matches (/.+\.js/))
        var dstFiles            = fs.readdirSync (dstPath).filter (_.matches (/.+\.js/))
        var aboutDstFiles       = _.object (_.zip (dstFiles,
                                                   dstFiles.map (path.join.partial (dstPath).arity1.then (
                                                                 util.lstatSync))))

        var symlinkedFiles  = _.keys (_.filter2 (aboutDstFiles, _.method ('isSymbolicLink')))
        var compiledFiles   = []

        /*  Unlink obsolete modules from /client/base
         */
        _.each (aboutDstFiles, function (aboot, file) { // SouthPark taught me aboot how they pronounce it in Canada
            if (aboot && aboot.isSymbolicLink ()) {
                if (!_.contains (srcFiles, file)) {
                    log.error ('Un-deploying', file, 'link, as it\'s now obsolete')
                    fs.unlinkSync (path.join (dstPath, file)) } } })

        /*  Link/compile modules to /client/base
         */
        _.each (srcFiles, function (file) {

            var src      = path.join (srcPath, file)
            var srcText  = fs.readFileSync (src, { encoding: 'utf8' })

            var dst      = path.join (dstPath, file)
            var aboutDst = aboutDstFiles[file]

            if (srcText.indexOf ('$include') >= 0) {
                var notice          = '/*\tWARNING: AUTO GENERATED (DO NOT EDIT, ANY CHANGES WILL BE LOST)\n */\n\n'
                var compiledText    = util.compileScript ({ source: srcText, includePath: srcPath })

                try { fs.unlinkSync (dst) } catch (e) {}
                      fs.writeFileSync (dst, notice + compiledText, { encoding: 'utf8' })

                compiledFiles.push (file)
                log.success ('Compiled', file, 'to', dst) }

            else { if (!aboutDst) {
                        fs.symlinkSync (src, dst);
                        log.success ('Linked', file, 'to', dst) }

                    else if (!aboutDst.isSymbolicLink ()) {
                        util.fatalError (dst, 'is not symlink. Cannot proceed, please resolve.') } } })

        /*  Add symlinks to .gitignore
         */
        fs.writeFileSync (path.join (dstPath, './.gitignore'),
                          _.union (symlinkedFiles, compiledFiles).join ('\n'),
                          { encoding: 'utf8' })

        then () } })




