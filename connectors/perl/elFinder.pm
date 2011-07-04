package elFinder;

require 5.004;
use strict;
use vars qw/$VERSION $DIRECTORY_SEPARATOR/;

use Digest::MD5 qw(md5_hex);

$VERSION = "0.1.0-dev"; # Версия движка и API
$DIRECTORY_SEPARATOR = '/';



sub new
{ # Создание нового класса. Отсюда начинается класс
	my ($class, %cfg) = @_; #Mod - список модулей для загрузки
	my $self = bless {}, $class;

	%{$self->{CONF}} = (
		'root'         => '',           # path to root directory
		'URL'          => '',           # root directory URL
		'rootAlias'    => 'Home',       # display this instead of root directory name
		'disabled'     => [],           # list of not allowed commands
		'dotFiles'     => 'false',      # display dot files
		'dirSize'      => 'true',       # count total directories sizes
		'fileMode'     => 0666,         # new files mode
		'dirMode'      => 0777,         # new folders mode
		'mimeDetect'   => 'auto',       # files mimetypes detection method (finfo, mime_content_type, linux (file -ib), bsd (file -Ib), internal (by extensions))
		'uploadAllow'  => [],           # mimetypes which allowed to upload
		'uploadDeny'   => [],           # mimetypes which not allowed to upload
		'uploadOrder'  => 'deny,allow', # order to proccess uploadAllow and uploadAllow options
		'imgLib'       => 'auto',       # image manipulation library (imagick, mogrify, gd)
		'tmbDir'       => '.tmb',       # directory name for image thumbnails. Set to "" to avoid thumbnails generation
		'tmbCleanProb' => 1,            # how frequiently clean thumbnails dir (0 - never, 200 - every init request)
		'tmbAtOnce'    => 5,            # number of thumbnails to generate per request
		'tmbSize'      => 48,           # images thumbnails size (px)
		'fileURL'      => 'true',       # display file URL in "get info"
		'DateTimeFormat'=> '%d-%m-%Y %H:%i:%S', # file modification date format
		'@Months'      => 'Январь,Февраль,Март,Апрель,Май,Июнь,Июль,Август,Сентябрь,Октябрь,Ноябрь,Декабрь',
		'@WeekDays'    => 'Воскресенье,Понедельник,Вторник,Среда,Четвер,Пятница,Суббота',
		'logger'       => 'null',       # object logger
		'aclObj'       => 'null',       # acl object (not implemented yet)
		'aclRole'      => 'user',       # role for acl
		'defaults'     => {             # default permisions
			'read'   => 'true',
			'write'  => 'true',
			'rm'     => 'true'
		},
		'perms'        => [],           # individual folders/files permisions     
		'debug'        => 'false',      # send debug to client
		'archiveMimes' => [],           # allowed archive's mimetypes to create. Leave empty for all available types.
		'archivers'    => [],           # info about archivers to use. See example below. Leave empty for auto detect
		'uplMaxSize'   => '8Mb'
	);
	$self->{CONF} = { %{$self->{CONF}}, %cfg };     # Чтение файла конфигурации
	# { %{$self->{CONF}},Libs::ReadF::LoadCfgDB($self,'') }
	#($self->{FORM}, $self->{URL}) = Libs::Web::ReadForms($self); # Чтение и разбор строки URL, multipart, forms
	#%{$self->{CTYPE}} = Libs::ReadF::LoadCfg($self,"$self->{CONF}->{'DirConf'}/mime.types",1); # mime.types для правильного вывода садержимого
	%{$self->{RES}} = ();

	if (substr($self->{CONF}->{'root'}, -1) eq $DIRECTORY_SEPARATOR)
	{
		$self->{CONF}->{'root'} = substr($self->{CONF}->{'root'}, 0, -1); # Убираем последний /
	}
	if (substr($self->{CONF}->{'URL'}, -1) eq $DIRECTORY_SEPARATOR)
	{
		$self->{CONF}->{'URL'} = substr($self->{CONF}->{'URL'}, 0, -1); # Убираем последний /
	}
	
	%{$self->{CMD}} = (
		'open'      => '_open',
		'reload'    => '_reload',
		'mkdir'     => '_mkdir',
		'mkfile'    => '_mkfile',
		'rename'    => '_rename',
		'upload'    => '_upload',
		'paste'     => '_paste',
		'rm'        => '_rm',
		'duplicate' => '_duplicate',
		'read'      => '_fread',
		'edit'      => '_edit',
		'archive'   => '_archive',
		'extract'   => '_extract',
		'resize'    => '_resize',
		'tmb'       => '_thumbnails',
		'ping'      => '_ping'
		);
	
	%{$self->{REQUEST}} = ();

	return $self;
}




