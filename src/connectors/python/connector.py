#!/usr/bin/env python

import elFinder

elFinder.connector({
	'root': '/Users/troex/Sites/git/elfinder/files/wiki',
	'URL': 'http://localhost:8001/~troex/git/elfinder/files/wiki',
	'perms': {
		'aaa': {
			'read': False,
			'write': False,
			'rm': False
		},
		'upload': {
			'write': False
		}
	},
	# 'uploadDeny': ['image'],
	# 'uploadAllow': ['image/png'],
	# 'uploadOrder': ['deny', 'allow'],
	# 'root': '/Users/troex/Sites/',
	# 'URL': 'http://php5.localhost:8001/~troex/',
	'imgLib': 'auto',
	'dirSize': False
}).run()
