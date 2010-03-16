#!/usr/bin/env python

import elFinder

elFinder.connector({
	'root': '/home/user/Sites/elfinder/files',
	'URL': 'http://localhost/~user/elfinder/files',
	## other options
	# 'debug': True,
	# 'dirSize': True,
	# 'dotFiles': True,
	# 'perms': {
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
