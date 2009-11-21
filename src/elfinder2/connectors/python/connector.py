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
		'mkdir': '__mkdir',
		'mkfile': '__mkfile',
		'rename': '__rename',
		'upload': '__upload',
		'paste': '__paste',
		'rm': '__rm',
		'edit': '__edit',
		'extract': '__extract'
	}

	_kinds = {
		'directory': 'Directory',
		'link': 'Alias',
		'text/plain': 'Plain text',
		'text/x-php': 'PHP source',
		'text/javascript': 'Javascript source',
		'text/css': 'CSS style sheet',
		'text/html': 'HTML document',
		'text/x-c': 'C source',
		'text/x-c++': 'C++ source',
		'text/x-shellscript': 'Unix shell script',
		'text/rtf': 'Rich Text Format (RTF)',
		'text/rtfd': 'RTF with attachments (RTFD)',
		'text/xml': 'XML document',
		'application/xml': 'XML document',
		'application/x-tar': 'TAR archive',
		'application/x-gzip': 'GZIP archive',
		'application/x-bzip2': 'BZIP archive',
		'application/x-zip': 'ZIP archive',
		'application/zip': 'ZIP archive',
		'application/x-rar': 'RAR archive',
		'image/jpeg': 'JPEG image',
		'image/gif': 'GIF Image',
		'image/png': 'PNG image',
		'image/tiff': 'TIFF image',
		'image/vnd.adobe.photoshop': 'Adobe Photoshop image',
		'application/pdf': 'Portable Document Format (PDF)',
		'application/msword': 'Microsoft Word document',
		'application/vnd.ms-office': 'Microsoft Office document',
		'application/vnd.ms-word': 'Microsoft Word document',
		'application/msexel': 'Microsoft Excel document',
		'application/vnd.ms-excel': 'Microsoft Excel document',
		'application/octet-stream': 'Application',
		'audio/mpeg': 'MPEG audio',
		'video/mpeg': 'MPEG video',
		'video/x-msvideo': 'AVI video',
		'application/x-shockwave-flash': 'Flash application',
		'video/x-flv': 'Flash video'
	}

	_request = {}
	
	def __init__(self, opts):
		for opt in opts:
			self._options[opt] = opts.get(opt)


	def run(self):
		possible_fields = ['cmd', 'init', 'tree', 'target', 'current']
		form = cgi.FieldStorage()
		for field in possible_fields:
			if field in form:
				self._request[field] = form[field].value
		
		response = self.__open()
		print simplejson.dumps(response)
	

	def __open(self):
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

			name = os.path.basename(path)
			if path == self._options['root']:
				name = self._options['rootAlias']

			if self._options['rootAlias']:
				basename = self._options['rootAlias']
			else:
				basename = os.path.basename(self._options['root'])
			basename = '/' + basename;

			rel = basename + path[len(self._options['root']):]

			write = os.access(path, os.W_OK) and self.__isAllowed(path, 'write')
			response['cwd'] = {
				'hash': binascii.crc32(path),
				'name': name,
				'rel': rel,
				'kind': 'Directory',
				'size': 0,
				'mdate': datetime.fromtimestamp(os.stat(path).st_mtime).strftime("%d %b %Y %H:%M"),
				'read': True,
				'write': write,
				'upload': write and self.__isAllowed(path, 'upload'),
				'mkdir': write and self.__isAllowed(path, 'mkdir'),
				'rm': write and self.__isAllowed(path, 'rm'),
				'rmdir': write and self.__isAllowed(path, 'rmdir')
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
						'read': True,
						'dirs': self.__tree(self._options['root'])
					}
				}
				if 'init' in self._request:
					response['disabled'] = self._options['disabled']

			files = []
			dirs = []

			for f in os.listdir(path):
				if f[0] == '.': continue
				pf = os.path.join(path, f)
				info = {}
				info = self.__info(pf, write)
				info['hash'] = binascii.crc32(pf)
				if info['css'] == 'dir':
					dirs.append(info)
				else:
					files.append(info)

			dirs.extend(files)
			response['files'] = dirs

			return response
		pass
	

	def __findDir(self, fhash, path):
		"""Find directory by hash (crc32)
		FULL
		"""
		if not path:
			path = self._options['root']
			if fhash == binascii.crc32(path):
				return path

		if not os.path.isdir(path):
			return None

		for d in os.listdir(path):
			pd = os.path.join(path, d)
			if os.path.isdir(pd) and not os.path.islink(pd):
				if fhash == binascii.crc32(pd):
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
				fhash = binascii.crc32(pd)
				read = os.access(pd, os.R_OK) and self.__isAllowed(pd, 'read')
				if read:
					dirs = self.__tree(pd)
				else:
					dirs = ''
				tree[fhash] = {
					'name': d,
					'read': read,
					'dirs': dirs
				}

		if len(tree) == 0:
			return ''
		else:
			return tree
	

	def __info(self, path, parentWrite):
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
			'size': stat.st_size,
			'read': os.access(path, os.R_OK),
			'write': os.access(path, os.W_OK),
			'mdate': datetime.fromtimestamp(stat.st_mtime).strftime("%d %b %Y %H:%M"),
			'css': '',
			'cmd': ''
		}
		
		if filetype == 'dir':
			info['kind'] = 'Directory'
			info['css'] = 'dir';
			info['size'] = self.__dirSize(path)
			info['read'] = info['read'] and self.__isAllowed(path, 'read');
			info['write'] = info['write'] and self.__isAllowed(path, 'write');
		elif filetype == 'link':
			info['kind'] = 'Alias'
			path = self.__readlink(path)
			if not path:
				info['css'] = 'broken'
				info['write'] = info['write'] and parentWrite
				return info
			info['link'] = binascii.crc32(path)
			if os.path.isdir(path):
				info['css'] = 'dir'
				info['read'] = info['read'] and self.__isAllowed(path, 'read')
				info['write'] = info['write'] and self.__isAllowed(path, 'write')
				return info
			# mimetype here
			mime = self.__mimetype(path)
		else:
			mime = self.__mimetype(path)
			if mime in self._kinds:
				info['kind'] = self._kinds[mime]
			else:
				info['kind'] = 'Unknown'

		if mime:
			mime = mime.split('/', 2)
			c = mime[0] # class
			s = mime[1] # subclass
			info['css'] += " %s %s" % (c, s)
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
