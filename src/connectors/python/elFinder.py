#!/usr/bin/env python
#
# Connector for elFinder File Manager
# author Troex Nevelin <troex@fury.scancode.ru>

import hashlib
import mimetypes
import os
import os.path
import re
import shutil
import time
from datetime import datetime

class connector():
	"""Connector for elFinder"""

	_options = {
		'root': '',
		'URL': '',
		'rootAlias': 'Home',
		'dotFiles': False,
		'dirSize': True,
		'fileMode': 0644,
		'dirMode': 0755,
		'imgLib': 'auto',
		'tmbDir': '.tmb',
		'tmbAtOnce': 5,
		'tmbSize': 48,
		'fileURL': True,
		'uploadMaxSize': 256,
		'uploadWriteChunk': 8192,
		'uploadAllow': [],
		'uploadDeny': [],
		'uploadOrder': ['deny', 'allow'],
		# 'aclObj': None, # TODO
		# 'aclRole': 'user', # TODO
		'defaults': {
			'read': True,
			'write': True,
			'rm': True
		},
		'perms': {},
		'archiveMimes': {},
		'archivers': {},
		'disabled': [],
		'debug': False
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
		'archive': '__archive',
		'resize': '__resize',
		'tmb': '__thumbnails',
		'ping': '__ping'
	}

	_mimeType = {
		# text
		'txt': 'text/plain',
		'conf': 'text/plain',
		'ini': 'text/plain',
		'php': 'text/x-php',
		'html': 'text/html',
		'htm': 'text/html',
		'js' : 'text/javascript',
		'css': 'text/css',
		'rtf': 'text/rtf',
		'rtfd': 'text/rtfd',
		'py' : 'text/x-python',
		'java': 'text/x-java-source',
		'rb' : 'text/x-ruby',
		'sh' : 'text/x-shellscript',
		'pl' : 'text/x-perl',
		'sql': 'text/x-sql',
		# apps
		'doc': 'application/msword',
		'ogg': 'application/ogg',
		'7z': 'application/x-7z-compressed',
		# video
		'ogm': 'appllication/ogm',
		'mkv': 'video/x-matroska'
	}

	_time = 0
	_request = {}
	_response = {}
	_errorData = {}
	_form = {}
	_im = None
	_sp = None
	_today = 0
	_yesterday = 0

	# public variables
	httpAllowedParameters = ('cmd', 'target', 'targets[]', 'current', 'tree', 'name',
		'content', 'src', 'dst', 'cut', 'init', 'type', 'width', 'height', 'upload[]')
	# return variables
	httpStatusCode = 0
	httpHeader = {}
	httpResponse = None

	def __init__(self, opts):
		for opt in opts:
			self._options[opt] = opts.get(opt)

		self._response['debug'] = {}

		self._options['URL'] = self._options['URL'].rstrip('/')
		self._options['root'] = self._options['root'].rstrip(os.sep)
		self.__debug('URL', self._options['URL'])
		self.__debug('root', self._options['root'])

		for cmd in self._options['disabled']:
			if cmd in self._commands:
				del self._commands[cmd]

		if self._options['tmbDir']:
			self._options['tmbDir'] = os.path.join(self._options['root'], self._options['tmbDir'])
			if not os.path.exists(self._options['tmbDir']):
				self._options['tmbDir'] = False


	def __reset(self):
		"""Flush per request variables"""
		self.httpStatusCode = 0
		self.httpHeader = {}
		self.httpResponse = None
		self._request = {}
		self._response = {}
		self._errorData = {}
		self._form = {}

		self._time = time.time()
		t = datetime.fromtimestamp(self._time)
		self._today = time.mktime(datetime(t.year, t.month, t.day).timetuple())
		self._yesterday = self._today - 86400

		self._response['debug'] = {}


	def run(self, httpRequest = []):
		"""main function"""
		self.__reset()
		rootOk = True
		if not os.path.exists(self._options['root']) or self._options['root'] == '':
			rootOk = False
			self._response['error'] = 'Invalid backend configuration'
		elif not self.__isAllowed(self._options['root'], 'read'):
			rootOk = False
			self._response['error'] = 'Access denied'

		for field in self.httpAllowedParameters:
			if field in httpRequest:
				self._request[field] = httpRequest[field]

		if rootOk is True:
			if 'cmd' in self._request:
				if self._request['cmd'] in self._commands:
					cmd = self._commands[self._request['cmd']]
					func = getattr(self, '_' + self.__class__.__name__ + cmd, None)
					if callable(func):
						try:
							func()
						except Exception, e:
							self._response['error'] = 'Command Failed'
							self.__debug('exception', str(e))
				else:
					self._response['error'] = 'Unknown command'
			else:
				self.__open()

			if 'init' in self._request:
				self.__checkArchivers()
				self._response['disabled'] = self._options['disabled']
				if not self._options['fileURL']:
					url = ''
				else:
					url = self._options['URL']
				self._response['params'] = {
					'dotFiles': self._options['dotFiles'],
					'uplMaxSize': str(self._options['uploadMaxSize']) + 'M',
					'archives': self._options['archiveMimes'],
					'extract': self._options['archivers']['extract'].keys(),
					'url': url
				}

		if self._errorData:
			self._response['errorData'] = self._errorData

		if self._options['debug']:
			self.__debug('time', (time.time() - self._time))
		else:
			if 'debug' in self._response:
				del self._response['debug']

		if self.httpStatusCode < 100:
			self.httpStatusCode = 200

		if not 'Content-type' in self.httpHeader:
			if ('cmd' in self._request and self._request['cmd'] == 'upload') or self._options['debug']:
				self.httpHeader['Content-type'] = 'text/html'
			else:
				self.httpHeader['Content-type'] = 'application/json'

		self.httpResponse = self._response

		return self.httpStatusCode, self.httpHeader, self.httpResponse


	def __open(self):
		"""Open file or directory"""
		# try to open file
		if 'current' in self._request:
			curDir = self.__findDir(self._request['current'], None)
			curFile = self.__find(self._request['target'], curDir)

			if not curDir or not curFile or os.path.isdir(curFile):
				self.httpStatusCode = 404
				self.httpHeader['Content-type'] = 'text/html'
				self.httpResponse = 'File not found'
				return
			if not self.__isAllowed(curDir, 'read') or not self.__isAllowed(curFile, 'read'):
				self.httpStatusCode = 403
				self.httpHeader['Content-type'] = 'text/html'
				self.httpResponse = 'Access denied'
				return

			if os.path.islink(curFile):
				curFile = self.__readlink(curFile)
				if not curFile or os.path.isdir(curFile):
					self.httpStatusCode = 404
					self.httpHeader['Content-type'] = 'text/html'
					self.httpResponse = 'File not found'
					return
				if (
					not self.__isAllowed(os.path.dirname(curFile), 'read')
					or not self.__isAllowed(curFile, 'read')
					):
					self.httpStatusCode = 403
					self.httpHeader['Content-type'] = 'text/html'
					self.httpResponse = 'Access denied'
					return

			mime = self.__mimetype(curFile)
			parts = mime.split('/', 2)
			if parts[0] == 'image': disp = 'image'
			elif parts[0] == 'text': disp = 'inline'
			else: disp = 'attachments'

			self.httpStatusCode = 200
			self.httpHeader['Content-type'] = mime
			self.httpHeader['Content-Disposition'] = disp + '; filename=' + os.path.basename(curFile)
			self.httpHeader['Content-Location'] = curFile.replace(self._options['root'], '')
			self.httpHeader['Content-Transfer-Encoding'] = 'binary'
			self.httpHeader['Content-Length'] = str(os.lstat(curFile).st_size)
			self.httpHeader['Connection'] = 'close'
			self._response['file'] = open(curFile, 'r')
			return
		# try dir
		else:
			path = self._options['root']

			if 'target' in self._request:
				target = self.__findDir(self._request['target'], None)
				if not target:
					self._response['error'] = 'Invalid parameters'
				elif not self.__isAllowed(target, 'read'):
					self._response['error'] = 'Access denied'
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
			self._response['error'] = 'File not found'
		elif not self.__isAllowed(curDir, 'write') and self.__isAllowed(curName, 'rm'):
			self._response['error'] = 'Access denied'
		elif not self.__checkName(name):
			self._response['error'] = 'Invalid name'
		elif os.path.exists(newName):
			self._response['error'] = 'File or folder with the same name already exists'
		else:
			self.__rmTmb(curName)
			try:
				os.rename(curName, newName)
				self._response['select'] = [self.__hash(newName)]
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
			self._response['error'] = 'Access denied'
		elif not self.__checkName(name):
			self._response['error'] = 'Invalid name'
		elif os.path.exists(newDir):
			self._response['error'] = 'File or folder with the same name already exists'
		else:
			try:
				os.mkdir(newDir, int(self._options['dirMode']))
				self._response['select'] = [self.__hash(newDir)]
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
			self._response['error'] = 'Access denied'
		elif not self.__checkName(name):
			self._response['error'] = 'Invalid name'
		elif os.path.exists(newFile):
			self._response['error'] = 'File or folder with the same name already exists'
		else:
			try:
				open(newFile, 'w').close()
				self._response['select'] = [self.__hash(newFile)]
				self.__content(curDir, False)
			except:
				self._response['error'] = 'Unable to create file'


	def __rm(self):
		"""Delete files and directories"""
		current = rmList = None
		curDir = rmFile = None
		if 'current' in self._request and 'targets[]' in self._request:
			current = self._request['current']
			rmList = self._request['targets[]']
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
		# TODO if errorData not empty return error
		self.__content(curDir, True)


	def __upload(self):
		"""Upload files"""
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
			if not 'upload[]' in self._request:
				self._response['error'] = 'No file to upload'
				return

			upFiles = self._request['upload[]']
			# invalid format
			# must be dict('filename1': 'filedescriptor1', 'filename2': 'filedescriptor2', ...)
			if not isinstance(upFiles, dict):
				self._response['error'] = 'Invalid parameters'
				return

			self._response['select'] = []
			total = 0
			upSize = 0
			maxSize = self._options['uploadMaxSize'] * 1024 * 1024
			for name, data in upFiles.iteritems():
				if name:
					total += 1
					name = os.path.basename(name)
					if not self.__checkName(name):
						self.__errorData(name, 'Invalid name')
					else:
						name = os.path.join(curDir, name)
						try:
							f = open(name, 'wb', self._options['uploadWriteChunk'])
							for chunk in self.__fbuffer(data):
								f.write(chunk)
							f.close()
							upSize += os.lstat(name).st_size
							if self.__isUploadAllow(name):
								os.chmod(name, self._options['fileMode'])
								self._response['select'].append(self.__hash(name))
							else:
								self.__errorData(name, 'Not allowed file type')
								try:
									os.unlink(name)
								except:
									pass
						except:
							self.__errorData(name, 'Unable to save uploaded file')
						if upSize > maxSize:
							try:
								os.unlink(name)
								self.__errorData(name, 'File exceeds the maximum allowed filesize')
							except:
								pass
								# TODO ?
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
		"""Copy or cut files/directories"""
		if 'current' in self._request and 'src' in self._request and 'dst' in self._request:
			curDir = self.__findDir(self._request['current'], None)
			src = self.__findDir(self._request['src'], None)
			dst = self.__findDir(self._request['dst'], None)
			if not curDir or not src or not dst or not 'targets[]' in self._request:
				self._response['error'] = 'Invalid parameters'
				return
			files = self._request['targets[]']
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
						self.__content(curDir, True)
						return
					# TODO thumbs
					if os.path.exists(newDst):
						self._response['error'] = 'Unable to move files'
						self._errorData(f, 'File or folder with the same name already exists')
						self.__content(curDir, True)
						return
					try:
						os.rename(f, newDst)
						self.__rmTmb(f)
						continue
					except:
						self._response['error'] = 'Unable to move files'
						self._errorData(f, 'Unable to move')
						self.__content(curDir, True)
						return
				else:
					if not self.__copy(f, newDst):
						self._response['error'] = 'Unable to copy files'
						self.__content(curDir, True)
						return
					continue
			self.__content(curDir, True)
		else:
			self._response['error'] = 'Invalid parameters'

		return


	def __duplicate(self):
		"""Create copy of files/directories"""
		if 'current' in self._request and 'target' in self._request:
			curDir = self.__findDir(self._request['current'], None)
			target = self.__find(self._request['target'], curDir)
			if not curDir or not target:
				self._response['error'] = 'Invalid parameters'
				return
			if not self.__isAllowed(target, 'read') or not self.__isAllowed(curDir, 'write'):
				self._response['error'] = 'Access denied'
			newName = self.__uniqueName(target)
			if not self.__copy(target, newName):
				self._response['error'] = 'Unable to create file copy'
				return

		self.__content(curDir, True)
		return


	def __resize(self):
		"""Scale image size"""
		if not (
			'current' in self._request and 'target' in self._request
			and 'width' in self._request and 'height' in self._request
			):
			self._response['error'] = 'Invalid parameters'
			return

		width = int(self._request['width'])
		height = int(self._request['height'])
		curDir = self.__findDir(self._request['current'], None)
		curFile = self.__find(self._request['target'], curDir)

		if width < 1 or height < 1 or not curDir or not curFile:
			self._response['error'] = 'Invalid parameters'
			return
		if not self.__isAllowed(curFile, 'write'):
			self._response['error'] = 'Access denied'
			return
		if not self.__mimetype(curFile).find('image') == 0:
			self._response['error'] = 'File is not an image'
			return

		self.__debug('resize ' + curFile, str(width) + ':' + str(height))
		self.__initImgLib()
		try:
			im = self._im.open(curFile)
			imResized = im.resize((width, height), self._im.ANTIALIAS)
			imResized.save(curFile)
		except Exception, e:
			self.__debug('resizeFailed_' + path, str(e))
			self._response['error'] = 'Unable to resize image'
			return

		self._response['select'] = [self.__hash(curFile)]
		self.__content(curDir, False)
		return


	def __thumbnails(self):
		"""Create previews for images"""
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
				tmbMax = 5
			self._response['current'] = self.__hash(curDir)
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
							i += 1
				if i >= tmbMax:
					self._response['tmb'] = True
					break
		else:
			return False

		return


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
			'name': self.__checkUtf8(name),
			'mime': 'directory',
			'rel': self.__checkUtf8(rel),
			'size': 0,
			'date': datetime.fromtimestamp(os.stat(path).st_mtime).strftime("%d %b %Y %H:%M"),
			'read': True,
			'write': self.__isAllowed(path, 'write'),
			'rm': not root and self.__isAllowed(path, 'rm')
		}


	def __cdc(self, path):
		"""Current Directory Content"""
		files = []
		dirs = []

		for f in sorted(os.listdir(path)):
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


	def __info(self, path):
		mime = ''
		filetype = 'file'
		if os.path.isfile(path): filetype = 'file'
		if os.path.isdir(path): filetype = 'dir'
		if os.path.islink(path): filetype = 'link'

		stat = os.lstat(path)
		statDate = datetime.fromtimestamp(stat.st_mtime)

		fdate = ''
		if stat.st_mtime >= self._today:
			fdate = 'Today ' + statDate.strftime("%H:%M")
		elif stat.st_mtime >= self._yesterday and stat.st_mtime < self._today:
			fdate = 'Yesterday ' + statDate.strftime("%H:%M")
		else:
			fdate = statDate.strftime("%d %b %Y %H:%M")

		info = {
			'name': self.__checkUtf8(os.path.basename(path)),
			'hash': self.__hash(path),
			'mime': 'directory' if filetype == 'dir' else self.__mimetype(path),
			'date': fdate,
			'size': self.__dirSize(path) if filetype == 'dir' else stat.st_size,
			'read': self.__isAllowed(path, 'read'),
			'write': self.__isAllowed(path, 'write'),
			'rm': self.__isAllowed(path, 'rm')
		}

		if filetype == 'link':
			lpath = self.__readlink(path)
			if not lpath:
				info['mime'] = 'symlink-broken'
				return info

			if os.path.isdir(lpath):
				info['mime'] = 'directory'
			else:
				info['parent'] = self.__hash(os.path.dirname(lpath))
				info['mime'] = self.__mimetype(lpath)

			if self._options['rootAlias']:
				basename = self._options['rootAlias']
			else:
				basename = os.path.basename(self._options['root'])

			info['link'] = self.__hash(lpath)
			info['linkTo'] = basename + lpath[len(self._options['root']):]
			info['read'] = info['read'] and self.__isAllowed(lpath, 'read')
			info['write'] = info['write'] and self.__isAllowed(lpath, 'write')
			info['rm'] = self.__isAllowed(lpath, 'rm')
		else:
			lpath = False

		if not info['mime'] == 'directory':
			if self._options['fileURL'] and info['read'] is True:
				if lpath:
					info['url'] = self.__path2url(lpath)
				else:
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


	def __tree(self, path):
		"""Return directory tree starting from path"""

		if not os.path.isdir(path): return ''
		if os.path.islink(path): return ''

		if path == self._options['root'] and self._options['rootAlias']:
			name = self._options['rootAlias']
		else:
			name = os.path.basename(path)
		tree = {
			'hash': self.__hash(path),
			'name': self.__checkUtf8(name),
			'read': self.__isAllowed(path, 'read'),
			'write': self.__isAllowed(path, 'write'),
			'dirs': []
		}

		if self.__isAllowed(path, 'read'):
			for d in sorted(os.listdir(path)):
				pd = os.path.join(path, d)
				if os.path.isdir(pd) and not os.path.islink(pd) and self.__isAccepted(d):
					tree['dirs'].append(self.__tree(pd))

		return tree


	def __uniqueName(self, path, copy = ' copy'):
		"""Generate unique name for file copied file"""
		curDir = os.path.dirname(path)
		curName = os.path.basename(path)
		lastDot = curName.rfind('.')
		ext = newName = ''

		if not os.path.isdir(path) and re.search(r'\..{3}\.(gz|bz|bz2)$', curName):
			pos = -7
			if curName[-1:] == '2':
				pos -= 1
			ext = curName[pos:]
			oldName = curName[0:pos]
			newName = oldName + copy
		elif os.path.isdir(path) or lastDot <= 0:
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
		"""Internal remove procedure"""
		if not self.__isAllowed(target, 'rm'):
			self.__errorData(target, 'Access denied')

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


	def __copy(self, src, dst):
		"""Internal copy procedure"""
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
				self.__errorData(src, 'Unable to copy files')
				return False
		else:
			try:
				os.mkdir(dst)
				shutil.copymode(src, dst)
			except:
				self.__errorData(src, 'Unable to copy files')
				return False

			for i in os.listdir(src):
				newSrc = os.path.join(src, i)
				newDst = os.path.join(dst, i)
				if not self.__copy(newSrc, newDst):
					self.__errorData(newSrc, 'Unable to copy files')
					return False

		return True


	def __checkName(self, name):
		"""Check for valid file/dir name"""
		pattern = r'[\/\\\:\<\>]'
		if re.search(pattern, name):
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


	def __read(self):
		if 'current' in self._request and 'target' in self._request:
			curDir = self.__findDir(self._request['current'], None)
			curFile = self.__find(self._request['target'], curDir)
			if curDir and curFile:
				if self.__isAllowed(curFile, 'read'):
					self._response['content'] = open(curFile, 'r').read()
				else:
					self._response['error'] = 'Access denied'
				return

		self._response['error'] = 'Invalid parameters'
		return


	def __edit(self):
		"""Save content in file"""
		error = ''
		if 'current' in self._request and 'target' in self._request and 'content' in self._request:
			curDir = self.__findDir(self._request['current'], None)
			curFile = self.__find(self._request['target'], curDir)
			error = curFile
			if curFile and curDir:
				if self.__isAllowed(curFile, 'write'):
					try:
						f = open(curFile, 'w+')
						f.write(self._request['content'])
						f.close()
						self._response['target'] = self.__info(curFile)
					except:
						self._response['error'] = 'Unable to write to file'
				else:
					self._response['error'] = 'Access denied'
			return

		self._response['error'] = 'Invalid parameters'
		return


	def __archive(self):
		"""Compress files/directories to archive"""
		self.__checkArchivers()

		if (
			not self._options['archivers']['create'] or not 'type' in self._request
			or not 'current' in self._request
			or not 'targets[]' in self._request
			or not 'name' in self._request
			):
			self._response['error'] = 'Invalid parameters'
			return

		curDir = self.__findDir(self._request['current'], None)
		archiveType = self._request['type']
		if (
			not archiveType in self._options['archivers']['create']
			or not archiveType in self._options['archiveMimes']
			or not curDir
			or not self.__isAllowed(curDir, 'write')
			):
			self._response['error'] = 'Unable to create archive'
			return

		files = self._request['targets[]']
		if not isinstance(files, list):
			files = [files]

		realFiles = []
		for fhash in files:
			curFile = self.__find(fhash, curDir)
			if not curFile:
				self._response['error'] = 'File not found'
				return
			realFiles.append(os.path.basename(curFile))

		arc = self._options['archivers']['create'][archiveType]
		if len(realFiles) > 1:
			archiveName = self._request['name']
		else:
			archiveName = realFiles[0]
		archiveName += '.' + arc['ext']
		archiveName = self.__uniqueName(archiveName, '')
		archivePath = os.path.join(curDir, archiveName)

		cmd = [arc['cmd']]
		for a in arc['argc'].split():
			cmd.append(a)
		cmd.append(archiveName)
		for f in realFiles:
			cmd.append(f)

		curCwd = os.getcwd()
		os.chdir(curDir)
		self.__runSubProcess(cmd)
		os.chdir(curCwd)

		if os.path.exists(archivePath):
			self.__content(curDir, False)
			self._response['select'] = [self.__hash(archivePath)]
		else:
			self._response['error'] = 'Unable to create archive'

		return


	def __extract(self):
		"""Uncompress archive"""
		if not 'current' in self._request or not 'target' in self._request:
			self._response['error'] = 'Invalid parameters'
			return

		curDir = self.__findDir(self._request['current'], None)
		curFile = self.__find(self._request['target'], curDir)
		mime = self.__mimetype(curFile)
		self.__checkArchivers()

		if (
			not mime in self._options['archivers']['extract']
			or not curDir
			or not curFile
			or not self.__isAllowed(curDir, 'write')
			):
			self._response['error'] = 'Invalid parameters'
			return

		arc = self._options['archivers']['extract'][mime]

		cmd = [arc['cmd']]
		for a in arc['argc'].split():
			cmd.append(a)
		cmd.append(curFile)

		curCwd = os.getcwd()
		os.chdir(curDir)
		ret = self.__runSubProcess(cmd)
		os.chdir(curCwd)

		if ret:
			self.__content(curDir, True)
		else:
			self._response['error'] = 'Unable to extract files from archive'

		return


	def __ping(self):
		"""Workaround for Safari"""
		self.httpStatusCode = 200
		self.httpHeader['Connection'] = 'close'
		return


	def __mimetype(self, path):
		"""Detect mimetype of file"""
		mime = mimetypes.guess_type(path)[0] or 'unknown'
		ext = path[path.rfind('.') + 1:]

		if mime == 'unknown' and ('.' + ext) in mimetypes.types_map:
			mime = mimetypes.types_map['.' + ext]

		if mime == 'text/plain' and ext == 'pl':
			mime = self._mimeType[ext]

		if mime == 'application/vnd.ms-office' and ext == 'doc':
			mime = self._mimeType[ext]

		if mime == 'unknown':
			if os.path.basename(path) in ['README', 'ChangeLog']:
				mime = 'text/plain'
			else:
				if ext in self._mimeType:
					mime = self._mimeType[ext]

		# self.__debug('mime ' + os.path.basename(path), ext + ' ' + mime)
		return mime


	def __tmb(self, path, tmb):
		"""Internal thumbnail create procedure"""
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


	def __rmTmb(self, path):
		tmb = self.__tmbPath(path)
		if self._options['tmbDir']:
			if os.path.exists(tmb):
				try:
					os.unlink(tmb)
				except:
					pass


	def __cropTuple(self, size):
		w, h = size
		if w > h: # landscape
			l = int((w - h) / 2)
			u = 0
			r = l + h
			d = h
			return (l, u, r, d)
		elif h > w: # portrait
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
		if self._options['dirSize']:
			for dirpath, dirnames, filenames in os.walk(path):
				for f in filenames:
					fp = os.path.join(dirpath, f)
					if os.path.exists(fp):
						total_size += os.stat(fp).st_size
		else:
			total_size = os.lstat(path).st_size
		return total_size


	def __fbuffer(self, f, chunk_size = _options['uploadWriteChunk']):
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


	def __tmbPath(self, path):
		tmb = False
		if self._options['tmbDir']:
			if not os.path.dirname(path) == self._options['tmbDir']:
				tmb = os.path.join(self._options['tmbDir'], self.__hash(path) + '.png')
		return tmb


	def __isUploadAllow(self, name):
		allow = False
		deny = False
		mime = self.__mimetype(name)

		if 'all' in self._options['uploadAllow']:
			allow = True
		else:
			for a in self._options['uploadAllow']:
				if mime.find(a) == 0:
					allow = True

		if 'all' in self._options['uploadDeny']:
			deny = True
		else:
			for d in self._options['uploadDeny']:
				if mime.find(d) == 0:
					deny = True

		if self._options['uploadOrder'][0] == 'allow': # ,deny
			if deny is True:
				return False
			elif allow is True:
				return True
			else:
				return False
		else: # deny,allow
			if allow is True:
				return True
			elif deny is True:
				return False
			else:
				return True


	def __isAccepted(self, target):
		if target == '.' or target == '..':
			return False
		if target[0:1] == '.' and not self._options['dotFiles']:
			return False
		return True


	def __isAllowed(self, path, access):
		if not os.path.exists(path):
			return False

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
		else:
			return False

		path = path[len(os.path.normpath(self._options['root'])):]
		for ppath in self._options['perms']:
			regex = r'' + ppath
			if re.search(regex, path) and access in self._options['perms'][ppath]:
				return self._options['perms'][ppath][access]

		return self._options['defaults'][access]


	def __hash(self, path):
		"""Hash of the path"""
		m = hashlib.md5()
		m.update(path)
		return str(m.hexdigest())


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


	def __checkArchivers(self):
		# import subprocess
		# sp = subprocess.Popen(['tar', '--version'], shell = False,
		# stdout = subprocess.PIPE, stderr=subprocess.PIPE)
		# out, err = sp.communicate()
		# print 'out:', out, '\nerr:', err, '\n'
		archive = { 'create': {}, 'extract': {} }
		c = archive['create']
		e = archive['extract']

		tar = self.__runSubProcess(['tar', '--version'])
		gzip = self.__runSubProcess(['gzip', '--version'])
		bzip2 = self.__runSubProcess(['bzip2', '--version'])
		zipc = self.__runSubProcess(['zip', '--version'])
		unzip = self.__runSubProcess(['unzip', '--help'])
		rar = self.__runSubProcess(['rar', '--version'], validReturn = [0, 7])
		unrar = self.__runSubProcess(['unrar'], validReturn = [0, 7])
		p7z = self.__runSubProcess(['7z', '--help'])
		p7za = self.__runSubProcess(['7za', '--help'])
		p7zr = self.__runSubProcess(['7zr', '--help'])

		# tar = False
		# tar = gzip = bzip2 = zipc = unzip = rar = unrar = False
		# print tar, gzip, bzip2, zipc, unzip, rar, unrar, p7z, p7za, p7zr

		if tar:
			mime = 'application/x-tar'
			c.update({mime: {'cmd': 'tar', 'argc': '-cf', 'ext': 'tar'}})
			e.update({mime: {'cmd': 'tar', 'argc': '-xf', 'ext': 'tar'}})

		if tar and gzip:
			mime = 'application/x-gzip'
			c.update({mime: {'cmd': 'tar', 'argc': '-czf', 'ext': 'tar.gz'}})
			e.update({mime: {'cmd': 'tar', 'argc': '-xzf', 'ext': 'tar.gz'}})

		if tar and bzip2:
			mime = 'application/x-bzip2'
			c.update({mime: {'cmd': 'tar', 'argc': '-cjf', 'ext': 'tar.bz2'}})
			e.update({mime: {'cmd': 'tar', 'argc': '-xjf', 'ext': 'tar.bz2'}})

		mime = 'application/zip'
		if zipc:
			c.update({mime: {'cmd': 'zip', 'argc': '-r9', 'ext': 'zip'}})
		if unzip:
			e.update({mime: {'cmd': 'unzip', 'argc': '', 'ext': 'zip'}})

		mime = 'application/x-rar'
		if rar:
			c.update({mime: {'cmd': 'rar', 'argc': 'a -inul', 'ext': 'rar'}})
			e.update({mime: {'cmd': 'rar', 'argc': 'x -y', 'ext': 'rar'}})
		elif unrar:
			e.update({mime: {'cmd': 'unrar', 'argc': 'x -y', 'ext': 'rar'}})

		p7zip = None
		if p7z:
			p7zip = '7z'
		elif p7za:
			p7zip = '7za'
		elif p7zr:
			p7zip = '7zr'

		if p7zip:
			mime = 'application/x-7z-compressed'
			c.update({mime: {'cmd': p7zip, 'argc': 'a -t7z', 'ext': '7z'}})
			e.update({mime: {'cmd': p7zip, 'argc': 'e -y', 'ext': '7z'}})

			mime = 'application/x-tar'
			if not mime in c:
				c.update({mime: {'cmd': p7zip, 'argc': 'a -ttar', 'ext': 'tar'}})
			if not mime in e:
				e.update({mime: {'cmd': p7zip, 'argc': 'e -y', 'ext': 'tar'}})

			mime = 'application/x-gzip'
			if not mime in c:
				c.update({mime: {'cmd': p7zip, 'argc': 'a -tgzip', 'ext': 'gz'}})
			if not mime in e:
				e.update({mime: {'cmd': p7zip, 'argc': 'e -y', 'ext': 'tar.gz'}})

			mime = 'application/x-bzip2'
			if not mime in c:
				c.update({mime: {'cmd': p7zip, 'argc': 'a -tbzip2', 'ext': 'bz2'}})
			if not mime in e:
				e.update({mime: {'cmd': p7zip, 'argc': 'e -y', 'ext': 'tar.bz2'}})

			mime = 'application/zip'
			if not mime in c:
				c.update({mime: {'cmd': p7zip, 'argc': 'a -tzip', 'ext': 'zip'}})
			if not mime in e:
				e.update({mime: {'cmd': p7zip, 'argc': 'e -y', 'ext': 'zip'}})

		if not self._options['archiveMimes']:
			self._options['archiveMimes'] = c.keys()
		else:
			pass

		self._options['archivers'] = archive
		pass


	def __runSubProcess(self, cmd, validReturn = [0]):
		if self._sp is None:
			import subprocess
			self._sp = subprocess

		try:
			sp = self._sp.Popen(cmd, shell = False, stdout = self._sp.PIPE, stderr = self._sp.PIPE, stdin = self._sp.PIPE)
			out, err = sp.communicate('')
			ret = sp.returncode
			# print cmd, ret, out, err
		except:
			return False

		if not ret in validReturn:
			return False

		return True


	def __checkUtf8(self, name):
		try:
			name.decode('utf-8')
		except UnicodeDecodeError:
			name = unicode(name, 'utf-8', 'replace')
			self.__debug('invalid encoding', name)
			#name += ' (invalid encoding)'
		return name