sub run
{
	my ($self, %request) = @_;
	
	if ($self->{CONF}->{'root'} eq '' || is_dir($self->{CONF}->{'root'}) eq 'false')
	{
		$self->{RES}->{'error'} = 'Invalid backend configuration';
		return;
	}
	if (!_isAllowed($self, $self->{CONF}->{'root'}, 'read'))
	{
		$self->{RES}->{'error'} = 'Access denied';
		return;
	}
	$self->{REQUEST} = { %request };
	
	my $cmd = $self->{REQUEST}->{'cmd'};
	if (exists $self->{REQUEST}->{'init'})
	{
		my $ts = $self->_utime();
		$self->{RES}->{'disabled'} = $self->{CONF}->{'disabled'};
		%{$self->{RES}->{'params'}} = (
			'dotFiles'   => $self->{CONF}->{'dotFiles'},
			'uplMaxSize' => $self->{CONF}->{'uplMaxSize'},
			'archives'   => [],
			'extract'    => [],
			'url'        => $self->{CONF}->{'fileURL'} eq 'true' ? $self->{CONF}->{'URL'} : ''
		);

		#if (isset($this->_commands['archive']) || isset($this->_commands['extract'])) {
		#$this->_checkArchivers();
		#if (isset($this->_commands['archive'])) {
		#$this->_result['params']['archives'] = $this->_options['archiveMimes'];
		#}
		#if (isset($this->_commands['extract'])) {
		#$this->_result['params']['extract'] = array_keys($this->_options['archivers']['extract']);
		#}
		#}

		## clean thumbnails dir
		if ($self->{CONF}->{'tmbDir'} ne '')
		{
			srand(time() * 1000000);
			if (rand(200) <= $self->{CONF}->{'tmbCleanProb'})
			{
				my $ts2 = $self->_utime();
				opendir(DIR, $self->{CONF}->{'tmbDir'});
				my @content = grep {!/^\.{1,2}$/} sort readdir(DIR);
				closedir(DIR);
				foreach my $subdir (@content)
				{
					unlink($self->{CONF}->{'tmbDir'}.$DIRECTORY_SEPARATOR.$subdir);
				}
			}
		}
	}
	


	if ($cmd ne '')
	{
		my $func = $self->{CMD}->{$cmd};
		$self->$func($self);
		#$self->{RES}->{'error'} .= ' '.'cmd:'.$cmd." $self->{CMD}->{$cmd} <br>Targ - $self->{URL}->{'target'}<br>Cur -  $self->{URL}->{'current'}";
	}
	else
	{
		#$self->{RES}->{'error'} .= ' '.'1 cmd:'.$cmd;
		$self->_open();
	}
}








sub _isAllowed
{
	my ($self, $path, $action, $bool) = @_;
#print "[$path, $action]\n";
#return 'true';
#print $self->{CONF}->{'defaul_isAllowed($self, $path, 'write')ts'}{$action};
#if    ($action eq 'read'){return 'true'}
#elsif ($action eq 'write'){return 'true'}
#elsif ($action eq 'rm'){return 'true'}
#return 'true';
#print "$self->{CONF}->{'root'}[$action]\n";
#$path = substr($path, length($self->{CONF}{'root'})+1);

#foreach ($self->{CONF}->{'perms'} as $regex => $rules) { # Довести до ума
#  if (preg_match($regex, $path)) {
#      if (isset($rules[$action])) { return $rules[$action];}
#  }
#}

	my $last_action = $self->{CONF}->{'defaults'}{$action};

	if ($bool)
	{
		return ($last_action eq 'true') ? 1 : 0;
	}
	return ($last_action eq 'true') ? \1 : \0;
	#return (exists $self->{CONF}->{'defaults'}{$action}) ? $self->{CONF}->{'defaults'}{$action} : \0;
}


