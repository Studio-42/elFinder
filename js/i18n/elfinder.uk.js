/**
 * Українська мова translation
 * @author ITLancer
 * @version 2018-11-21
 */
(function(root, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['elfinder'], factory);
	} else if (typeof exports !== 'undefined') {
		module.exports = factory(require('elfinder'));
	} else {
		factory(root.elFinder);
	}
}(this, function(elFinder) {
	elFinder.prototype.i18.uk = {
		translator : 'ITLancer',
		language   : 'Українська мова',
		direction  : 'ltr',
		dateFormat : 'd.m.Y H:i', // will show like: 21.11.2018 13:55
		fancyDateFormat : '$1 H:i', // will show like: сьогодні 13:55
		nonameDateFormat : 'ymd-His', // noname upload will show like: 181121-135540
		messages   : {

			/********************************** errors **********************************/
			'error'                : 'Помилка',
			'errUnknown'           : 'Невідома помилка.',
			'errUnknownCmd'        : 'Невідома команда.',
			'errJqui'              : 'Неправильне налаштування jQuery UI. Відсутні компоненти: selectable, draggable, droppable.',
			'errNode'              : 'Відсутній елемент DOM для створення elFinder.',
			'errURL'               : 'Неправильне налаштування! Не вказана опція URL.',
			'errAccess'            : 'Доступ заборонено.',
			'errConnect'           : 'Не вдалося з’єднатися з сервером.',
			'errAbort'             : 'З’єднання розірване.',
			'errTimeout'           : 'Тайм-аут з’єднання.',
			'errNotFound'          : 'Не знайдено серверної частини.',
			'errResponse'          : 'Неправильна відповідь від сервера.',
			'errConf'              : 'Неправильне налаштування серверної частини.',
			'errJSON'              : 'Модуль PHP JSON не встановлено.',
			'errNoVolumes'         : 'Немає доступних для читання директорій.',
			'errCmdParams'         : 'Неправильний параметр для команди "$1".',
			'errDataNotJSON'       : 'Дані не у форматі JSON.',
			'errDataEmpty'         : 'Дані відсутні.',
			'errCmdReq'            : 'Серверна частина вимагає назву команди.',
			'errOpen'              : 'Неможливо відкрити "$1".',
			'errNotFolder'         : 'Об’єкт не є папкою.',
			'errNotFile'           : 'Об’єкт не є файлом.',
			'errRead'              : 'Неможливо прочитати "$1".',
			'errWrite'             : 'Неможливо записати в "$1".',
			'errPerm'              : 'Помилка доступу.',
			'errLocked'            : 'Файл "$1" заблоковано - не можливо перемістити, перейменувати чи вилучити.',
			'errExists'            : 'Файл з назвою "$1" вже існує.',
			'errInvName'           : 'Недійсна назва файла.',
			'errInvDirname'        : 'Invalid folder name.',  // from v2.1.24 added 12.4.2017
			'errFolderNotFound'    : 'Теку не знайдено.',
			'errFileNotFound'      : 'Файл не знайдено.',
			'errTrgFolderNotFound' : 'Цільову теку "$1" не знайдено.',
			'errPopup'             : 'Браузер забороняє відкривати popup-вікно. Дозвольте у налаштування браузера, щоб відкрити файл.',
			'errMkdir'             : 'Неможливо створити теку "$1".',
			'errMkfile'            : 'Неможливо створити файл "$1".',
			'errRename'            : 'Неможливо перейменувати файл "$1".',
			'errCopyFrom'          : 'Копіювання файлів з тому "$1" не дозволено.',
			'errCopyTo'            : 'Копіювання файлів на том "$1" не дозволено.',
			'errMkOutLink'         : 'Unable to create a link to outside the volume root.', // from v2.1 added 03.10.2015
			'errUpload'            : 'Помилка відвантаження.',  // old name - errUploadCommon
			'errUploadFile'        : 'Неможливо відвантажити файл "$1".', // old name - errUpload
			'errUploadNoFiles'     : 'Не знайдено файлів для відвантаження.',
			'errUploadTotalSize'   : 'Data exceeds the maximum allowed size.', // old name - errMaxSize
			'errUploadFileSize'    : 'File exceeds maximum allowed size.', //  old name - errFileMaxSize
			'errUploadMime'        : 'Файли цього типу заборонені.',
			'errUploadTransfer'    : '"$1" : помилка передачі.',
			'errUploadTemp'        : 'Unable to make temporary file for upload.', // from v2.1 added 26.09.2015
			'errNotReplace'        : 'Object "$1" already exists at this location and can not be replaced by object with another type.', // new
			'errReplace'           : 'Неможливо замінити "$1".',
			'errSave'              : 'Неможливо записати "$1".',
			'errCopy'              : 'Неможливо скопіювати "$1".',
			'errMove'              : 'Неможливо перенести "$1".',
			'errCopyInItself'      : 'Неможливо скопіювати "$1" сам у себе.',
			'errRm'                : 'Неможливо вилучити "$1".',
			'errTrash'             : 'Неможливо перемістити в смітник.', // from v2.1.24 added 30.4.2017
			'errRmSrc'             : 'Unable remove source file(s).',
			'errExtract'           : 'Неможливо розпакувати файли з "$1".',
			'errArchive'           : 'Неможливо створити архів.',
			'errArcType'           : 'Тип архіву не підтримується.',
			'errNoArchive'         : 'Файл не є архівом, або є архівом, тип якого не підтримується.',
			'errCmdNoSupport'      : 'Серверна частина не підтримує цієї команди.',
			'errReplByChild'       : 'Папка “$1” не може бути замінена елементом, який вона містить.',
			'errArcSymlinks'       : 'З міркувань безпеки заборонено розпаковувати архіви з символічними посиланнями.', // edited 24.06.2012
			'errArcMaxSize'        : 'Розмір файлів архіву перевищує допустиме значення.',
			'errResize'            : 'Неможливо масштабувати "$1".',
			'errResizeDegree'      : 'Invalid rotate degree.',  // added 7.3.2013
			'errResizeRotate'      : 'Неможливо повернути зображення',  // added 7.3.2013
			'errResizeSize'        : 'Не вірний розмір зображення',  // added 7.3.2013
			'errResizeNoChange'    : 'Image size not changed.',  // added 7.3.2013
			'errUsupportType'      : 'Непідтримуваний тип файла.',
			'errNotUTF8Content'    : 'Файл "$1" не в UTF-8 і не може бути відредагований.',  // added 9.11.2011
			'errNetMount'          : 'Неможливо змонтувати "$1".', // added 17.04.2012
			'errNetMountNoDriver'  : 'Непідтримуваний протокл.',     // added 17.04.2012
			'errNetMountFailed'    : 'В процесі монтування сталася помилка.',         // added 17.04.2012
			'errNetMountHostReq'   : 'Host required.', // added 18.04.2012
			'errSessionExpires'    : 'Час сеансу минув через неактивність.',
			'errCreatingTempDir'   : 'НЕможливо створити тимчасову директорію: "$1"',
			'errFtpDownloadFile'   : 'Неможливо завантажити файл з FTP: "$1"',
			'errFtpUploadFile'     : 'Неможливо завантажити файл на FTP: "$1"',
			'errFtpMkdir'          : 'Неможливо створити віддалений каталог на FTP: "$1"',
			'errArchiveExec'       : 'Помилка при архівації файлів: "$1"',
			'errExtractExec'       : 'Помилка при розархівуванні файлів: "$1"',
			'errNetUnMount'        : 'Неможливо демонтувати', // from v2.1 added 30.04.2012
			'errConvUTF8'          : 'Неможливо конвертувати в UTF - 8', // from v2.1 added 08.04.2014
			'errFolderUpload'      : 'Використовуйте Google Chrome, якщо ви хочете завантажити папку', // from v2.1 added 26.6.2015
			'errSearchTimeout'     : 'Час пошуку "$1" вийшов. Результат пошуку частковий', // from v2.1 added 12.1.2016
			'errReauthRequire'     : 'Необхідна повторна авторизація.', // from v2.1.10 added 24.3.2016
			'errMaxTargets'        : 'Max number of selectable items is $1.', // from v2.1.17 added 17.10.2016
			'errRestore'           : 'Unable to restore from the trash. Can\'t identify the restore destination.', // from v2.1.24 added 3.5.2017
			'errEditorNotFound'    : 'Editor not found to this file type.', // from v2.1.25 added 23.5.2017
			'errServerError'       : 'Error occurred on the server side.', // from v2.1.25 added 16.6.2017
			'errEmpty'             : 'Unable to empty folder "$1".', // from v2.1.25 added 22.6.2017

			/******************************* commands names ********************************/
			'cmdarchive'   : 'Архівувати',
			'cmdback'      : 'Назад',
			'cmdcopy'      : 'Копівати',
			'cmdcut'       : 'Вирізати',
			'cmddownload'  : 'Завантажити',
			'cmdduplicate' : 'Дублювати',
			'cmdedit'      : 'Редагувати файл',
			'cmdextract'   : 'Розпакувати файли з архіву',
			'cmdforward'   : 'Вперед',
			'cmdgetfile'   : 'Вибрати файли',
			'cmdhelp'      : 'Про програму',
			'cmdhome'      : 'Додому',
			'cmdinfo'      : 'Інформація',
			'cmdmkdir'     : 'Створити теку',
			'cmdmkdirin'   : 'Into New Folder', // from v2.1.7 added 19.2.2016
			'cmdmkfile'    : 'Створити файл',
			'cmdopen'      : 'Відкрити',
			'cmdpaste'     : 'Вставити',
			'cmdquicklook' : 'Попередній перегляд',
			'cmdreload'    : 'Перечитати',
			'cmdrename'    : 'Перейменувати',
			'cmdrm'        : 'Вилучити',
			'cmdtrash'     : 'В смітник', //from v2.1.24 added 29.4.2017
			'cmdrestore'   : 'Restore', //from v2.1.24 added 3.5.2017
			'cmdsearch'    : 'Шукати файли',
			'cmdup'        : 'На 1 рівень вгору',
			'cmdupload'    : 'Відвантажити файли',
			'cmdview'      : 'Перегляд',
			'cmdresize'    : 'Масштабувати зображення',
			'cmdsort'      : 'Сортування',
			'cmdnetmount'  : 'Змонтувати мережевий диск', // added 18.04.2012
			'cmdnetunmount': 'Розмонтувати', // from v2.1 added 30.04.2012
			'cmdplaces'    : 'To Places', // added 28.12.2014
			'cmdchmod'     : 'Змінити права', // from v2.1 added 20.6.2015
			'cmdopendir'   : 'Відкрии директорію', // from v2.1 added 13.1.2016
			'cmdcolwidth'  : 'Reset column width', // from v2.1.13 added 12.06.2016
			'cmdfullscreen': 'Full Screen', // from v2.1.15 added 03.08.2016
			'cmdmove'      : 'Move', // from v2.1.15 added 21.08.2016
			'cmdempty'     : 'Empty the folder', // from v2.1.25 added 22.06.2017
			'cmdundo'      : 'Назад', // from v2.1.27 added 31.07.2017
			'cmdredo'      : 'Вперед', // from v2.1.27 added 31.07.2017
			'cmdpreference': 'Preferences', // from v2.1.27 added 03.08.2017
			'cmdselectall' : 'Вибрати все', // from v2.1.28 added 15.08.2017
			'cmdselectnone': 'Select none', // from v2.1.28 added 15.08.2017
			'cmdselectinvert': 'Invert selection', // from v2.1.28 added 15.08.2017
			'cmdopennew'   : 'Відкрити в новому вікні', // from v2.1.38 added 3.4.2018
			'cmdhide'      : 'Сховати (Preference)', // from v2.1.41 added 24.7.2018

			/*********************************** buttons ***********************************/
			'btnClose'  : 'Закрити',
			'btnSave'   : 'Зберегти',
			'btnRm'     : 'Вилучити',
			'btnApply'  : 'Застосувати',
			'btnCancel' : 'Скасувати',
			'btnNo'     : 'Ні',
			'btnYes'    : 'Так',
			'btnMount'  : 'Підключити',  // added 18.04.2012
			'btnApprove': 'Перейти в $1 і прийняти', // from v2.1 added 26.04.2012
			'btnUnmount': 'Відключити', // from v2.1 added 30.04.2012
			'btnConv'   : 'Конвертувати', // from v2.1 added 08.04.2014
			'btnCwd'    : 'Тут',      // from v2.1 added 22.5.2015
			'btnVolume' : 'Розділ',    // from v2.1 added 22.5.2015
			'btnAll'    : 'Всі',       // from v2.1 added 22.5.2015
			'btnMime'   : 'MIME тип', // from v2.1 added 22.5.2015
			'btnFileName':'Назва файла',  // from v2.1 added 22.5.2015
			'btnSaveClose': 'Зберегти і вийти', // from v2.1 added 12.6.2015
			'btnBackup' : 'Резервна копія', // fromv2.1 added 28.11.2015
			'btnRename'    : 'Rename',      // from v2.1.24 added 6.4.2017
			'btnRenameAll' : 'Rename(All)', // from v2.1.24 added 6.4.2017
			'btnPrevious' : 'Prev ($1/$2)', // from v2.1.24 added 11.5.2017
			'btnNext'     : 'Next ($1/$2)', // from v2.1.24 added 11.5.2017
			'btnSaveAs'   : 'Зберегти як', // from v2.1.25 added 24.5.2017

			/******************************** notifications ********************************/
			'ntfopen'     : 'Відкрити теку',
			'ntffile'     : 'Відкрити файл',
			'ntfreload'   : 'Перечитати вміст теки',
			'ntfmkdir'    : 'Створення теки',
			'ntfmkfile'   : 'Створення файлів',
			'ntfrm'       : 'Вилучити файли',
			'ntfcopy'     : 'Копіювати файли',
			'ntfmove'     : 'Перенести файли',
			'ntfprepare'  : 'Підготовка до копіювання файлів',
			'ntfrename'   : 'Перейменувати файли',
			'ntfupload'   : 'Відвантажити файли',
			'ntfdownload' : 'Завантажити файли',
			'ntfsave'     : 'Записати файли',
			'ntfarchive'  : 'Створення архіву',
			'ntfextract'  : 'Розпаковування архіву',
			'ntfsearch'   : 'Пошук файлів',
			'ntfresize'   : 'Змінити розмір зображення',
			'ntfsmth'     : 'Виконується',
			'ntfloadimg'  : 'Завантаження зображення',
			'ntfnetmount' : 'Монтування мережевого диска', // added 18.04.2012
			'ntfnetunmount': 'Розмонтування мережевого диска', // from v2.1 added 30.04.2012
			'ntfdim'      : 'Acquiring image dimension', // added 20.05.2013
			'ntfreaddir'  : 'Читання інформації директорії', // from v2.1 added 01.07.2013
			'ntfurl'      : 'отримання URL посилання', // from v2.1 added 11.03.2014
			'ntfchmod'    : 'Зміна прав файлу', // from v2.1 added 20.6.2015
			'ntfpreupload': 'Перевірка імені завантажуваного файла', // from v2.1 added 31.11.2015
			'ntfzipdl'    : 'Створення файлу для завантаження', // from v2.1.7 added 23.1.2016
			'ntfparents'  : 'Getting path infomation', // from v2.1.17 added 2.11.2016
			'ntfchunkmerge': 'Processing the uploaded file', // from v2.1.17 added 2.11.2016
			'ntftrash'    : 'Doing throw in the trash', // from v2.1.24 added 2.5.2017
			'ntfrestore'  : 'Doing restore from the trash', // from v2.1.24 added 3.5.2017
			'ntfchkdir'   : 'Checking destination folder', // from v2.1.24 added 3.5.2017
			'ntfundo'     : 'Undoing previous operation', // from v2.1.27 added 31.07.2017
			'ntfredo'     : 'Redoing previous undone', // from v2.1.27 added 31.07.2017
			'ntfchkcontent' : 'Checking contents', // from v2.1.41 added 3.8.2018

			/*********************************** volumes *********************************/
			'volume_Trash' : 'Trash', //from v2.1.24 added 29.4.2017

			/************************************ dates **********************************/
			'dateUnknown' : 'невідомо',
			'Today'       : 'сьогодні',
			'Yesterday'   : 'вчора',
			'Jan'         : 'Січ',
			'Feb'         : 'Лют',
			'Mar'         : 'Бер',
			'Apr'         : 'Кві',
			'May'         : 'Тра',
			'Jun'         : 'Чер',
			'Jul'         : 'Лип',
			'Aug'         : 'Сер',
			'Sep'         : 'Вер',
			'Oct'         : 'Жов',
			'Nov'         : 'Лис',
			'Dec'         : 'Гру',
			'January'     : 'січня',
			'February'    : 'лютого',
			'March'       : 'березня',
			'April'       : 'квітня',
			'May'         : 'травня',
			'June'        : 'червня',
			'July'        : 'липня',
			'August'      : 'серпня',
			'September'   : 'вересня',
			'October'     : 'жовтня',
			'November'    : 'листопада',
			'December'    : 'грудня',
			'Sunday'      : 'Неділя',
			'Monday'      : 'Понеділок',
			'Tuesday'     : 'Вівторок',
			'Wednesday'   : 'Середа',
			'Thursday'    : 'Четвер',
			'Friday'      : 'П’ятниця',
			'Saturday'    : 'Субота',
			'Sun'         : 'Нд',
			'Mon'         : 'Пн',
			'Tue'         : 'Вт',
			'Wed'         : 'Ср',
			'Thu'         : 'Чт',
			'Fri'         : 'Пт',
			'Sat'         : 'Сб',

			/******************************** sort variants ********************************/
			'sortname'          : 'за назвою',
			'sortkind'          : 'за типом',
			'sortsize'          : 'за розміром',
			'sortdate'          : 'за датою',
			'sortFoldersFirst'  : 'Folders first',
			'sortperm'          : 'by permission', // from v2.1.13 added 13.06.2016
			'sortmode'          : 'by mode',       // from v2.1.13 added 13.06.2016
			'sortowner'         : 'by owner',      // from v2.1.13 added 13.06.2016
			'sortgroup'         : 'by group',      // from v2.1.13 added 13.06.2016
			'sortAlsoTreeview'  : 'Also Treeview',  // from v2.1.15 added 01.08.2016

			/********************************** new items **********************************/
			'untitled file.txt' : 'неназваний файл.txt', // added 10.11.2015
			'untitled folder'   : 'неназвана папка',   // added 10.11.2015
			'Archive'           : 'NewArchive',  // from v2.1 added 10.11.2015
			'untitled file'     : 'NewFile.$1',  // from v2.1.41 added 6.8.2018
			'extentionfile'     : '$1: File',    // from v2.1.41 added 6.8.2018
			'extentiontype'     : '$1: $2',      // from v2.1.43 added 17.10.2018

			/********************************** messages **********************************/
			'confirmReq'      : 'Підтвердіть',
			'confirmRm'       : 'Ви справді хочете вилучити файли?<br/>Операція незворотня!',
			'confirmRepl'     : 'Замінити старий файл новим?',
			'confirmRest'     : 'Replace existing item with the item in trash?', // fromv2.1.24 added 5.5.2017
			'confirmConvUTF8' : 'Not in UTF-8<br/>Convert to UTF-8?<br/>Contents become UTF-8 by saving after conversion.', // from v2.1 added 08.04.2014
			'confirmNonUTF8'  : 'Character encoding of this file couldn\'t be detected. It need to temporarily convert to UTF-8 for editting.<br/>Please select character encoding of this file.', // from v2.1.19 added 28.11.2016
			'confirmNotSave'  : 'It has been modified.<br/>Losing work if you do not save changes.', // from v2.1 added 15.7.2015
			'confirmTrash'    : 'Are you sure you want to move items to trash bin?', //from v2.1.24 added 29.4.2017
			'apllyAll'        : 'Застосувати до всіх',
			'name'            : 'Назва',
			'size'            : 'Розмір',
			'perms'           : 'Доступи',
			'modify'          : 'Змінено',
			'kind'            : 'Тип',
			'read'            : 'читання',
			'write'           : 'запис',
			'noaccess'        : 'недоступно',
			'and'             : 'і',
			'unknown'         : 'невідомо',
			'selectall'       : 'Вибрати всі файли',
			'selectfiles'     : 'Вибрати файл(и)',
			'selectffile'     : 'Вибрати перший файл',
			'selectlfile'     : 'Вибрати останній файл',
			'viewlist'        : 'Списком',
			'viewicons'       : 'Значками',
			'viewSmall'       : 'Маленькі іконки', // from v2.1.39 added 22.5.2018
			'viewMedium'      : 'Середні іконки', // from v2.1.39 added 22.5.2018
			'viewLarge'       : 'Великі іконки', // from v2.1.39 added 22.5.2018
			'viewExtraLarge'  : 'Дуже великі іконки', // from v2.1.39 added 22.5.2018
			'places'          : 'Розташування',
			'calc'            : 'Вирахувати',
			'path'            : 'Шлях',
			'aliasfor'        : 'Аліас для',
			'locked'          : 'Заблоковано',
			'dim'             : 'Розміри',
			'files'           : 'Файли',
			'folders'         : 'теки',
			'items'           : 'Елементи',
			'yes'             : 'так',
			'no'              : 'ні',
			'link'            : 'Посилання',
			'searcresult'     : 'Результати пошуку',
			'selected'        : 'Вибрані елементи',
			'about'           : 'Про',
			'shortcuts'       : 'Ярлики',
			'help'            : 'Допомога',
			'webfm'           : 'Web-менеджер файлів',
			'ver'             : 'Версія',
			'protocolver'     : 'Версія протоколу',
			'homepage'        : 'Сторінка проекту',
			'docs'            : 'Документація',
			'github'          : 'Fork us on Github',
			'twitter'         : 'Слідкуйте у Твітері',
			'facebook'        : 'Приєднуйтесь у фейсбуці',
			'team'            : 'Автори',
			'chiefdev'        : 'головний розробник',
			'developer'       : 'розробник',
			'contributor'     : 'учасник',
			'maintainer'      : 'супроводжувач',
			'translator'      : 'перекладач',
			'icons'           : 'Значки',
			'dontforget'      : 'і не забудьте рушничок',
			'shortcutsof'     : 'Ярлики заборонені',
			'dropFiles'       : 'Кидайте файли сюди',
			'or'              : 'або',
			'selectForUpload' : 'Виберіть файли для відвантаження',
			'moveFiles'       : 'Перемістити файли',
			'copyFiles'       : 'Копіювати файли',
			'restoreFiles'    : 'Restore items', // from v2.1.24 added 5.5.2017
			'rmFromPlaces'    : 'Вилучити з розташувань',
			'aspectRatio'     : 'Співвідношення',
			'scale'           : 'Масштаб',
			'width'           : 'Ширина',
			'height'          : 'Висота',
			'resize'          : 'Змінити розмір',
			'crop'            : 'Обрізати',
			'rotate'          : 'Повернути',
			'rotate-cw'       : 'Повернути на 90 градусів за год. стр.',
			'rotate-ccw'      : 'Повернути на 90 градусів проти год. стр.',
			'degree'          : 'Градус',
			'netMountDialogTitle' : 'Mount network volume', // added 18.04.2012
			'protocol'            : 'версія протоколу', // added 18.04.2012
			'host'                : 'Host', // added 18.04.2012
			'port'                : 'Port', // added 18.04.2012
			'user'                : 'User', // added 18.04.2012
			'pass'                : 'Password', // added 18.04.2012
			'confirmUnmount'      : 'Are you unmount $1?',  // from v2.1 added 30.04.2012
			'dropFilesBrowser': 'Drop or Paste files from browser', // from v2.1 added 30.05.2012
			'dropPasteFiles'  : 'Drop files, Paste URLs or images(clipboard) here', // from v2.1 added 07.04.2014
			'encoding'        : 'Encoding', // from v2.1 added 19.12.2014
			'locale'          : 'Locale',   // from v2.1 added 19.12.2014
			'searchTarget'    : 'Target: $1',                // from v2.1 added 22.5.2015
			'searchMime'      : 'Search by input MIME Type', // from v2.1 added 22.5.2015
			'owner'           : 'Owner', // from v2.1 added 20.6.2015
			'group'           : 'Group', // from v2.1 added 20.6.2015
			'other'           : 'Other', // from v2.1 added 20.6.2015
			'execute'         : 'Execute', // from v2.1 added 20.6.2015
			'perm'            : 'Permission', // from v2.1 added 20.6.2015
			'mode'            : 'Режим', // from v2.1 added 20.6.2015
			'emptyFolder'     : 'Folder is empty', // from v2.1.6 added 30.12.2015
			'emptyFolderDrop' : 'Folder is empty\\A Drop to add items', // from v2.1.6 added 30.12.2015
			'emptyFolderLTap' : 'Folder is empty\\A Long tap to add items', // from v2.1.6 added 30.12.2015
			'quality'         : 'Quality', // from v2.1.6 added 5.1.2016
			'autoSync'        : 'Auto sync',  // from v2.1.6 added 10.1.2016
			'moveUp'          : 'Move up',  // from v2.1.6 added 18.1.2016
			'getLink'         : 'Get URL link', // from v2.1.7 added 9.2.2016
			'selectedItems'   : 'Selected items ($1)', // from v2.1.7 added 2.19.2016
			'folderId'        : 'Folder ID', // from v2.1.10 added 3.25.2016
			'offlineAccess'   : 'Allow offline access', // from v2.1.10 added 3.25.2016
			'reAuth'          : 'To re-authenticate', // from v2.1.10 added 3.25.2016
			'nowLoading'      : 'Now loading...', // from v2.1.12 added 4.26.2016
			'openMulti'       : 'Open multiple files', // from v2.1.12 added 5.14.2016
			'openMultiConfirm': 'You are trying to open the $1 files. Are you sure you want to open in browser?', // from v2.1.12 added 5.14.2016
			'emptySearch'     : 'Search results is empty in search target.', // from v2.1.12 added 5.16.2016
			'editingFile'     : 'It is editing a file.', // from v2.1.13 added 6.3.2016
			'hasSelected'     : 'You have selected $1 items.', // from v2.1.13 added 6.3.2016
			'hasClipboard'    : 'You have $1 items in the clipboard.', // from v2.1.13 added 6.3.2016
			'incSearchOnly'   : 'Incremental search is only from the current view.', // from v2.1.13 added 6.30.2016
			'reinstate'       : 'Reinstate', // from v2.1.15 added 3.8.2016
			'complete'        : '$1 complete', // from v2.1.15 added 21.8.2016
			'contextmenu'     : 'Context menu', // from v2.1.15 added 9.9.2016
			'pageTurning'     : 'Page turning', // from v2.1.15 added 10.9.2016
			'volumeRoots'     : 'Volume roots', // from v2.1.16 added 16.9.2016
			'reset'           : 'Reset', // from v2.1.16 added 1.10.2016
			'bgcolor'         : 'Background color', // from v2.1.16 added 1.10.2016
			'colorPicker'     : 'Color picker', // from v2.1.16 added 1.10.2016
			'8pxgrid'         : '8px Grid', // from v2.1.16 added 4.10.2016
			'enabled'         : 'Enabled', // from v2.1.16 added 4.10.2016
			'disabled'        : 'Disabled', // from v2.1.16 added 4.10.2016
			'emptyIncSearch'  : 'Search results is empty in current view.\\APress [Enter] to expand search target.', // from v2.1.16 added 5.10.2016
			'emptyLetSearch'  : 'First letter search results is empty in current view.', // from v2.1.23 added 24.3.2017
			'textLabel'       : 'Text label', // from v2.1.17 added 13.10.2016
			'minsLeft'        : '$1 mins left', // from v2.1.17 added 13.11.2016
			'openAsEncoding'  : 'Reopen with selected encoding', // from v2.1.19 added 2.12.2016
			'saveAsEncoding'  : 'Save with the selected encoding', // from v2.1.19 added 2.12.2016
			'selectFolder'    : 'Select folder', // from v2.1.20 added 13.12.2016
			'firstLetterSearch': 'First letter search', // from v2.1.23 added 24.3.2017
			'presets'         : 'Presets', // from v2.1.25 added 26.5.2017
			'tooManyToTrash'  : 'It\'s too many items so it can\'t into trash.', // from v2.1.25 added 9.6.2017
			'TextArea'        : 'TextArea', // from v2.1.25 added 14.6.2017
			'folderToEmpty'   : 'Empty the folder "$1".', // from v2.1.25 added 22.6.2017
			'filderIsEmpty'   : 'There are no items in a folder "$1".', // from v2.1.25 added 22.6.2017
			'preference'      : 'Preference', // from v2.1.26 added 28.6.2017
			'language'        : 'Language', // from v2.1.26 added 28.6.2017
			'clearBrowserData': 'Initialize the settings saved in this browser', // from v2.1.26 added 28.6.2017
			'toolbarPref'     : 'Toolbar settings', // from v2.1.27 added 2.8.2017
			'charsLeft'       : '... $1 chars left.',  // from v2.1.29 added 30.8.2017
			'sum'             : 'Sum', // from v2.1.29 added 28.9.2017
			'roughFileSize'   : 'Rough file size', // from v2.1.30 added 2.11.2017
			'autoFocusDialog' : 'Focus on the element of dialog with mouseover',  // from v2.1.30 added 2.11.2017
			'select'          : 'Select', // from v2.1.30 added 23.11.2017
			'selectAction'    : 'Action when select file', // from v2.1.30 added 23.11.2017
			'useStoredEditor' : 'Open with the editor used last time', // from v2.1.30 added 23.11.2017
			'selectinvert'    : 'Invert selection', // from v2.1.30 added 25.11.2017
			'renameMultiple'  : 'Are you sure you want to rename $1 selected items like $2?<br/>This cannot be undone!', // from v2.1.31 added 4.12.2017
			'batchRename'     : 'Batch rename', // from v2.1.31 added 8.12.2017
			'plusNumber'      : '+ Number', // from v2.1.31 added 8.12.2017
			'asPrefix'        : 'Add prefix', // from v2.1.31 added 8.12.2017
			'asSuffix'        : 'Add suffix', // from v2.1.31 added 8.12.2017
			'changeExtention' : 'Change extention', // from v2.1.31 added 8.12.2017
			'columnPref'      : 'Columns settings (List view)', // from v2.1.32 added 6.2.2018
			'reflectOnImmediate' : 'All changes will reflect immediately to the archive.', // from v2.1.33 added 2.3.2018
			'reflectOnUnmount'   : 'Any changes will not reflect until un-mount this volume.', // from v2.1.33 added 2.3.2018
			'unmountChildren' : 'The following volume(s) mounted on this volume also unmounted. Are you sure to unmount it?', // from v2.1.33 added 5.3.2018
			'selectionInfo'   : 'Selection Info', // from v2.1.33 added 7.3.2018
			'hashChecker'     : 'Algorithms to show the file hash', // from v2.1.33 added 10.3.2018
			'infoItems'       : 'Info Items (Selection Info Panel)', // from v2.1.38 added 28.3.2018
			'pressAgainToExit': 'Press again to exit.', // from v2.1.38 added 1.4.2018
			'toolbar'         : 'Toolbar', // from v2.1.38 added 4.4.2018
			'workspace'       : 'Work Space', // from v2.1.38 added 4.4.2018
			'dialog'          : 'Dialog', // from v2.1.38 added 4.4.2018
			'all'             : 'Всі', // from v2.1.38 added 4.4.2018
			'iconSize'        : 'Icon Size (Icons view)', // from v2.1.39 added 7.5.2018
			'editorMaximized' : 'Open the maximized editor window', // from v2.1.40 added 30.6.2018
			'editorConvNoApi' : 'Because conversion by API is not currently available, please convert on the website.', //from v2.1.40 added 8.7.2018
			'editorConvNeedUpload' : 'After conversion, you must be upload with the item URL or a downloaded file to save the converted file.', //from v2.1.40 added 8.7.2018
			'convertOn'       : 'Convert on the site of $1', // from v2.1.40 added 10.7.2018
			'integrations'    : 'Integrations', // from v2.1.40 added 11.7.2018
			'integrationWith' : 'This elFinder has the following external services integrated. Please check the terms of use, privacy policy, etc. before using it.', // from v2.1.40 added 11.7.2018
			'showHidden'      : 'Show hidden items', // from v2.1.41 added 24.7.2018
			'hideHidden'      : 'Hide hidden items', // from v2.1.41 added 24.7.2018
			'toggleHidden'    : 'Show/Hide hidden items', // from v2.1.41 added 24.7.2018
			'makefileTypes'   : 'File types to enable with "New file"', // from v2.1.41 added 7.8.2018
			'typeOfTextfile'  : 'Type of the Text file', // from v2.1.41 added 7.8.2018
			'add'             : 'Add', // from v2.1.41 added 7.8.2018
			'theme'           : 'Theme', // from v2.1.43 added 19.10.2018
			'default'         : 'Default', // from v2.1.43 added 19.10.2018
			'description'     : 'Description', // from v2.1.43 added 19.10.2018
			'website'         : 'Website', // from v2.1.43 added 19.10.2018
			'author'          : 'Author', // from v2.1.43 added 19.10.2018
			'email'           : 'Email', // from v2.1.43 added 19.10.2018
			'license'         : 'License', // from v2.1.43 added 19.10.2018

			/********************************** mimetypes **********************************/
			'kindUnknown'     : 'Невідомо',
			'kindRoot'        : 'Volume Root', // from v2.1.16 added 16.10.2016
			'kindFolder'      : 'Папка',
			'kindSelects'     : 'Selections', // from v2.1.29 added 29.8.2017
			'kindAlias'       : 'Аліас',
			'kindAliasBroken' : 'Битий аліас',
			// applications
			'kindApp'         : 'Програма',
			'kindPostscript'  : 'Документ Postscript',
			'kindMsOffice'    : 'Документ Microsoft Office',
			'kindMsWord'      : 'Документ Microsoft Word',
			'kindMsExcel'     : 'Документ Microsoft Excel',
			'kindMsPP'        : 'Презентація Microsoft Powerpoint',
			'kindOO'          : 'Документ Open Office',
			'kindAppFlash'    : 'Flash-додаток',
			'kindPDF'         : 'Документ переносного формату (PDF)',
			'kindTorrent'     : 'Файл Bittorrent',
			'kind7z'          : 'Архів 7z archive',
			'kindTAR'         : 'Архів TAR archive',
			'kindGZIP'        : 'Архів GZIP archive',
			'kindBZIP'        : 'Архів BZIP archive',
			'kindXZ'          : 'XZ archive',
			'kindZIP'         : 'Архів ZIP archive',
			'kindRAR'         : 'Архів RAR archive',
			'kindJAR'         : 'Файл Java JAR',
			'kindTTF'         : 'Шрифт True Type',
			'kindOTF'         : 'Шрифт Open Type',
			'kindRPM'         : 'Пакунок RPM',
			// texts
			'kindText'        : 'Текстовий документ',
			'kindTextPlain'   : 'Простий текст',
			'kindPHP'         : 'Код PHP',
			'kindCSS'         : 'Каскадна таблиця стилів (CSS)',
			'kindHTML'        : 'Документ HTML',
			'kindJS'          : 'Код Javascript',
			'kindRTF'         : 'Rich Text Format',
			'kindC'           : 'Код C',
			'kindCHeader'     : 'Заголовковий код C',
			'kindCPP'         : 'Код C++',
			'kindCPPHeader'   : 'Заголовковий код C++',
			'kindShell'       : 'Скрипт Unix shell',
			'kindPython'      : 'Код Python',
			'kindJava'        : 'Код Java',
			'kindRuby'        : 'Код Ruby',
			'kindPerl'        : 'Код Perl',
			'kindSQL'         : 'Код SQL',
			'kindXML'         : 'Документ XML',
			'kindAWK'         : 'Код AWK',
			'kindCSV'         : 'Значення розділені комою (CSV)',
			'kindDOCBOOK'     : 'Документ Docbook XML',
			'kindMarkdown'    : 'Markdown text', // added 20.7.2015
			// images
			'kindImage'       : 'Зображення',
			'kindBMP'         : 'Зображення BMP',
			'kindJPEG'        : 'Зображення JPEG',
			'kindGIF'         : 'Зображення GIF',
			'kindPNG'         : 'Зображення PNG',
			'kindTIFF'        : 'Зображення TIFF',
			'kindTGA'         : 'Зображення TGA',
			'kindPSD'         : 'Зображення Adobe Photoshop',
			'kindXBITMAP'     : 'Зображення X bitmap',
			'kindPXM'         : 'Зображення Pixelmator',
			// media
			'kindAudio'       : 'Аудіо',
			'kindAudioMPEG'   : 'Аудіо MPEG',
			'kindAudioMPEG4'  : 'Аудіо MPEG-4',
			'kindAudioMIDI'   : 'Аудіо MIDI',
			'kindAudioOGG'    : 'Аудіо Ogg Vorbis',
			'kindAudioWAV'    : 'Аудіо WAV',
			'AudioPlaylist'   : 'Список відтворення MP3',
			'kindVideo'       : 'Відео',
			'kindVideoDV'     : 'Відео DV movie',
			'kindVideoMPEG'   : 'Відео MPEG movie',
			'kindVideoMPEG4'  : 'Відео MPEG-4 movie',
			'kindVideoAVI'    : 'Відео AVI movie',
			'kindVideoMOV'    : 'Відео Quick Time',
			'kindVideoWM'     : 'Відео Windows Media',
			'kindVideoFlash'  : 'Відео Flash',
			'kindVideoMKV'    : 'Відео Matroska',
			'kindVideoOGG'    : 'Відео Ogg'
		}
	};
}));
