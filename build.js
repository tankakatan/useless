var fs = require ('fs')

fs.writeFileSync ('./build/useless.js',
	require ('./server/base/util').compileScript ({
										source:       fs.readFileSync ('./useless-base.js', { encoding: 'utf8' }),
										includePath: './' }),
									  { encoding:    'utf8' })