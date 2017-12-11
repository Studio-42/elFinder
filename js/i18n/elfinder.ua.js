/**
 * Українська мова translation
 * @author a2exfr@gmail.com
 * @version 2017-12-11
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
	elFinder.prototype.i18.ua = {
		translator : 'a2exfr@gmail.com',
		language   : 'Українська мова',
		direction  : 'ltr',
		dateFormat : 'd M Y H:i', // Mar 13, 2012 05:27 PM
		fancyDateFormat : '$1 H:i', // will produce smth like: Today 12:25 PM
		nonameDateFormat : 'ymd-His', // to apply if upload file is noname: 120513172700
		messages   : {

			/********************************** errors **********************************/
			'error'                : 'Помилка',
			'errUnknown'           : 'Невідома помилка.',
			'errUnknownCmd'        : 'Невідома команда.',
			'errJqui'              : 'Відсутні необхідні компоненти jQuery UI - selectable, draggable и droppable.',
			'errNode'              : 'Відсутній DOM елемент для ініціалізації elFinder.',
			'errURL'               : 'Хибна конфігурація elFinder! Не вказаний URL.',
			'errAccess'            : 'Доступ заборонено.',
			'errConnect'           : 'Не вдалося зєднатися з сервером.',
			'errAbort'             : 'Звязок перервано.',
			'errTimeout'           : 'Таймаут звязку.',
			'errNotFound'          : 'Сервер не знайдений.',
			'errResponse'          : 'Некорректна відповідь сервера.',
			'errConf'              : 'Некорректна настройка сервера.',
			'errJSON'              : 'Модуль PHP JSON не встановлений.',
			'errNoVolumes'         : 'Відсутні кореневі директорії достуні для читання.',
			'errCmdParams'         : 'Некоректні параметри команди "$1".',
			'errDataNotJSON'       : 'Дані не в форматі JSON.',
			'errDataEmpty'         : 'Дані відсутні.',
			'errCmdReq'            : 'Для запиту до серверу необхідно вказати імя команди.',
			'errOpen'              : 'Не вдалося відкрити "$1".',
			'errNotFolder'         : 'Обєкт не папка.',
			'errNotFile'           : 'Обєкт не файл.',
			'errRead'              : 'Помилка читання  "$1".',
			'errWrite'             : 'Помилка запису в "$1".',
			'errPerm'              : 'Доступ заборонено.',
			'errLocked'            : '"$1" захищений і  не може бути переіменований, переміщений або  видалений.',
			'errExists'            : 'В папці вже існує файл с імям "$1".',
			'errInvName'           : 'Недопустиме імя файла.',
			'errInvDirname'        : 'Недопустиме імя папки.',  // from v2.1.24 added 12.4.2017
			'errFolderNotFound'    : 'Папка не знайдена.',
			'errFileNotFound'      : 'Файл не найдено.',
			'errTrgFolderNotFound' : 'Цільова папка "$1" не знайдена.',
			'errPopup'             : 'Браузер заблокуваав відкриття нового вікна. Щоб відкрити файл, змініть налаштування браузера.',
			'errMkdir'             : 'Помилка створення папки "$1".',
			'errMkfile'            : 'Помилка створення файлу "$1".',
			'errRename'            : 'Помилка переіменування "$1".',
			'errCopyFrom'          : 'Копіювання файлів з директорії "$1" заборонено.',
			'errCopyTo'            : 'Копіювання файлів в директорію "$1" заборонено.',
			'errMkOutLink'         : 'Неможливо створити посилання ззовні кореневого розділу.', // from v2.1 added 03.10.2015
			'errUpload'            : 'Помилка завантаження.',  // old name - errUploadCommon
			'errUploadFile'        : 'Неможливо завантажити "$1".', // old name - errUpload
			'errUploadNoFiles'     : 'Немає файлів для завантаження.',
			'errUploadTotalSize'   : 'Перевищений допустимий размір даних що завантажуються.', // old name - errMaxSize
			'errUploadFileSize'    : 'Размір файлу перевищуе допустимий.', //  old name - errFileMaxSize
			'errUploadMime'        : 'Недопустимий тип файлу.',
			'errUploadTransfer'    : 'Помилка передачі файла "$1".',
			'errUploadTemp'        : 'Неможливо створити тимчасовий файл для завантаження.', // from v2.1 added 26.09.2015
			'errNotReplace'        : 'Объект "$1" по этому адресу уже существует и не может быть заменен объектом другого типа.', // new
			'errReplace'           : 'Неможливо замінити "$1".',
			'errSave'              : 'Неможливо зберегти "$1".',
			'errCopy'              : 'Неможливо зкопіювати "$1".',
			'errMove'              : 'Неможливо перемістити "$1".',
			'errCopyInItself'      : 'Неможливо зкопіювати "$1" в самого себе.',
			'errRm'                : 'Неможливо видалити "$1".',
			'errTrash'             : 'Неможливо переместити в кошик.', // from v2.1.24 added 30.4.2017
			'errRmSrc'             : 'Неможливо видалити файли джерела.',
			'errExtract'           : 'Неможливо розпакувати файли из "$1".',
			'errArchive'           : 'Неможливо створити архів.',
			'errArcType'           : 'Непідтримуваний тип архіву.',
			'errNoArchive'         : 'Файл не є архівом або непідтримуваний тип архіву.',
			'errCmdNoSupport'      : 'Сервер не підтримує цю команду.',
			'errReplByChild'       : 'Неможливо замінити папку "$1" обєктом що в ній знаходиться.',
			'errArcSymlinks'       : 'По міркуванням безпеки заборонена розпаковка архівів, що містять посилання(symlinks) або файли з  недопустимими іменами.', // edited 24.06.2012
			'errArcMaxSize'        : 'Розмір файлів в архиве превышает максимально разрешенный.',
			'errResize'            : 'Не вдалося змінити розмір "$1".',
			'errResizeDegree'      : 'Некоректний градус повороту.',  // added 7.3.2013
			'errResizeRotate'      : 'Неможливо повернути зображення.',  // added 7.3.2013
			'errResizeSize'        : 'Некоректний розмір зображення.',  // added 7.3.2013
			'errResizeNoChange'    : 'Розмір зображення не змінився.',  // added 7.3.2013
			'errUsupportType'      : 'Непідтримуваний тип файла.',
			'errNotUTF8Content'    : 'Файл "$1" содержит текст в кодировке отличной от UTF-8 и не может быть отредактирован.',  // added 9.11.2011
			'errNetMount'          : 'Неможливо підключити "$1".', // added 17.04.2012
			'errNetMountNoDriver'  : 'Непідтримуваний протокол.',     // added 17.04.2012
			'errNetMountFailed'    : 'Помилка монтування.',         // added 17.04.2012
			'errNetMountHostReq'   : 'Потрібно вказати хост.', // added 18.04.2012
			'errSessionExpires'    : 'Сесія була закінчена так як перевищено час відсутності активності.',
			'errCreatingTempDir'   : 'Неможливо створити тимчасову директорію: "$1"',
			'errFtpDownloadFile'   : 'Неможливо скачати файл с FTP: "$1"',
			'errFtpUploadFile'     : 'Неможливо завантажити файл на FTP: "$1"',
			'errFtpMkdir'          : 'Неможливо створити директорію на FTP: "$1"',
			'errArchiveExec'       : 'Помилка при виконанні архівації: "$1"',
			'errExtractExec'       : 'Помилка при виконанні розпаковки: "$1"',
			'errNetUnMount'        : 'Неможливо відключити', // from v2.1 added 30.04.2012
			'errConvUTF8'          : 'Не конвертується в UTF-8', // from v2.1 added 08.04.2014
			'errFolderUpload'      : 'Якщо ви хочете завантажувати папки, спробуйте Google Chrome.', // from v2.1 added 26.6.2015
			'errSearchTimeout'     : 'Перевищено час очікування при пошуку "$1". Результаиы пошука часткові.', // from v2.1 added 12.1.2016
			'errReauthRequire'     : 'Необхідна повторна авторизація.', // from v2.1.10 added 24.3.2016
			'errMaxTargets'        : 'Максимальне число вибраних файлів : $1.', // from v2.1.17 added 17.10.2016
			'errRestore'           : 'Неможливо відновити з кошика. Не вдалося визначити шлях для відновлення.', // from v2.1.24 added 3.5.2017
			'errEditorNotFound'    : 'Не знайдений редактор для цього типу файлів.', // from v2.1.25 added 23.5.2017
			'errServerError'       : 'Виникла помилка на стороні серверу.', // from v2.1.25 added 16.6.2017
			'errEmpty'             : 'Неможливо очистити папку "$1".', // from v2.1.25 added 22.6.2017

			/******************************* commands names ********************************/
			'cmdarchive'   : 'Створити архив',
			'cmdback'      : 'Назад',
			'cmdcopy'      : 'Копіювати',
			'cmdcut'       : 'Вирізати',
			'cmddownload'  : 'Скачати',
			'cmdduplicate' : 'зробити копію',
			'cmdedit'      : 'Редагувати файл',
			'cmdextract'   : 'Розпакувати архів',
			'cmdforward'   : 'Вперед',
			'cmdgetfile'   : 'Вибрати файли',
			'cmdhelp'      : 'Про програму',
			'cmdhome'      : 'Додому',
			'cmdinfo'      : 'Властивості',
			'cmdmkdir'     : 'Нова папка',
			'cmdmkdirin'   : 'В нову папку', // from v2.1.7 added 19.2.2016
			'cmdmkfile'    : 'Новий текстовий файл',
			'cmdopen'      : 'Відкрити',
			'cmdpaste'     : 'Вставити ',
			'cmdquicklook' : 'Швидкий перегляд',
			'cmdreload'    : 'Обновити',
			'cmdrename'    : 'Переіменувати',
			'cmdrm'        : 'Видалити',
			'cmdtrash'     : 'Перемістити в кошик', //from v2.1.24 added 29.4.2017
			'cmdrestore'   : 'Відновити', //from v2.1.24 added 3.5.2017
			'cmdsearch'    : 'Пошук файлів ',
			'cmdup'        : 'Нагору ',
			'cmdupload'    : 'Завантажити файли',
			'cmdview'      : 'Вид',
			'cmdresize'    : 'Змінпити розмір і повернути',
			'cmdsort'      : 'Сортувати',
			'cmdnetmount'  : 'Подключити мережевий розділ', // added 18.04.2012
			'cmdnetunmount': 'Відключити', // from v2.1 added 30.04.2012
			'cmdplaces'    : 'До вибраного', // added 28.12.2014
			'cmdchmod'     : 'Змінити права доступу', // from v2.1 added 20.6.2015
			'cmdopendir'   : 'Відкрити папку', // from v2.1 added 13.1.2016
			'cmdcolwidth'  : 'Скинути ширину колонок', // from v2.1.13 added 12.06.2016
			'cmdfullscreen': 'Повний екран', // from v2.1.15 added 03.08.2016
			'cmdmove'      : 'Перемістити', // from v2.1.15 added 21.08.2016
			'cmdempty'     : 'Очистити папку', // from v2.1.25 added 22.06.2017
			'cmdundo'      : 'Відмінити', // from v2.1.27 added 31.07.2017
			'cmdredo'      : 'Повернути', // from v2.1.27 added 31.07.2017
			'cmdpreference': 'Вподобання', // from v2.1.27 added 03.08.2017
			'cmdselectall' : 'Виділити все', // from v2.1.28 added 15.08.2017
			'cmdselectnone': 'Зняти все виділення', // from v2.1.28 added 15.08.2017
			'cmdselectinvert': 'Інвертувати виділення', // from v2.1.28 added 15.08.2017

			/*********************************** buttons ***********************************/
			'btnClose'  : 'Закрити',
			'btnSave'   : 'Зберегти',
			'btnRm'     : 'Видалити',
			'btnApply'  : 'Застосувати',
			'btnCancel' : 'Відміна',
			'btnNo'     : 'Ні',
			'btnYes'    : 'Так',
			'btnMount'  : 'Подключити',  // added 18.04.2012
			'btnApprove': 'Перейти в $1 і застосувати', // from v2.1 added 26.04.2012
			'btnUnmount': 'Відключити', // from v2.1 added 30.04.2012
			'btnConv'   : 'Конвертувати', // from v2.1 added 08.04.2014
			'btnCwd'    : 'Тут',      // from v2.1 added 22.5.2015
			'btnVolume' : 'Розділ',    // from v2.1 added 22.5.2015
			'btnAll'    : 'Всі',       // from v2.1 added 22.5.2015
			'btnMime'   : 'MIME тип', // from v2.1 added 22.5.2015
			'btnFileName':'Імя файлу',  // from v2.1 added 22.5.2015
			'btnSaveClose': 'Зберегти і закрити', // from v2.1 added 12.6.2015
			'btnBackup' : 'Резервна копія', // fromv2.1 added 28.11.2015
			'btnRename'    : 'Переіменувати',      // from v2.1.24 added 6.4.2017
			'btnRenameAll' : 'Переіменувати (всі)', // from v2.1.24 added 6.4.2017
			'btnPrevious' : 'Попер. ($1/$2)', // from v2.1.24 added 11.5.2017
			'btnNext'     : 'Наст. ($1/$2)', // from v2.1.24 added 11.5.2017
			'btnSaveAs'   : 'Зберегти як', // from v2.1.25 added 24.5.2017

			/******************************** notifications ********************************/
			'ntfopen'     : 'Відкрити папку',
			'ntffile'     : 'Відкрити файл',
			'ntfreload'   : 'Оновити поточну папку',
			'ntfmkdir'    : 'Створення папки',
			'ntfmkfile'   : 'Створення файлів',
			'ntfrm'       : 'Видалити файли',
			'ntfcopy'     : 'Скопіювати файли',
			'ntfmove'     : 'Перемістити файли',
			'ntfprepare'  : 'Підготовка до копіювання файлів',
			'ntfrename'   : 'Переіменувати файлів',
			'ntfupload'   : 'Завантаження файлів',
			'ntfdownload' : 'Скачування файлів',
			'ntfsave'     : 'Зберегти файли',
			'ntfarchive'  : 'Створення архиву',
			'ntfextract'  : 'Розпаковка архиву',
			'ntfsearch'   : 'Пошук файлів',
			'ntfresize'   : 'Зміна розмірів зображень',
			'ntfsmth'     : 'Занятий важливим ділом',
			'ntfloadimg'  : 'Завантаження зображення',
			'ntfnetmount' : 'Подключення мережевого диску', // added 18.04.2012
			'ntfnetunmount': 'Відключення мережевого диску', // from v2.1 added 30.04.2012
			'ntfdim'      : 'Отримання розмірів зображення', // added 20.05.2013
			'ntfreaddir'  : 'Читання інформації про папку', // from v2.1 added 01.07.2013
			'ntfurl'      : 'Отримання URL посилання', // from v2.1 added 11.03.2014
			'ntfchmod'    : 'Зміна прав доступу до  файлу', // from v2.1 added 20.6.2015
			'ntfpreupload': 'Перевірка імені завантаженого файлу', // from v2.1 added 31.11.2015
			'ntfzipdl'    : 'Створення файлу для скачування', // from v2.1.7 added 23.1.2016
			'ntfparents'  : 'Отримання інформації про шлях', // from v2.1.17 added 2.11.2016
			'ntfchunkmerge': 'Обробка загруженого файлу', // from v2.1.17 added 2.11.2016
			'ntftrash'    : 'Переміщення до кошика', // from v2.1.24 added 2.5.2017
			'ntfrestore'  : 'Відновлення з кошика', // from v2.1.24 added 3.5.2017
			'ntfchkdir'   : 'Перевірка папки призначення', // from v2.1.24 added 3.5.2017
			'ntfundo'     : 'Відміна попередньої операції', // from v2.1.27 added 31.07.2017
			'ntfredo'     : 'Відновлення попередньої операції', // from v2.1.27 added 31.07.2017

			/*********************************** volumes *********************************/
			'volume_Trash' : 'Кошик', //from v2.1.24 added 29.4.2017

			/************************************ dates **********************************/
			'dateUnknown' : 'невідомо',
			'Today'       : 'Сьогодні',
			'Yesterday'   : 'Вчора',
			'msJan'       : 'Січ',
			'msFeb'       : 'Лют',
			'msMar'       : 'Бер',
			'msApr'       : 'Квіт',
			'msMay'       : 'Трав',
			'msJun'       : 'Чер',
			'msJul'       : 'Лип',
			'msAug'       : 'Сер',
			'msSep'       : 'Вер',
			'msOct'       : 'Жовт',
			'msNov'       : 'Лист',
			'msDec'       : 'груд',
			'January'     : 'Січень',
			'February'    : 'Лютий',
			'March'       : 'Березень',
			'April'       : 'Квітень',
			'May'         : 'Травень',
			'June'        : 'Червень',
			'July'        : 'Липень',
			'August'      : 'Серпень',
			'September'   : 'Вересень',
			'October'     : 'Жовтень',
			'November'    : 'Листопад',
			'December'    : 'Грудень',
			'Sunday'      : 'Неділля',
			'Monday'      : 'Понеділок',
			'Tuesday'     : 'Вівторок',
			'Wednesday'   : 'Середа',
			'Thursday'    : 'Четвер',
			'Friday'      : 'Пятниця',
			'Saturday'    : 'Субота',
			'Sun'         : 'Нед',
			'Mon'         : 'Пнд',
			'Tue'         : 'Втр',
			'Wed'         : 'Срд',
			'Thu'         : 'Чтв',
			'Fri'         : 'Птн',
			'Sat'         : 'Сбт',

			/******************************** sort variants ********************************/
			'sortname'          : 'по імені',
			'sortkind'          : 'по типу',
			'sortsize'          : 'по разміру',
			'sortdate'          : 'по даті',
			'sortFoldersFirst'  : 'Папки спочатку',
			'sortperm'          : 'по дозволам', // from v2.1.13 added 13.06.2016
			'sortmode'          : 'по режиму',       // from v2.1.13 added 13.06.2016
			'sortowner'         : 'по власнику',      // from v2.1.13 added 13.06.2016
			'sortgroup'         : 'по групі',      // from v2.1.13 added 13.06.2016
			'sortAlsoTreeview'  : 'Також і дерево каталогів',  // from v2.1.15 added 01.08.2016

			/********************************** new items **********************************/
			'untitled file.txt' : 'НовийФайл.txt', // added 10.11.2015
			'untitled folder'   : 'НоваПапка',   // added 10.11.2015
			'Archive'           : 'НовийАрхів',  // from v2.1 added 10.11.2015

			/********************************** messages **********************************/
			'confirmReq'      : 'Необхідно підтвердження',
			'confirmRm'       : 'Ви впевнені що хочете видалити файли?<br>Дію неможливо відмінити!',
			'confirmRepl'     : 'Замінити старий файл новим?',
			'confirmRest'     : 'Замінити існуючий файл файлом з кошика?', // fromv2.1.24 added 5.5.2017
			'confirmConvUTF8' : 'Не UTF-8<br/>Конвертувати в UTF-8?<br/>Данні стануть UTF-8 при зберігання після конвертації.', // from v2.1 added 08.04.2014
			'confirmNonUTF8'  : 'Неможливо визначити кодування файла. Необхідна попередня конвертація файлу в UTF-8 для подальшого редагування.<br/>Виберіть кодування файлу.', // from v2.1.19 added 28.11.2016
			'confirmNotSave'  : 'Відбулися зміни.<br/>Якщо не збережете зміни, то втратите їх.', // from v2.1 added 15.7.2015
			'confirmTrash'    : 'Ви впевнені, що хочете перемістити файли до кошика?', //from v2.1.24 added 29.4.2017
			'apllyAll'        : 'Застосувати для всіх',
			'name'            : 'Імя',
			'size'            : 'Розмір',
			'perms'           : 'Доступ',
			'modify'          : 'Змінений',
			'kind'            : 'Тип',
			'read'            : 'читання',
			'write'           : 'запис',
			'noaccess'        : 'немає доступу',
			'and'             : 'і',
			'unknown'         : 'невідомо',
			'selectall'       : 'Вибрати всі файли',
			'selectfiles'     : 'Вибрати файл(и)',
			'selectffile'     : 'Вибрати перший файл',
			'selectlfile'     : 'Вибрати останній файл',
			'viewlist'        : 'У вигляді списку',
			'viewicons'       : 'У вигляді іконок',
			'places'          : 'Вибране',
			'calc'            : 'Вирахувати',
			'path'            : 'Шлях',
			'aliasfor'        : 'Вказує на',
			'locked'          : 'Захист',
			'dim'             : 'Розміри',
			'files'           : 'Файли',
			'folders'         : 'Папки',
			'items'           : 'Обєкти',
			'yes'             : 'так',
			'no'              : 'ні',
			'link'            : 'Посилання',
			'searcresult'     : 'Результати пошуку',
			'selected'        : 'вибрано',
			'about'           : 'Про програму',
			'shortcuts'       : 'Горячі клавиші',
			'help'            : 'допомога',
			'webfm'           : 'Файловий менеджер для Web',
			'ver'             : 'Версія',
			'protocolver'     : 'версія протоколу',
			'homepage'        : 'Сайт проекту',
			'docs'            : 'Документація',
			'github'          : 'Форкнить на Github',
			'twitter'         : 'Слідкуйте в twitter',
			'facebook'        : 'Приєднуйтесь на facebook',
			'team'            : 'Команда',
			'chiefdev'        : 'провідний розробник',
			'developer'       : 'розробник',
			'contributor'     : 'учасник',
			'maintainer'      : 'супровід проекта',
			'translator'      : 'перекладач',
			'icons'           : 'Іконки',
			'dontforget'      : 'і не забудьте взяти свій рушник',
			'shortcutsof'     : 'Горячі клавіші відключені',
			'dropFiles'       : 'Перетягніть файли сюди',
			'or'              : 'або',
			'selectForUpload' : 'Вибрати файли для завантаження',
			'moveFiles'       : 'Переместити файли',
			'copyFiles'       : 'Зкопіювати файли',
			'restoreFiles'    : 'Відновити файли', // from v2.1.24 added 5.5.2017
			'rmFromPlaces'    : 'Видалити з вибраного',
			'aspectRatio'     : 'Співвідношення сторін',
			'scale'           : 'Масштаб',
			'width'           : 'Ширина',
			'height'          : 'Висота',
			'resize'          : 'Змінити розмір',
			'crop'            : 'Обрізати',
			'rotate'          : 'Повернути',
			'rotate-cw'       : 'Повернути на 90 градусів по годинниковій стрілці',
			'rotate-ccw'      : 'Повернутина 90 градусів проти годинникової стрілки',
			'degree'          : '°',
			'netMountDialogTitle' : 'Підключити мережевий диск', // added 18.04.2012
			'protocol'            : 'Протокол', // added 18.04.2012
			'host'                : 'Хост', // added 18.04.2012
			'port'                : 'Порт', // added 18.04.2012
			'user'                : 'Користувач', // added 18.04.2012
			'pass'                : 'Пароль', // added 18.04.2012
			'confirmUnmount'      : 'Ви хочете відключити $1?',  // from v2.1 added 30.04.2012
			'dropFilesBrowser': 'Перетягніть або вставте файли з браузера', // from v2.1 added 30.05.2012
			'dropPasteFiles'  : 'Перетягніть або вставте файли і посилання сюди', // from v2.1 added 07.04.2014
			'encoding'        : 'Кодування', // from v2.1 added 19.12.2014
			'locale'          : 'Локаль',   // from v2.1 added 19.12.2014
			'searchTarget'    : 'Ціль: $1',                // from v2.1 added 22.5.2015
			'searchMime'      : 'Пошук по введеному MIME типу', // from v2.1 added 22.5.2015
			'owner'           : 'Власник', // from v2.1 added 20.6.2015
			'group'           : 'Группа', // from v2.1 added 20.6.2015
			'other'           : 'Решта', // from v2.1 added 20.6.2015
			'execute'         : 'Виконати', // from v2.1 added 20.6.2015
			'perm'            : 'Дозвіл', // from v2.1 added 20.6.2015
			'mode'            : 'Режим', // from v2.1 added 20.6.2015
			'emptyFolder'     : 'Папка порожня', // from v2.1.6 added 30.12.2015
			'emptyFolderDrop' : 'Папка порожня\\A Перетягніть щоб додати', // from v2.1.6 added 30.12.2015
			'emptyFolderLTap' : 'Папка порожня\\A Довге натискання щоб додати', // from v2.1.6 added 30.12.2015
			'quality'         : 'Якість', // from v2.1.6 added 5.1.2016
			'autoSync'        : 'Авто синхронізація',  // from v2.1.6 added 10.1.2016
			'moveUp'          : 'Перемістити вгору',  // from v2.1.6 added 18.1.2016
			'getLink'         : 'Отримати URL ссылку', // from v2.1.7 added 9.2.2016
			'selectedItems'   : 'Вибрані обєкти ($1)', // from v2.1.7 added 2.19.2016
			'folderId'        : 'ID папки', // from v2.1.10 added 3.25.2016
			'offlineAccess'   : 'дозволити автономний доступ', // from v2.1.10 added 3.25.2016
			'reAuth'          : 'Авторизоватися повторно', // from v2.1.10 added 3.25.2016
			'nowLoading'      : 'Завантажується...', // from v2.1.12 added 4.26.2016
			'openMulti'       : 'ВІдкрити декілька файлів', // from v2.1.12 added 5.14.2016
			'openMultiConfirm': 'Ви намагається відкрити $1 файл(/ів). Ви впевнені, що хочете відкрити їх браузері?', // from v2.1.12 added 5.14.2016
			'emptySearch'     : 'Нічого не знайдено', // from v2.1.12 added 5.16.2016
			'editingFile'     : 'Це редагований файл.', // from v2.1.13 added 6.3.2016
			'hasSelected'     : 'Ви вибрали $1 файл(-и).', // from v2.1.13 added 6.3.2016
			'hasClipboard'    : 'У вас $1 файл(-и) в буфері обміну.', // from v2.1.13 added 6.3.2016
			'incSearchOnly'   : 'Інкрементний пошук можливий лише з поточного виду.', // from v2.1.13 added 6.30.2016
			'reinstate'       : 'Відновити', // from v2.1.15 added 3.8.2016
			'complete'        : '$1 закінчений', // from v2.1.15 added 21.8.2016
			'contextmenu'     : 'Контекстне меню', // from v2.1.15 added 9.9.2016
			'pageTurning'     : 'Переключення сторінки', // from v2.1.15 added 10.9.2016
			'volumeRoots'     : 'Корені томів', // from v2.1.16 added 16.9.2016
			'reset'           : 'Скинути', // from v2.1.16 added 1.10.2016
			'bgcolor'         : 'Фоновий колір', // from v2.1.16 added 1.10.2016
			'colorPicker'     : 'Вибір кольору', // from v2.1.16 added 1.10.2016
			'8pxgrid'         : '8px сітка', // from v2.1.16 added 4.10.2016
			'enabled'         : 'Включено', // from v2.1.16 added 4.10.2016
			'disabled'        : 'Відключено', // from v2.1.16 added 4.10.2016
			'emptyIncSearch'  : 'Нічого не знайдено в поточному вигляді.\\AНатисніть [Enter] щоб розгорнути цілі пошуку.', // from v2.1.16 added 5.10.2016
			'emptyLetSearch'  : 'Пошук по першому символу не дав результатів в поточному вигляді', // from v2.1.23 added 24.3.2017
			'textLabel'       : 'Текстова мітка', // from v2.1.17 added 13.10.2016
			'minsLeft'        : '$1 хвилин залишилось', // from v2.1.17 added 13.11.2016
			'openAsEncoding'  : 'Перевідкрити з вибраним кодуванням', // from v2.1.19 added 2.12.2016
			'saveAsEncoding'  : 'зберегти з вибраним кодуванням', // from v2.1.19 added 2.12.2016
			'selectFolder'    : 'Вибрати папку', // from v2.1.20 added 13.12.2016
			'firstLetterSearch': 'Пошук по першому символу', // from v2.1.23 added 24.3.2017
			'presets'         : 'Пресети', // from v2.1.25 added 26.5.2017
			'tooManyToTrash'  : 'Надто багато файлів для переміщення в кошик.', // from v2.1.25 added 9.6.2017
			'TextArea'        : 'Текстове поле', // from v2.1.25 added 14.6.2017
			'folderToEmpty'   : 'Очистити папку "$1".', // from v2.1.25 added 22.6.2017
			'filderIsEmpty'   : 'Немає файлів в папці "$1".', // from v2.1.25 added 22.6.2017
			'preference'      : 'Налаштування ', // from v2.1.26 added 28.6.2017
			'language'        : 'Мова', // from v2.1.26 added 28.6.2017
			'clearBrowserData': 'Скинути налаштування для цього браузеру', // from v2.1.26 added 28.6.2017
			'toolbarPref'     : 'Налаштування панелі', // from v2.1.27 added 2.8.2017
			'charsLeft'       : '... ще символів: $1.',  // from v2.1.29 added 30.8.2017
			'sum'             : 'Загальний розмір', // from v2.1.29 added 28.9.2017
			'roughFileSize'   : 'Приблизительний розмір файлу', // from v2.1.30 added 2.11.2017
			'autoFocusDialog' : 'Фокус на елементі діалогу при наведені миші',  // from v2.1.30 added 2.11.2017
			'select'          : 'Вибрати', // from v2.1.30 added 23.11.2017
			'selectAction'    : 'Дія при виборі файлу', // from v2.1.30 added 23.11.2017
			'useStoredEditor' : 'Відкривати в редакторі, що використовувався минулого разу', // from v2.1.30 added 23.11.2017
			'selectinvert'    : 'Інвертуванти вибір', // from v2.1.30 added 25.11.2017
			'renameMultiple'  : 'Are you sure you want to rename $1 selected items like $2?<br/>This cannot be undone!', // from v2.1.31 added 4.12.2017
			'batchRename'     : 'Batch rename', // from v2.1.31 added 8.12.2017
			'plusNumber'      : '+ Number', // from v2.1.31 added 8.12.2017
			'asPrefix'        : 'Add prefix', // from v2.1.31 added 8.12.2017
			'asSuffix'        : 'Add suffix', // from v2.1.31 added 8.12.2017
			'changeExtention' : 'Поміняти розширення', // from v2.1.31 added 8.12.2017

			/********************************** mimetypes **********************************/
			'kindUnknown'     : 'Невідомий',
			'kindRoot'        : 'Корінь тома', // from v2.1.16 added 16.10.2016
			'kindFolder'      : 'Папка',
			'kindSelects'     : 'Вибір', // from v2.1.29 added 29.8.2017
			'kindAlias'       : 'Посилання',
			'kindAliasBroken' : 'Неробоче  посилання',
			// applications
			'kindApp'         : 'Додаток',
			'kindPostscript'  : 'Документ Postscript',
			'kindMsOffice'    : 'Документ Microsoft Office',
			'kindMsWord'      : 'Документ Microsoft Word',
			'kindMsExcel'     : 'Документ Microsoft Excel',
			'kindMsPP'        : 'Презентація Microsoft Powerpoint',
			'kindOO'          : 'Документ Open Office',
			'kindAppFlash'    : 'Додаток Flash',
			'kindPDF'         : 'Документ PDF',
			'kindTorrent'     : 'Файл Bittorrent',
			'kind7z'          : 'Архів 7z',
			'kindTAR'         : 'Архів TAR',
			'kindGZIP'        : 'Архів GZIP',
			'kindBZIP'        : 'Архів BZIP',
			'kindXZ'          : 'Архів XZ',
			'kindZIP'         : 'Архів ZIP',
			'kindRAR'         : 'Архів RAR',
			'kindJAR'         : 'Файл Java JAR',
			'kindTTF'         : 'Шрифт True Type',
			'kindOTF'         : 'Шрифт Open Type',
			'kindRPM'         : 'Пакет RPM',
			// texts
			'kindText'        : 'Текстовий документ',
			'kindTextPlain'   : 'Простий текст',
			'kindPHP'         : 'Джерело PHP',
			'kindCSS'         : 'Таблицы стилів CSS',
			'kindHTML'        : 'Документ HTML',
			'kindJS'          : 'Джерело Javascript',
			'kindRTF'         : 'Текст з форматуванням',
			'kindC'           : 'Джерело C',
			'kindCHeader'     : 'Заголовочный файл C',
			'kindCPP'         : 'Джерело C++',
			'kindCPPHeader'   : 'Заголовочный файл C++',
			'kindShell'       : 'Скрипт Unix shell',
			'kindPython'      : 'Джерело Python',
			'kindJava'        : 'Джерело Java',
			'kindRuby'        : 'Джерело Ruby',
			'kindPerl'        : 'Джерело Perl',
			'kindSQL'         : 'Джерело SQL',
			'kindXML'         : 'Документ XML',
			'kindAWK'         : 'Джерело AWK',
			'kindCSV'         : 'Текст с розділювачами',
			'kindDOCBOOK'     : 'Документ Docbook XML',
			'kindMarkdown'    : 'Текст Markdown', // added 20.7.2015
			// images
			'kindImage'       : 'Зображення ',
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
			'kindAudio'       : 'Аудіо файл',
			'kindAudioMPEG'   : 'Аудіо MPEG',
			'kindAudioMPEG4'  : 'Аудіо MPEG-4',
			'kindAudioMIDI'   : 'Аудіо MIDI',
			'kindAudioOGG'    : 'Аудіо Ogg Vorbis',
			'kindAudioWAV'    : 'Аудіо WAV',
			'AudioPlaylist'   : 'Плейлист MP3',
			'kindVideo'       : 'Відео файл',
			'kindVideoDV'     : 'Відео DV',
			'kindVideoMPEG'   : 'Відео MPEG',
			'kindVideoMPEG4'  : 'Відео MPEG-4',
			'kindVideoAVI'    : 'Відео AVI',
			'kindVideoMOV'    : 'Відео Quick Time',
			'kindVideoWM'     : 'Відео Windows Media',
			'kindVideoFlash'  : 'Відео Flash',
			'kindVideoMKV'    : 'Відео Matroska',
			'kindVideoOGG'    : 'Відео Ogg'
		}
	};
}));