sub _basename
{
	my ($path) = @_;
	if (rindex($path, $DIRECTORY_SEPARATOR) == -1)
	{
		return $path;
	}
	return substr($path, rindex($path, $DIRECTORY_SEPARATOR) + 1);
}

sub is_dir
{
	my ($path)=@_;
	if (-d "$path")
	{
		return 'true';
	}
	return 'false';
}

sub _isAccepted
{
	my ($self, $file) = @_;
	$file = _basename($file);
	if ('.' eq $file || '..' eq $file)
	{
		return 'false';
	}
	if ($self->{CONF}->{'dotFiles'} ne 'true' && '.' eq substr($file, 0, 1))
	{
		return 'false';
	}
	return 'true';
}


sub _tree
{
	my ($self, $path) = @_;
	my %dir = (
		'hash'  => _hash($path),
		'name'  =>  $path eq $self->{CONF}->{'root'} && $self->{CONF}->{'rootAlias'} ne '' ? $self->{CONF}->{'rootAlias'} : _basename($path),
		'read'  => _isAllowed($self, $path, 'read'),
		'write' => _isAllowed($self, $path, 'write'),
		'dirs'  => []
	);
	
	if (_isAllowed($self, $path, 'read', 1))
	{
		opendir(DIR, $path);
		my @content = grep { !/^\.{1,2}$/ } sort readdir(DIR);  
		closedir(DIR);
		foreach my $subdir (grep { -d "$path/$_" && _isAccepted($self,"$path/$_") eq 'true' } @content)
		{
			my %dirs = _tree($self,"$path/$subdir");
			push @{$dir{'dirs'}}, { %dirs };
		}
	}
	return %dir;
}

sub _cwd
{
	my ($self, $path) = @_;
	my $rel = $self->{CONF}->{'rootAlias'} ne '' ? $self->{CONF}->{'rootAlias'} : _basename($self->{CONF}->{'root'});
	my $name;
	if ($path eq $self->{CONF}->{'root'})
	{
		$name = $rel;
	}
	else
	{
		$name = _basename($path);
		$rel .= $DIRECTORY_SEPARATOR.substr($path, length($self->{CONF}->{'root'}) + 1);
	}
	%{$self->{RES}->{'cwd'}} = (
		'hash'       => _hash($path),
		'name'       => $name,
		'mime'       => 'directory',
		'rel'        => $rel,
		'size'       => 0,
		'date'       => 'now', # TODO
		#'date'       => Libs::Others::LocalDate($self,$self->{CONF}->{'DateTimeFormat'},'',int(-M "$path")),
		'read'       => _isAllowed($self, $path, 'read'),
		'write'      => _isAllowed($self, $path, 'write'),
		'rm'         => _isAllowed($self, $path, 'rm')
	);
}


sub _cdc
{
	my ($self,$path) = @_;
	opendir(DIR,$path);
	my @content = grep {!/^\.{1,2}$/} sort readdir(DIR);
	closedir(DIR);

	$self->{RES}->{'cdc'} = [];
	foreach my $subdir (grep {_isAccepted($self,"$path/$_") eq 'true'} sort {-f "$path/$a" cmp -f "$path/$b"} @content)
	{
		push @{$self->{RES}->{'cdc'}}, {_info($self,"$path/$subdir")};
	}
}


