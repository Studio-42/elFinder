
if (elFinder && elFinder.prototype && typeof(elFinder.prototype.i18) == 'object') {
	elFinder.prototype.i18.ru = {
		translator : 'Vasily Razumnih',
		language   : 'Русский',
		direction  : 'ltr',
		messages   : {
			
			/********************************** dialogs **********************************/
			'Close'                                  : 'Закрыть',
			
			/********************************** errors **********************************/
			
			'Error'                                  : 'Ошибка',
			'Unknown error.'                         : 'Неизвестная ошибка.',
			'Invalid jQuery UI configuration. Check selectable, draggable and draggable components included.' : 'Отсутствуют необходимые компоненты jQuery UI - selectable, draggable и draggable.',
			'elFinder required DOM Element to be created.' : '',
			'Invalid elFinder configuration! You have to set URL option.' : 'Некорректная настройка. Необходимо указать URL сервера.',
			'Access denied.'                         : 'Доступ запрещен.',
			'Unable to connect to backend.'          : 'Не удалось соединиться с сервером.',
			'Connection aborted.'                    : 'Соединение прервано.',
			'Connection timeout.'                    : 'Таймаут соедения.',
			'Invalid backend response.'              : 'Некорректный ответ сервера.',
			'Data is not JSON.'                      : 'Данные не в формате JSON.',
			'Data is empty.'                         : 'Данные отстутсвуют.',
			'Backend request required command name.' : 'Для запроса к серверу необходимо указать имя комманды.',
			'Unable to open "$1".'                   : 'Не удалось открыть "$1".',
			'Object is not a folder.'                : 'Объект не является папкой.',
			'Object is not a file.'                  : 'Объект не является файлом.',
			'Unable to read "$1".'                   : 'Ошибка чтения "$1".',
			'Unable to write into "$1".'             : 'Ошибка записи в "$1".',
			'Permission denied.'                     : 'Доступ запрещен.',
			'"$1" is locked and can not be renamed, moved or removed.' : '"$1" защищен и не может быть переименован, перемещен или удален.',
			'File named "$1" already exists in this location.' : 'В папке уже существует файл с именем "$1".',
			'Invalid file name.'                     : 'Недопустимое имя файла.',
			'File not found.'                        : 'Файл не найден',
			'Browser prevented opening popup window. To open file enable it in browser options.' : 'Браузер заблокировал открытие нового окна. Чтобы окрыть файл, измените настройки браузера.',
			'Unable to copy "$1".'                   : 'Ошибка копирования "$1".',
			'Unable to move "$1".'                   : 'Ошибка перемещения "$1".',
			'Unable to copy "$1" into itself.'       : 'Невозможно скопировать "$1" в самого себя.',
			'Unable to remove "$1".'                 : 'Ошибка удаления "$1".',
			'Unable to extract files from "$1".'     : 'Ошибка извлечения файлов из архива "$1".',
			'Unable to create archive.'              : 'Ошибка создания архива.',
			'File is not archive or has unsupported archive type.' : 'Файл не является архивом допустимого типа.',  
			
			/********************************** mimetypes**********************************/
			'Unknown'                                : 'Неизвестный',
			'Folder'                                 : 'Папка',
			'Alias'                                  : 'Ссылка',
			'Broken alias'                           : 'Битая ссылка',
			// applications
			'Application'                            : 'Приложение',
			'Postscript document'                    : 'Документ postscript',
			'Microsoft Office document'              : 'Документ Microsoft Office',
			'Microsoft Word document'                : 'Документ Microsoft Word',  
			'Microsoft Excel document'               : 'Документ Microsoft Excel',
			'Microsoft Powerpoint presentation'      : 'Презентация Microsoft Powerpoint',
			'Open Office document'                   : 'Документ Open Office',
			'Flash application'                      : 'Приложение Flash',
			'Bittorrent file'                        : 'Bittorrent файл',
			'7z archive'                             : 'Архив 7z',
			'TAR archive'                            : 'Архив TAR',
			'GZIP archive'                           : 'Архив GZIP',
			'BZIP archive'                           : 'Архив BZIP',
			'ZIP archive'                            : 'Архив ZIP',
			'RAR archive'                            : 'Архив RAR',
			'Java JAR file'                          : 'Java JAR файл',
			// texts
			'Plain text'                             : 'Обычный текст',
			'PHP source'                             : 'Исходник PHP',
			'HTML document'                          : 'Документ HTML',
			'Javascript source'                      : 'Исходник Javascript',
			'Cascading style sheet'                  : 'Таблица стилей CSS',
			'Rich Text Format'                       : 'Форматированный текст',
			'C source'                               : 'Исходник C',
			'C header source'                        : 'Заголовочный файл C',
			'C++ source'                             : 'Исходник C++',
			'C++ header source'                      : 'Заголовочный файл C++',
			'Unix shell script'                      : 'Скрипт Unix shell',
			'Python source'                          : 'Исходник Python',
			'Java source'                            : 'Исходник Java',
			'Ruby source'                            : 'Исходник Ruby',
			'Perl script'                            : 'Исходник Perl',
			'SQL source'                             : 'Исходник SQL',
			'XML document'                           : 'Документ XML',
			'Comma separated values'                 : 'Текст с разделителями',
			// images
			'BMP image'                              : 'Изображение BMP',
			'JPEG image'                             : 'Изображение JPEG',
			'GIF Image'                              : 'Изображение GIF',
			'PNG Image'                              : 'Изображение PNG',
			'TIFF image'                             : 'Изображение TIFF',
			'TGA image'                              : 'Изображение TGA',
			'Adobe Photoshop image'                  : 'Изображение Adobe Photoshop',
			'X bitmap image'                         : 'Изображение X bitmap',
			// media
			'Audio media'                            : 'Аудио файл',
			'MPEG audio'                             : 'Аудио MPEG',
			'MPEG-4 audio'                           : 'Аудио MPEG',
			'MIDI audio'                             : 'Аудио MIDI',
			'Ogg Vorbis audio'                       : 'Аудио Ogg Vorbis',
			'WAV audio'                              : 'Аудио WAV',
			'Video media'                            : 'Видео файл',
			'DV movie'                               : 'Видео DV',
			'MPEG movie'                             : 'Видео MPEG',
			'MPEG-4 movie'                           : 'Видео MPEG-4',
			'AVI movie'                              : 'Видео AVI',
			'Quick Time movie'                       : 'Видео Quicktime',
			'WM movie'                               : 'Видео Windows Media',
			'Flash movie'                            : 'Видео Flash',
			'Matroska movie'                         : 'Видео Matroska',
			'Ogg movie'                              : 'Видео Ogg'
		}
	}
}


 

