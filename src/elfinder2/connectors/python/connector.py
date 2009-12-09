#!/usr/bin/env python
#
# Connector for elFinder File Manager
# author Troex Nevelin <troex@fury.scancode.ru>


import binascii
import cgi
import cgitb
import mimetypes
import os
import os.path
import sys
import simplejson
from datetime import datetime, date, time

print "Content-type: text/html\n"

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
		'open':    '__open',
		'reload':  '__reload',
		'mkdir':   '__mkdir',
		'mkfile':  '__mkfile',
		'rename':  '__rename',
		'upload':  '__upload',
		'paste':   '__paste',
		'rm':      '__rm',
		'duplicate': '__duplicate',
		'edit':    '__edit',
		'extract': '__extract',
		'resize':  '__resize',
		'geturl':  '__geturl',
		'tmb':     '__thumbnails'
	}

	_request = {}
	
	def __init__(self, opts):
		for opt in opts:
			self._options[opt] = opts.get(opt)


	def run(self):
		possible_fields = ['cmd', 'target', 'current']
		form = cgi.FieldStorage()
		for field in possible_fields:
			if field in form:
				self._request[field] = form[field].value
		
		response = {}		
		# print self._request
		if 'cmd' in self._request:
			if self._request['cmd'] in self._commands:
				cmd = self._commands[self._request['cmd']]
				func = getattr(self, '_' + self.__class__.__name__ + cmd, None)
				if callable(func):
					if cmd == '__open':
						response = func(False)
					else:
						response = func()
		else:
			response['disabled'] = self._options['disabled']
			response.update(self.__reload())
		
		print simplejson.dumps(response)


	def __reload(self):
		return self.__open(True)


	def __open(self, tree):
		# try to open file
		if 'current' in self._request:
			pass
		# try dir
		else:
			response = {}
			path = self._options['root']
			
			if 'target' in self._request:
				target = self.__findDir(int(self._request['target']), None)
				if not target:
					response['warning'] = 'Directory does not exists'
				elif not (os.access(target, os.R_OK) and self.__isAllowed(target, 'read')):
					response['warning'] = 'Access denied'
				else:
					path = target

			response.update(self.__content(path, tree))
			
			return response
		pass


	def __content(self, path, tree):
		response = {}
		response['cwd'] = self.__cwd(path)
		response['cdc'] = self.__cdc(path)
		if tree:
			fhash = self.__hash(self._options['root'])
			if self._options['rootAlias']:
				name = self._options['rootAlias']
			else:
				name = os.path.basename(self._options['root'])
			response['tree'] = {
				fhash: {
					'name': name,
					'read': True,
					'dirs': self.__tree(self._options['root'])
				}
			}		
		return response


	def __cwd(self, path):
		name = os.path.basename(path)
		if path == self._options['root']:
			name = self._options['rootAlias']
			root = True
		else:
			root = False

		if self._options['rootAlias']:
			basename = self._options['rootAlias']
		else:
			basename = os.path.basename(self._options['root'])
		
		rel = basename + path[len(self._options['root']):]

		response = {
			'hash': self.__hash(path),
			'name': name,
			'rel': rel,
			'size': 0,
			'date': datetime.fromtimestamp(os.stat(path).st_mtime).strftime("%d %b %Y %H:%M"),
			'read': True,
			'write': os.access(path, os.W_OK) and self.__isAllowed(path, 'write'),
			'rm': not root and self.__isAllowed(path, 'rm'),
			'uplMaxSize': '128M' # TODO
		}
		return response


	def __cdc(self, path):
		files = []
		dirs = []

		for f in os.listdir(path):
			if f[0] == '.': continue
			pf = os.path.join(path, f)
			info = {}
			info = self.__info(pf)
			info['hash'] = self.__hash(pf)
			if info['type'] == 'dir':
				dirs.append(info)
			else:
				files.append(info)

		dirs.extend(files)
		return dirs


	def __hash(self, input):
		return binascii.crc32(input)


	def __findDir(self, fhash, path):
		"""Find directory by hash
		FULL
		"""
		if not path:
			path = self._options['root']
			if fhash == self.__hash(path):
				return path

		if not os.path.isdir(path):
			return None

		for d in os.listdir(path):
			pd = os.path.join(path, d)
			if os.path.isdir(pd) and not os.path.islink(pd):
				if fhash == self.__hash(pd):
					return pd
				else:
					ret = self.__findDir(fhash, pd)
					if ret:
						return ret

		return None


	def __tree(self, path):
		"""Return directory tree starting from path
		FULL
		"""
		tree = {}
		
		if not os.path.isdir(path):
			return ''
		if os.path.islink(path):
			return ''

		for d in os.listdir(path):
			pd = os.path.join(path, d)
			if os.path.isdir(pd) and not os.path.islink(pd):
				fhash = self.__hash(pd)
				read = os.access(pd, os.R_OK) and self.__isAllowed(pd, 'read')
				write = os.access(pd, os.W_OK) and self.__isAllowed(pd, 'write')
				if read:
					dirs = self.__tree(pd)
				else:
					dirs = ''
				tree[fhash] = {
					'name': d,
					'read': read,
					'write': write,
					'dirs': dirs
				}

		if len(tree) == 0:
			return ''
		else:
			return tree
	

	def __info(self, path):
		mime = ''
		filetype = 'file'
		if os.path.isfile(path):
			filetype = 'file'
		if os.path.isdir(path):
			filetype = 'dir'
		if os.path.islink(path):
			filetype = 'link'
		
		stat = os.lstat(path)

		info = {
			'name': os.path.basename(path),
			'hash': self.__hash(path),
			'type': filetype,
			'mime': 'directory' if filetype == 'dir' else self.__mimetype(path),
			'date': datetime.fromtimestamp(stat.st_mtime).strftime("%d %b %Y %H:%M"),
			'size': self.__dirSize(path) if filetype == 'dir' else stat.st_size,
			'read': os.access(path, os.R_OK),
			'write': os.access(path, os.W_OK),
			'rm': self.__isAllowed(path, 'rm')
		}
		
		if filetype == 'link':
			path = self.__readlink(path)
			if not path:
				info['mime'] = 'unknown'
				return info

			if os.path.isdir(path):
				info['mime'] = 'directory'
			else:
				info['mime'] = self.__mimetype(path)

			if self._options['rootAlias']:
				basename = self._options['rootAlias']
			else:
				basename = os.path.basename(self._options['root'])
			
			info['linkTo'] = basename + path[len(self._options['root']):]
			info['link'] = self.__hash(path)
			info['read'] = info['read'] and self.__isAllowed(path, 'read')
			info['write'] = info['write'] and self.__isAllowed(path, 'write')
			info['rm'] = self.__isAllowed(path, 'rm')
			
			# more actions here
			# image sizes
		
		return info


	def __mimetype(self, path):
		return mimetypes.guess_type(path)[0]
	

	def __readlink(self, path):
		"""Read link and return real path if not broken
		FULL
		"""
		target = os.readlink(path);
		if not target[0] == '/':
			target = os.path.join(os.path.dirname(path), target)
		target = os.path.normpath(target)
		if os.path.exists(target):
			if not target.find(self._options['root']) == -1:
				return target
		return False


	def __dirSize(self, path):
		total_size = 0
		for dirpath, dirnames, filenames in os.walk(path):
			for f in filenames:
				fp = os.path.join(dirpath, f)
				if os.path.exists(fp):
					total_size += os.stat(fp).st_size
		return total_size


	def __isAllowed(self, path, action):
		return True


elFinder({
	'root': '/Users/troex/Sites/git/elrte/files',
	'rootAlias': ''
}).run()

#print os.environ