sub _info
{
	my ($self, $path) = @_;
	my @stat = (-l $path) ? lstat($path) : stat($path);
	my %info = (
		'hash'  => _hash($path),
		'mime'  => -d $path ? 'directory' : $self->_mimetype($path),
		'name'  => _basename($path), # Сделать замену двойных кавычек
		'date'  => "$stat[9]", # TODO
		#'date'  =>  Libs::Others::LocalDate($self,$self->{CONF}->{'DateTimeFormat'},'',$info[9]),
		'size'  => -d $path ?  0 : $stat[7],
		'read'  => _isAllowed($self, $path, 'read'),
		'write' => _isAllowed($self, $path, 'write'),
		'rm'    => _isAllowed($self, $path, 'rm'),
	);
	
	if (-l $path)
	{
		$info{'link'} = '123';
	}
	if ($info{'mime'} ne 'directory')
	{
		if ($self->{CONF}->{'fileURL'} eq 'true' && $info{'read'})
		{
			$info{'url'} = _path2url($self, $path);
		}
		
		if ($info{'mime'} =~ /image/)
		{
			#if ('false' != (my @s = Libs::Image::GetImgInfo($self,$path)))
			#{
			#	$info{'dim'} = $s[0].'x'.$s[1];
			#}
			if ($info{'read'} eq 'true')
			{
				$info{'resize'} = (exists $info{'dim'});
				#$tmb = _tmbPath($self,$path);
				#if (-f $tmb) {$info{'tmb'} = _path2url($self,$tmb);}
				#elsif ($info{'resize'}) {$self->{RES}->{'tmb'} = 'true'}
			}
		}
	}
	return %info;
}

sub _path2url
{
	my ($self, $path) = @_;
	my $url = substr $path, length $self->{CONF}->{'root'};
	return $self->{CONF}->{'URL'}.$url;
}

sub _mimetype
{
	my ($self, $path) = @_;

	use File::MimeInfo;
	return mimetype($path);

	if (rindex($path,$DIRECTORY_SEPARATOR) != -1)
	{
		$path = substr($path, rindex($path, $DIRECTORY_SEPARATOR) + 1);
	}
	my ($name, $ext);
	if (rindex($path,'.') != -1)
	{
		$ext  = substr($path, rindex($path, '.') + 1);
		$name = substr($path, 0, rindex($path,'.'));
	}
	else
	{
		$name = $path;
	}
	my $mt = $self->{CTYPE}->{lc($ext)};
	$mt = ($mt ne '') ? $mt :'unknown;';
	return $mt;
}

sub _content
{
	my ($self, $path, $tree) = @_;
	_cwd($self, $path);
	_cdc($self, $path);
	if ($tree)
	{
		#$self->{RES}->{'tree'} = {};
		$self->{RES}->{'tree'} = { _tree($self, $self->{CONF}->{'root'}) };
	}
}



sub _open
{
	my ($self) = @_;
	my $path = $self->{CONF}->{'root'};
	my $p;

	# try to load dir
	if (exists $self->{REQUEST}->{'target'})
	{
		$p = _findDir($self, $self->{REQUEST}->{'target'});
		if ('false' eq $p)
		{
			if (! exists $self->{REQUEST}->{'init'})
			{
				$self->{RES}->{'error'} .= 'Invalid parameters'. $p;
			}
		}
		elsif (_isAllowed($self, $p, 'read') eq 'false')
		{
			if (! exists $self->{REQUEST}->{'init'}) {
				$self->{RES}->{'error'} .= 'Access denied';
			}
		}
		else
		{
			$path = $p;
		}
	}

	if (exists $self->{REQUEST}->{'current'})
	{
		$self->{RES}->{'error'} .= $self->{URL}->{current}."<br>"
	}

	_content($self, $path, (exists $self->{REQUEST}->{'tree'}));
}



sub _utime
{
	my ($self) = @_;
	return time().'0';
}


sub _findDir
{
	my ($self, $hash, $path) = @_;
	my $p = 'false';
	if ($path eq '')
	{
		$path = $self->{CONF}->{'root'};
		if (_hash($path) eq $hash)
		{
			return $path;
		}
	}
	opendir(DIR, $path);
	my @content = grep {!/^\.{1,2}$/} sort readdir(DIR);  
	closedir(DIR);

	foreach my $subdir (grep {-d "$path/$_" } @content)
	{
		$p = $path.'/'.$subdir;

		if (_hash($p) eq $hash || ($p = _findDir($self, $hash, $p)) ne 'false')
		{
			last;
		}
	}
	return $p;
}

sub _hash
{
	#my ($self, $path) = @_;
	return md5_hex(shift);
}

1;
