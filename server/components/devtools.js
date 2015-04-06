var git  = require ('nodegit'),
	exec = require ('child_process').exec

module.exports = $trait ({

	api: function () {
		return {
			'echo':				{ post: this.echo },
			'api': {
				'source/:file': { get:	this.developerAccess (this.readSource) },
				'git-commits':	{ get:  this.developerAccess (this.gitCommits) },
				'git-pull':		{ post: this.developerAccess (this.gitPull) } } } },

	afterInit: function () { // remote logging
		_.onAfter (log.impl, 'writeBackend', this.$ (function (params) {
			this.messageToPeers ({ what: 'log', params: params }, _.property ('isDeveloper')) })) },

	/*	Prints raw incoming HTTP data (for debugging of client write methods)
	 */
	echo: function (context) {
		context.data (function (data) {
			console.log ('ECHO:', data)
			context.success (data) }) },

	/*	Reads source code of server (requires developer privileges)
	 */
	readSource: function (context) {
		_.readSource (context.env.file, function (text) { context.success (text) }) },

	/*	Git tools
	 */
	gitLastCommitStatus: function (complete) {
		exec ('git log -1 --name-status', function (e, stdout, stderr) {
			if (e) {
				complete (null) }
			else {
				complete ({ hash: stdout.split ('\n')[0].split (' ')[1] }) } }) },

	gitCommits: function (context) { var items = []
		git.Repo.open ('./', function (e, repo) { if (e) { throw e }
		  	repo.getMaster (function (e, branch) { if (e) { throw e }
			    var history = branch.history ()
			    history.on ('commit', function (commit) {
					items.push ({
						_id: commit.sha (),
						author: commit.author ().name (),
						email: commit.author ().email (),
						date: Date.parse (commit.date ()),
						message: commit.message () }) })

				history.on ('end', function () {
					context.jsonSuccess (items) })

			    history.start () }) }) },

	gitPull: function (context) {
		exec ('git pull', this.$ (function (e, stdout, stderr) {
			if (e) {
				context.jsonFailure (e) }
			else {
				context.jsonSuccess () }

			this.restart () })) },

})