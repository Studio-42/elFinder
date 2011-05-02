#!/usr/bin/env python


import cgi
try:
	import json
except ImportError:
	import simplejson as json
import elFinder

# configure connector options
opts = {
	#'root': '/home/troex/Sites/git/elfinder/files',
	'root': '../git/elfinder/files/',
	'URL': 'http://localhost:8001/~troex/git/elfinder/files',
	## other options
	'debug': True,
	'fileURL': True,  # download files using connector, no direct urls to files
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
	# 'disabled': ['rename', 'quicklook', 'upload']
}

# init connector and pass options
elf = elFinder.connector(opts)

# fetch only needed GET/POST parameters
httpRequest = {}
form = cgi.FieldStorage()
for field in elf.httpAllowedParameters:
	if field in form:
		httpRequest[field] = form.getvalue(field)
		if field == 'upload[]':
			upFiles = {}
			cgiUploadFiles = form['upload[]']
			for up in cgiUploadFiles:
				if up.filename:
					upFiles[up.filename] = up.file # pack dict(filename: filedescriptor)
			httpRequest['upload[]'] = upFiles

# run connector with parameters
status, header, response = elf.run(httpRequest)

# get connector output and print it out

# code below is tested with apache only (maybe other server need other method?)
if status == 200:
	print 'Status: 200'
elif status == 403:
	print 'Status: 403'
elif status == 404:
	print 'Status: 404'

if len(header) >= 1:
	for h, v in header.iteritems():
		print h + ': ' + v
	print

if not response is None and status == 200:
	# send file
	if 'file' in response and isinstance(response['file'], file):
		print response['file'].read()
		response['file'].close()
	# output json
	else:
		print json.dumps(response, indent = True)




## logging
#import sys
#log = open('/home/troex/Sites/git/elfinder/files/out.log', 'w')
#print >>log, 'FORM: ', form
#log.close()

## another aproach
## get connector output and print it out
#if elf.httpStatusCode == 200:
#	print 'HTTP/1.1 200 OK'
#elif elf.httpStatusCode == 403:
#	print 'HTTP/1.x 403 Access Denied'
#elif elf.httpStatusCode == 404:
#	print 'HTTP/1.x 404 Not Found'
#
#if len(elf.httpHeader) >= 1:
#	for header, value in elf.httpHeader.iteritems():
#		print header + ': ' + value
#	print
#
#if not elf.httpResponse is None:
#	if isinstance(elf.httpResponse['file'], file):
#		print elf.httpResponse['file'].read()
#		elf.httpResponse['file'].close()
#	else:
#		print json.dumps(elf.httpResponse, indent = True)
#
