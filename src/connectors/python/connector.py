#!/usr/bin/env python

import elFinder

elFinder.connector({
	'root': '',
	'URL': ''
	## other options
	# 'debug': True,
	# 'dirSize': True,
	# 'dotFiles': True,
	# 'perms': {
	# 	'^/upload/.*': {
	# 		'read': False,
	# 		'write': False,
	# 		'rm': False
	# 	},
	# 	'backup': {
	# 		'read': True,
	# 		'write': False,
	# 		'rm': False
	# 	},
	# 	'^/pics': {
	# 		'read': True,
	# 		'write': False,
	# 		'rm': False
	# 	}
	# },
	# 'uploadDeny': ['image', 'application'],
	# 'uploadAllow': ['image/png', 'image/jpeg'],
	# 'uploadOrder': ['deny', 'allow']
}).run()
