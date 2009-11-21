#!/usr/bin/env python

import binascii
import cgi
import cgitb
import os
import os.path
import sys
import simplejson
from datetime import datetime, date, time

print "Content-type: text/html\n"
#print """
#{"cwd":{"hash":1829952014,"name":"Home","rel":"\/Home","write":true,"upload":true,"mkdir":true,"rm":true,"rmdir":true},"files":{"-1702046772":{"name":"black_mosaic_by_seikq.jpg","size":40100,"read":true,"write":true,"mdate":"11 Nov 2009 21:00","adate":"20 Nov 2009 21:23","css":"file image jpeg","cmd":"","kind":"JPEG image","url":"http:\/\/php5.localhost:8001\/git\/elrte\/files\/black_mosaic_by_seikq.jpg"},"1760046576":{"name":"logo.png","size":18782,"read":true,"write":true,"mdate":"11 Nov 2009 21:57","adate":"20 Nov 2009 21:23","css":"file image png","cmd":"","kind":"PNG image","url":"http:\/\/php5.localhost:8001\/git\/elrte\/files\/logo.png"},"-2100665865":{"name":"smislovie_galliucinacii_-_razum_kogda-nibud_pobedit.mp3","size":5052416,"read":true,"write":true,"mdate":"12 Sep 2009 01:54","adate":"20 Nov 2009 21:23","css":"file audio mpeg","cmd":"","kind":"MPEG audio","url":"http:\/\/php5.localhost:8001\/git\/elrte\/files\/smislovie_galliucinacii_-_razum_kogda-nibud_pobedit.mp3"},"-1706455333":{"name":"you&me-strips23.jpg","size":340766,"read":true,"write":true,"mdate":"17 Nov 2009 04:48","adate":"20 Nov 2009 21:23","css":"file image jpeg","cmd":"","kind":"JPEG image","url":"http:\/\/php5.localhost:8001\/git\/elrte\/files\/you&me-strips23.jpg"}},"tree":[],"disabled":[],"debug":{"time":0.10094904899597,"mimeTypeDetect":"finfo","du":true,"tasks":{"dirs":[],"images":[]},"utime":1258742072}}
#"""
cgitb.enable()

class elFinder():
	
	"""Connector for elFinder"""

	_options = {
		'root': './',
		'URL': '',
		'rootAlias': 'Home',
		'debug': True,
		'dirSize': True,
		'fileUmask': '0666',
		'dirUmask': '0777',
		'tmbDir': '.tmb',
		'tmbSize': 48,
		'allowTypes': [],
		'allowExts': [],
		'denyTypes': [],
		'denyExts': [],   
		'allowURLs': [],
		'disabled': [],
		'aclObj': None,
		'aclRole': 'user',
		'defaults': {
			'read': True,
			'write': True,
			'mkdir': True,
			'upload': True,
			'rm': True,
			'rmdir': True
		},
		'perms': []
	}
	
	_commands = {
		'cd': '_cd',
		'open': '_open',
		'mkdir': '_mkdir',
		'mkfile': '_mkfile',
		'rename': '_rename',
		'upload': '_upload',
		'rm': '_rm',
		'edit': '_edit',
		'extract': '_extract'
	}
	
	_request = {}
	
	def __init__(self, opts):
		for opt in opts:
			self._options[opt] = opts.get(opt)
			# self._options[]
	
	def run(self):
		possible_fields = ['cmd', 'init', 'tree', 'target', 'current']
		form = cgi.FieldStorage()
		for field in possible_fields:
			if field in form:
				self._request[field] = form[field].value
		
		#print self._request
		#print simplejson.dumps(http)
				
		response = self._open()
		# response['tree'] = {}
		response['disabled'] = []
		# response['files'] = {}
		print simplejson.dumps(response)
	

	def _open(self):
		# try to open file
		if 'current' in self._request:
			pass
		# try dir
		else:
			response = {}
			path = self._options['root']
			
			if self._options['rootAlias']:
				name = self._options['rootAlias']
			else:
				name = os.path.basename(path)
			
			rel = '/' + name + path[len(self._options['root']):]
			
			write = os.access(path, os.W_OK) and self._isAllowed(path, 'write')
			response['cwd'] = {
				'hash': binascii.crc32(path),
				'name': name,
				'rel': rel,
				'write': write,
				'upload': write and self._isAllowed(path, 'upload'),
				'mkdir': write and self._isAllowed(path, 'mkdir'),
				'rm': write and self._isAllowed(path, 'rm'),
				'rmdir': write and self._isAllowed(path, 'rmdir')
			}
			
			if 'tree' in self._request:
				fhash = binascii.crc32(self._options['root'])
				if self._options['rootAlias']:
					name = self._options['rootAlias']
				else:
					name = os.path.basename(self._options['root'])
				response['tree'] = {
					fhash: {
						'name': name,
						'dirs': self._tree(None)
					}
				}
			
			files = {}
			dirs = {}
			
			for f in os.listdir(path):
				if f[0] == '.': continue
				pf = os.path.join(path, f)
				info = {}
				info = self._info(pf, write)
				fhash = binascii.crc32(pf)
				if info['css'] == 'dir':
					dirs[fhash] = info
				else:
					files[fhash] = info
			
			dirs.update(files)
			response['files'] = dirs
			
			return response
		pass
	


	def _tree(self, path):
		tree = {}
		
		if not path:
			path = self._options['root']
		
		if not os.path.isdir(path):
			return tree
		
		for d in os.listdir(path):
			pd = os.path.join(path, d)
			if os.path.isdir(pd) and self._isAllowed(pd, 'read'):
				fhash = binascii.crc32(pd)
				if os.access(pd, os.R_OK):
					dirs = self._tree(pd)
				else:
					dirs = []
				tree[fhash] = {
					'name': d,
					'dirs': dirs
				}
		
		return tree
		
	

	def _info(self, path, parentWrite):
		if os.path.isfile(path):
			filetype = 'file'
		elif os.path.isdir(path):
			filetype = 'dir'
		elif os.path.islink(path):
			filetype = 'link'
		else:
			pass
		
		stat = os.stat(path)
		info = {
			'name': os.path.basename(path),
			'size': stat.st_size,
			'read': os.access(path, os.R_OK),
			'write': os.access(path, os.W_OK),
			'mdate': datetime.fromtimestamp(stat.st_mtime).strftime("%d %b %Y %H:%M"),
			'adate': datetime.fromtimestamp(stat.st_atime).strftime("%d %b %Y %H:%M"),
			'css': filetype,
			'cmd': ''
		}
		
		if filetype == 'dir':
			info['kind'] = 'Directory'
			info['read'] = info['read'] and self._isAllowed(path, 'read');
			info['write'] = info['write'] and self._isAllowed(path, 'write');
		elif filetype == 'link':
			info['kind'] = 'Alias'
		else:
			pass
		
		return info
	
	
	def _isAllowed(self, path, action):
		return True
	



options = {
	'root': '/Users/troex/Sites/git/elrte/files'
}
fm = elFinder(options)
fm.run()

#print os.environ
