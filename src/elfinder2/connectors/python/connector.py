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
import re
import shutil
import sys
import simplejson
import time
from datetime import datetime

cgitb.enable()

class elFinder():
	"""Connector for elFinder"""

	_options = {
		'root': './',
		'URL': '',
		'rootAlias': 'Home',
		'dotFiles': True, # TODO
		'debug': True,
		'dirSize': True,
		'fileUmask': 0666,
		'dirUmask': 0755,
		'imgLib': False,
		'tmbDir': '.tmb',
		'tmbAtOnce': 3,
		'tmbSize': 48,
		'fileURL': True,
		'uplMaxSize': 15,
		'uplWriteChunk': 8192,
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
		'open':	'__open',
		'reload': '__reload',
		'mkdir': '__mkdir',
		'mkfile': '__mkfile',
		'rename': '__rename',
		'upload': '__upload',
		'paste': '__paste',
		'rm': '__rm',
		'duplicate': '__duplicate',
		'read': '__read',
		'edit': '__edit',
		'extract': '__extract',
		'resize': '__resize',
		'geturl': '__geturl',
		'tmb': '__thumbnails'
	}

	_time = 0
	_request = {}
	_response = {}
	_errorData = {}
	_form = {}
	_im = None


	def __init__(self, opts):
		if self._options['debug']:
			self._response['debug'] = {}
			self._time = time.time()

		for opt in opts:
			self._options[opt] = opts.get(opt)

		self._options['URL'] = self._options['URL'].rstrip('/')
		self._options['root'] = self._options['root'].rstrip(os.sep)
		self.__debug('URL', self._options['URL'])
		self.__debug('root', self._options['root'])

		if self._options['tmbDir']:
			self._options['tmbDir'] = os.path.join(self._options['root'], self._options['tmbDir'])
			if not os.path.exists(self._options['tmbDir']):
				self._options['tmbDir'] = False


	def run(self):
		possible_fields = ['cmd', 'target', 'current', 'tree', 'name', 'rm[]', 'file', 'content', 'files[]', 'src', 'dst', 'cut']
		self._form = cgi.FieldStorage()
		for field in possible_fields:
			if field in self._form:
				self._request[field] = self._form.getvalue(field)

		# print self._request
		if 'cmd' in self._request:
			if self._request['cmd'] in self._commands:
				cmd = self._commands[self._request['cmd']]
				func = getattr(self, '_' + self.__class__.__name__ + cmd, None)
				if callable(func):
					try:
						func()
						# if self._request['cmd'] == 'edit':
						# 	f = open('/Users/troex/my.log', 'w')
						# 	f.write(str(self._form))
						# 	f.close()
					except:
						self._response['error'] = 'Unknown command'
			else:
				self._response['error'] = 'Unknown command'
		else:
			self._response['disabled'] = self._options['disabled']
			self.__open()

		if self._errorData:
			self._response['errorData'] = self._errorData
		

		if self._options['debug']:
			self.__debug('time', (time.time() - self._time))
		else:
			if 'debug' in self._response:
				del self._response['debug']

		# print 'Content-type: application/json\n'
		print 'Content-type: text/html\n'
		print simplejson.dumps(self._response, indent = bool(self._options['debug']))
		sys.exit(0)


	def __open(self):
		"""Open file or directory"""
		# try to open file
		if 'current' in self._request:
			curDir = self.__findDir(self._request['current'], None)
			curFile = self.__find(self._request['target'], curDir)
			
			if not curDir or not curFile or os.path.isdir(curFile):
				print 'HTTP/1.x 404 Not Found\n\n'
				sys.exit('File not found')
			if not self.__isAllowed(curDir, 'read') or not self.__isAllowed(curFile, 'read'):
				print 'HTTP/1.x 403 Access Denied\n\n'
				sys.exit('Access Denied')

			if os.path.islink(curFile):
				curFile = self.__readlink(curFile)
				if not curFile or os.path.isdir(curFile):
					print 'HTTP/1.x 404 Not Found\n\n'
					sys.exit('File not found')
				if not self.__isAllowed(os.path.dirname(curFile), 'read') or not self.__isAllowed(curFile, 'read'):
					print 'HTTP/1.x 403 Access Denied\n\n'
					sys.exit('Access Denied')

			mime = self.__mimetype(curFile)
			parts = mime.split('/', 2)
			if parts[0] == 'image': disp = 'image'
			elif parts[0] == 'text': disp = 'inline'
			else: disp = 'attachments'

			print 'Content-Type: ' + mime
			print 'Content-Disposition: ' + disp + '; filename=' + os.path.basename(curFile)
			print 'Content-Location: ' + curFile.replace(self._options['root'], '')
			print 'Content-Transfer-Encoding: binary'
			print 'Content-Length: ' + str(os.lstat(curFile).st_size)
			print 'Connection: close\n'
			print open(curFile, 'r').read()
			sys.exit(0);
		# try dir
		else:
			path = self._options['root']

			if 'target' in self._request:
				target = self.__findDir(self._request['target'], None)
				if not target:
					self._response['error'] = 'Invalid parameters'
				elif not self.__isAllowed(target, 'read'):
					self._response['error'] = 'Access denied!'
				else:
					path = target

			self.__content(path, 'tree' in self._request)
		pass


	def __rename(self):
		"""Rename file or dir"""
		current = name = target = None
		curDir = curName = newName = None
		if 'name' in self._request and 'current' in self._request and 'target' in self._request:
			name = self._request['name']
			current = self._request['current']
			target = self._request['target']
			curDir = self.__findDir(current, None)
			curName = self.__find(target, curDir)
			newName = os.path.join(curDir, name)

		if not curDir or not curName:
			self._response['error'] = 'File does not exists'
		elif not self.__isAllowed(curDir, 'write'):
			self._response['error'] = 'Access denied!'
		elif not self.__checkName(name):
			self._response['error'] = 'Invalid name'
		elif os.path.exists(newName):
			self._response['error'] = 'File or folder with the same name already exists'
		else:
			try:
				os.rename(curName, newName)
				self._response['target'] = self.__hash(newName)
				self.__content(curDir, os.path.isdir(newName))
			except:
				self._response['error'] = 'Unable to rename file'


	def __mkdir(self):
		"""Create new directory"""
		current = None
		path = None
		newDir = None
		if 'name' in self._request and 'current' in self._request:
			name = self._request['name']
			current = self._request['current']
			path = self.__findDir(current, None)
			newDir = os.path.join(path, name)

		if not path:
			self._response['error'] = 'Invalid parameters'
		elif not self.__isAllowed(path, 'write'):
			self._response['error'] = 'Access denied!'
		elif not self.__checkName(name):
			self._response['error'] = 'Invalid name'
		elif os.path.exists(newDir):
			self._response['error'] = 'File or folder with the same name already exists'
		else:
			try:
				os.mkdir(newDir, int(self._options['dirUmask']))
				self._response['target'] = self.__hash(newDir)
				self.__content(path, True)
			except:
				self._response['error'] = 'Unable to create folder'


	def __mkfile(self):
		"""Create new file"""
		name = current = None
		curDir = newFile = None
		if 'name' in self._request and 'current' in self._request:
			name = self._request['name']
			current = self._request['current']
			curDir = self.__findDir(current, None)
			newFile = os.path.join(curDir, name)

		if not curDir or not name:
			self._response['error'] = 'Invalid parameters'
		elif not self.__isAllowed(curDir, 'write'):
			self._response['error'] = 'Access denied!'
		elif not self.__checkName(name):
			self._response['error'] = 'Invalid name'
		elif os.path.exists(newFile):
			self._response['error'] = 'File or folder with the same name already exists'
		else:
			try:
				open(newFile, 'w').close()
				self._response['target'] = self.__hash(newFile)
				self.__content(curDir, False)
			except:
				self._response['error'] = 'Unable to create file'


	def __rm(self):
		current = rmList = None
		curDir = rmFile = None
		if 'current' in self._request and 'rm[]' in self._request:
			current = self._request['current']
			rmList = self._request['rm[]']
			curDir = self.__findDir(current, None)

		if not rmList or not curDir:
			self._response['error'] = 'Invalid parameters'
			return False

		if not isinstance(rmList, list):
			rmList = [rmList]

		for rm in rmList:
			rmFile = self.__find(rm, curDir)
			if not rmFile: continue
			self.__remove(rmFile)

		self.__content(curDir, True)


	def __upload(self):
		try: # Windows needs stdio set for binary mode.
			import msvcrt
			msvcrt.setmode (0, os.O_BINARY) # stdin  = 0
			msvcrt.setmode (1, os.O_BINARY) # stdout = 1
		except ImportError:
			pass

		if 'current' in self._request:
			curDir = self.__findDir(self._request['current'], None)
			if not curDir:
				self._response['error'] = 'Invalid parameters'
				return
			if not self.__isAllowed(curDir, 'write'):
				self._response['error'] = 'Access denied'
				return
			if not 'fm-file[]' in self._form:
				self._response['error'] = 'No file to upload'
				return

			upFiles = self._form['fm-file[]']
			if not isinstance(upFiles, list):
				upFiles = [upFiles]

			total = 0
			upSize = 0
			maxSize = self._options['uplMaxSize'] * 1024 * 1024
			for up in upFiles:
				name = up.filename
				if name:
					total += 1
					name = os.path.basename(name)
					if not self.__checkName(name):
						self.__errorData(name, 'Invalid name')
					elif not self.__isUploadAllow(up.file):
						self.__errorData(name, 'Not allowed file type')
					else:
						name = os.path.join(curDir, name)
						try:
							f = open(name, 'wb', self._options['uplWriteChunk'])
							for chunk in self.__fbuffer(up.file):
								f.write(chunk)
							f.close()
							upSize += os.lstat(name).st_size
							os.chmod(name, self._options['fileUmask'])
						except:
							self.__errorData(name, 'Unable to save uploaded file')
						if upSize > maxSize:
							try:
								os.unlink(name)
								self.__errorData(name, 'File exceeds the maximum allowed filesize')
							except:
								self.__errorData(name, 'File was only partially uploaded')
							break

			if self._errorData:
				if len(self._errorData) == total:
					self._response['error'] = 'Unable to upload files'
				else:
					self._response['error'] = 'Some files was not uploaded'

			self.__content(curDir, False)
			return


	def __paste(self):
		if 'current' in self._request and 'src' in self._request and 'dst' in self._request:
			curDir = self.__findDir(self._request['current'], None)
			src = self.__findDir(self._request['src'], None)
			dst = self.__findDir(self._request['dst'], None)
			if not curDir or not src or not dst or not 'files[]' in self._request:
				self._response['error'] = 'Invalid parameters'
				return
			files = self._request['files[]']
			if not isinstance(files, list):
				files = [files]

			cut = False
			if 'cut' in self._request:
				if self._request['cut'] == '1':
					cut = True

			if not self.__isAllowed(src, 'read') or not self.__isAllowed(dst, 'write'):
				self._response['error'] = 'Access denied'
				return

			for fhash in files:
				f = self.__find(fhash, src)
				if not f:
					self._response['error'] = 'File not found'
					return
				newDst = os.path.join(dst, os.path.basename(f))
				if dst.find(f) == 0:
					self._response['error'] = 'Unable to copy into itself'
					return

				if cut:
					if not self.__isAllowed(f, 'rm'):
						self._response['error'] = 'Move failed'
						self._errorData(f, 'Access denied')
						return
					# TODO thumbs
					if os.path.exists(newDst):
						self._response['error'] = 'Move failed'
						self._errorData(f, 'File or folder with the same name already exists')
						continue
					try:
						os.rename(f, newDst)
						continue
					except:
						self._response['error'] = 'Move failed'
						self._errorData(f, 'Unable to move')
						return
				else:
					if not self.__copy(f, newDst):
						self._response['error'] = 'Copy failed'
						return
					continue
			self.__content(curDir, True)
		else:
			self._response['error'] = 'Invalid parameters'

		return


	def __duplicate(self):
		if 'current' in self._request and 'file' in self._request:
			curDir = self.__findDir(self._request['current'], None)
			target = self.__find(self._request['file'], curDir)
			if not curDir or not target:
				self._response['error'] = 'Invalid parameters'
				return
			if not self.__isAllowed(target, 'read') or not self.__isAllowed(curDir, 'write'):
				self._response['error'] = 'Access denied!'
			newName = self.__uniqueName(target)
			if not self.__copy(target, newName):
				self._response['error'] = 'Duplicate failed'
				return

		self.__content(curDir, True)
		return


	def __geturl(self):
		response = {}
		if 'current' in self._request and 'file' in self._request:
			curDir = self.__findDir(self._request['current'], None)
			curFile = self.__find(self._request['file'], curDir)
			if curDir and curFile:
				self._response['url'] = self.__path2url(curFile)
				return

		self._response['error'] = 'Invalid parameters'
		return


	def __thumbnails(self):
		if 'current' in self._request:
			curDir = self.__findDir(self._request['current'], None)
			if not curDir or curDir == self._options['tmbDir']:
				return False
		else:
			return False

		self.__initImgLib()
		if self.__canCreateTmb():
			if self._options['tmbAtOnce'] > 0:
				tmbMax = self._options['tmbAtOnce']
			else:
				tmbMax = 100
			self._response['images'] = {}
			i = 0
			for f in os.listdir(curDir):
				path = os.path.join(curDir, f)
				fhash = self.__hash(path)
				if self.__canCreateTmb(path) and self.__isAllowed(path, 'read'):
					tmb = os.path.join(self._options['tmbDir'], fhash + '.png')
					if not os.path.exists(tmb):
						if self.__tmb(path, tmb):
							self._response['images'].update({
								fhash: self.__path2url(tmb)
							})
							self._response['tmb'] = True
							i += 1
				if i >= tmbMax:
					break
		else:
			return False

		return


	def __copy(self, src, dst):
		dstDir = os.path.dirname(dst)
		if not self.__isAllowed(src, 'read'):
			self.__errorData(src, 'Access denied')
			return False
		if not self.__isAllowed(dstDir, 'write'):
			self.__errorData(dstDir, 'Access denied')
			return False
		if os.path.exists(dst):
			self.__errorData(dst, 'File or folder with the same name already exists')
			return False

		if not os.path.isdir(src):
			try:
				shutil.copyfile(src, dst)
				shutil.copymode(src, dst)
				return True
			except:
				self.__errorData(src, 'Unable to copy')
				return False
		else:
			try:
				os.mkdir(dst)
				shutil.copymode(src, dst)
			except:
				self.__errorData(src, 'Unable to copy')
				return False

			for i in os.listdir(src):
				newSrc = os.path.join(src, i)
				newDst = os.path.join(dst, i)
				if not self.__copy(newSrc, newDst):
					self.__errorData(newSrc, 'Unable to copy')
					return False

		return True


	def __findDir(self, fhash, path):
		"""Find directory by hash"""
		fhash = str(fhash)
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


	def __find(self, fhash, parent):
		"""Find file/dir by hash"""
		fhash = str(fhash)
		if os.path.isdir(parent):
			for i in os.listdir(parent):
				path = os.path.join(parent, i)
				if fhash == self.__hash(path):
					return path
		return None


	def __checkName(self, name):
		"""Check for valid file/dir name"""
		pattern = r'[\/\\\:\<\>]'
		if re.search(pattern, name):
			return False
		return True


	def __content(self, path, tree):
		"""CWD + CDC + maybe(TREE)"""
		self.__cwd(path)
		self.__cdc(path)

		if tree:
			self._response['tree'] = self.__tree(self._options['root'])


	def __cwd(self, path):
		"""Current Working Directory"""
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

		self._response['cwd'] = {
			'hash': self.__hash(path),
			'name': name,
			'rel': rel,
			'size': 0,
			'date': datetime.fromtimestamp(os.stat(path).st_mtime).strftime("%d %b %Y %H:%M"),
			'read': True,
			'write': self.__isAllowed(path, 'write'),
			'rm': not root and self.__isAllowed(path, 'rm'),
			'uplMaxSize': str(self._options['uplMaxSize']) + 'M',
			'dotFiles': self._options['dotFiles']
		}


	def __cdc(self, path):
		"""Current Directory Content"""
		files = []
		dirs = []

		for f in os.listdir(path):
			if not self.__isAccepted(f): continue
			pf = os.path.join(path, f)
			info = {}
			info = self.__info(pf)
			info['hash'] = self.__hash(pf)
			if info['mime'] == 'directory':
				dirs.append(info)
			else:
				files.append(info)

		dirs.extend(files)
		self._response['cdc'] = dirs


	def __tree(self, path):
		"""Return directory tree starting from path"""

		if not os.path.isdir(path): return ''
		if os.path.islink(path): return ''

		if (path == self._options['root']) and self._options['rootAlias']:
			name = self._options['rootAlias']
		else:
			name = os.path.basename(path)
		tree = {
			'hash': self.__hash(path),
			'name': name,
			'read': self.__isAllowed(path, 'read'),
			'write': self.__isAllowed(path, 'write'),
			'dirs': []
		}
		if self.__isAllowed(path, 'read'):
			for d in os.listdir(path):
				pd = os.path.join(path, d)
				if os.path.isdir(pd) and not os.path.islink(pd) and self.__isAccepted(d):
					tree['dirs'].append(self.__tree(pd))
		return tree


	def __uniqueName(self, path, copy = ' copy'):
		curDir = os.path.dirname(path)
		curName = os.path.basename(path)
		lastDot = curName.rfind('.')
		ext = newName = ''

		if re.search(r'\..{3}\.(gz|bz|bz2)$', curName):
			pos = -7
			if curName[-1:] == '2': pos -= 1
			ext = curName[pos:]
			oldName = curName[0:pos]
			newName = oldName + copy
		elif lastDot <= 0:
			oldName = curName
			newName = oldName + copy
			pass
		else:
			ext = curName[lastDot:]
			oldName = curName[0:lastDot]
			newName = oldName + copy

		pos = 0

		if oldName[-len(copy):] == copy:
			newName = oldName
		elif re.search(r'' + copy +'\s\d+$', oldName):
			pos = oldName.rfind(copy) + len(copy)
			newName = oldName[0:pos]
		else:
			newPath = os.path.join(curDir, newName + ext)
			if not os.path.exists(newPath):
				return newPath

		# if we are here then copy already exists or making copy of copy
		# we will make new indexed copy *black magic*
		idx = 1
		if pos > 0: idx = int(oldName[pos:])
		while True:
			idx += 1
			newNameExt = newName + ' ' + str(idx) + ext
			newPath = os.path.join(curDir, newNameExt)
			if not os.path.exists(newPath):
				return newPath
			# if idx >= 1000: break # possible loop

		return


	def __remove(self, target):
		if not self.__isAllowed(target, 'rm'):
			self.__errorData(target, 'Access denied!')

		if not os.path.isdir(target):
			try:
				os.unlink(target)
				return True
			except:
				self.__errorData(target, 'Remove failed')
				return False
		else:
			for i in os.listdir(target):
				if self.__isAccepted(i):
					self.__remove(os.path.join(target, i))

			try:
				os.rmdir(target)
				return True
			except:
				self.__errorData(target, 'Remove failed')
				return False
		pass


	def __info(self, path):
		mime = ''
		filetype = 'file'
		if os.path.isfile(path): filetype = 'file'
		if os.path.isdir(path): filetype = 'dir'
		if os.path.islink(path): filetype = 'link'

		stat = os.lstat(path)

		info = {
			'name': os.path.basename(path),
			'hash': self.__hash(path),
			# 'type': filetype,
			'mime': 'directory' if filetype == 'dir' else self.__mimetype(path),
			'date': datetime.fromtimestamp(stat.st_mtime).strftime("%d %b %Y %H:%M"),
			'size': self.__dirSize(path) if filetype == 'dir' else stat.st_size,
			'read': self.__isAllowed(path, 'read'),
			'write': self.__isAllowed(path, 'write'),
			'rm': self.__isAllowed(path, 'rm')
		}
		
		if filetype == 'link':
			path = self.__readlink(path)
			if not path:
				info['mime'] = 'broken'
				return info

			if os.path.isdir(path):
				info['mime'] = 'directory'
			else:
				info['parent'] = self.__hash(os.path.dirname(path))
				info['mime'] = self.__mimetype(path)

			if self._options['rootAlias']:
				basename = self._options['rootAlias']
			else:
				basename = os.path.basename(self._options['root'])

			info['link'] = self.__hash(path)
			info['linkTo'] = basename + path[len(self._options['root']):]
			info['read'] = info['read'] and self.__isAllowed(path, 'read')
			info['write'] = info['write'] and self.__isAllowed(path, 'write')
			info['rm'] = self.__isAllowed(path, 'rm')

		if not info['mime'] == 'directory':
			if self._options['fileURL']:
				info['url'] = self.__path2url(path)
			if info['mime'][0:5] == 'image':
				if self.__canCreateTmb():
					dim = self.__getImgSize(path)
					if dim:
						info['dim'] = dim
						info['resize'] = True

					# if we are in tmb dir, files are thumbs itself
					if os.path.dirname(path) == self._options['tmbDir']:
						info['tmb'] = self.__path2url(path)
						return info

					tmb = os.path.join(self._options['tmbDir'], info['hash'] + '.png')

					if os.path.exists(tmb):
						tmbUrl = self.__path2url(tmb)
						info['tmb'] = tmbUrl
					else:
						self._response['tmb'] = True

		return info


	def __read(self):
		if 'current' in self._request and 'file' in self._request:
			curDir = self.__findDir(self._request['current'], None)
			curFile = self.__find(self._request['file'], curDir)
			if curDir and curFile:
				if self.__isAllowed(curFile, 'read'):
					self._response['content'] = open(curFile, 'r').read()
				else:
					self._response['error'] = 'Access denied'
				return

		self._response['error'] = 'Invalid parameters'
		return


	def __edit(self):
		error = ''
		if 'current' in self._request and 'file' in self._request and 'content' in self._request:
			curDir = self.__findDir(self._request['current'], None)
			curFile = self.__find(self._request['file'], curDir)
			error = curFile
			if curFile and curDir:
				if self.__isAllowed(curFile, 'write'):
					try:
						f = open(curFile, 'w+')
						f.write(self._request['content'])
						f.close()
						self._response['file'] = self.__info(curFile)
					except:
						self._response['error'] = 'Unable to write to file'
				else:
					self._response['error'] = 'Access denied'
			return

		self._response['error'] = error + ' Invalid parameters'
		return


	def __mimetype(self, path):
		return mimetypes.guess_type(path)[0] or 'unknown'


	def __tmb(self, path, tmb):
		try:
			im = self._im.open(path).copy()
			size = self._options['tmbSize'], self._options['tmbSize']
			box = self.__cropTuple(im.size)
			if box:
				im = im.crop(box)
			im.thumbnail(size, self._im.ANTIALIAS)
			im.save(tmb, 'PNG')
		except Exception, e:
			self.__debug('tmbFailed_' + path, str(e))
			return False
		return True


	def __cropTuple(self, size):
		w, h = size
		if (w > h): # landscape
			l = int((w - h) / 2)
			u = 0
			r = l + h
			d = h
			return (l, u, r, d)
		elif (h > w): # portrait
			l = 0
			u = int((h - w) / 2)
			r = w
			d = u + w
			return (l, u, r, d)
		else: # cube
			pass

		return False


	def __readlink(self, path):
		"""Read link and return real path if not broken"""
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


	def __fbuffer(self, f, chunk_size = _options['uplWriteChunk']):
		while True:
			chunk = f.read(chunk_size)
			if not chunk: break
			yield chunk


	def __canCreateTmb(self, path = None):
		if self._options['imgLib'] and self._options['tmbDir']:
			if path is not None:
				mime = self.__mimetype(path)
				if not mime[0:5] == 'image':
					return False
			return True
		else:
			return False


	def __isUploadAllow(self, file):
		# TODO
		return True


	def __isAccepted(self, target):
		if target == '.' or target == '..':
			return False
		if target[0:1] == '.' and not self._options['dotFiles']:
			return False
		return True


	def __isAllowed(self, path, access):
		if access == 'read':
			if not os.access(path, os.R_OK):
				self.__errorData(path, access)
				return False
		elif access == 'write':
			if not os.access(path, os.W_OK):
				self.__errorData(path, access)
				return False
		elif access == 'rm':
			if not os.access(os.path.dirname(path), os.W_OK):
				self.__errorData(path, access)
				return False
		return True
		# TODO _perms here


	def __hash(self, input):
		"""Hash of path can be any uniq"""
		return str(binascii.crc32(input))


	def __path2url(self, path):
		curDir = path
		length = len(self._options['root'])
		url = str(self._options['URL'] + curDir[length:]).replace(os.sep, '/')
		try:
			import urllib
			url = urllib.quote(url, '/:~')
		except:
			pass
		return url


	def __errorData(self, path, msg):
		"""Collect error/warning messages"""
		self._errorData[path] = msg


	def __initImgLib(self):
		if not self._options['imgLib'] is False and self._im is None:
			try:
				import Image
				Image
				self._im = Image
				self._options['imgLib'] = 'PIL'
			except:
				self._options['imgLib'] = False
				self._im = False

		self.__debug('imgLib', self._options['imgLib'])
		return self._options['imgLib']


	def __getImgSize(self, path):
		self.__initImgLib();
		if self.__canCreateTmb():
			try:
				im = self._im.open(path)
				return str(im.size[0]) + 'x' + str(im.size[1])
			except:
				pass

		return False


	def __debug(self, k, v):
		if self._options['debug']:
			self._response['debug'].update({k: v})
		return



elFinder({
	'root': '/Users/troex/Sites/git/elrte/files/TEST',
	'URL': 'http://php5.localhost:8001/~troex/git/elrte/files/TEST',
	# 'root': '/Users/troex/Sites/',
	# 'URL': 'http://php5.localhost:8001/~troex/',
	'imgLib': 'auto'
}).run()

#print os.environ
