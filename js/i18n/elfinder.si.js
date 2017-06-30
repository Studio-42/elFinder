/**
 * Sinhala translation
 * @author Troex Nevelin <troex@fury.scancode.ru>
 * @author CodeLyokoXtEAM <XcodeLyokoTEAM@gmail.com>
 * @version 2017-06-29
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
	elFinder.prototype.i18.si = {
		translator : 'Troex Nevelin &lt;troex@fury.scancode.ru&gt;, CodeLyokoXtEAM &lt;XcodeLyokoTEAM@gmail.com&gt;',
		language   : 'Sinhala',
		direction  : 'ltr',
		dateFormat : 'Y.m.d h:i A', // Mar 13, 2012 05:27 PM
		fancyDateFormat : '$1 h:i A', // will produce smth like: Today 12:25 PM
		nonameDateFormat : 'Ymd-His', // to apply if upload file is noname: 120513172700
		messages   : {

			/********************************** errors **********************************/
			'error'                : 'දෝෂයකි.',
			'errUnknown'           : 'නොදන්නා දෝෂයකි.',
			'errUnknownCmd'        : 'නොදන්නා විධානයකි.',
			'errJqui'              : 'වලංගු නොවන jQuery UI සැකැස්මකි. තේරිය හැකි, ඇදගෙන යාම සහ ඇද දැමිය හැකි කොටස් ඇතුළත් කළ යුතුය.',
			'errNode'              : 'ElFinder විසින් DOM Element නිර්මාණය කිරීමට අවශ්‍යව අැත.',
			'errURL'               : 'වලංගු නොවන elFinder සැකැස්මකි! URL විකල්පය සැකසා නැත.',
			'errAccess'            : 'භාවිතය අත්හිටුවා ඇත.',
			'errConnect'           : 'Backend වෙත සම්බන්ධ වීමට නොහැකිය.',
			'errAbort'             : 'සම්බන්ධතාවය වසාදමා ඇත.',
			'errTimeout'           : 'සම්බන්ධතා කල් ඉකුත්වී ඇත.',
			'errNotFound'          : 'පසුබිම(Backend) සොයාගත නොහැකි විය.',
			'errResponse'          : 'වලංගු නොවන පසුබිම(Backend) ප්‍රතිචාරය.',
			'errConf'              : 'වලංගු නොවන Backend සැකැස්මකි.',
			'errJSON'              : 'PHP JSON මොඩියුලය ස්ථාපනය කර නැත.',
			'errNoVolumes'         : 'කියවිය හැකි එ්කක(volumes) නොමැත.',
			'errCmdParams'         : '"$1" නම් විධානය වලංගු නොවන පරාමිතියකි.',
			'errDataNotJSON'       : 'JSON දත්ත නොවේ.',
			'errDataEmpty'         : 'හිස් දත්තයකි.',
			'errCmdReq'            : 'Backend සඳහා ඉල්ලන ලද විධානයේ නම අවශ්‍ය වේ.',
			'errOpen'              : '"$1" විවෘත කළ නොහැක.',
			'errNotFolder'         : 'අායිත්තම(object) ෆොල්ඩරයක් නොවේ.',
			'errNotFile'           : 'අායිත්තම(object) ගොනුවක් නොවේ.',
			'errRead'              : '"$1" කියවීමට නොහැක.',
			'errWrite'             : '"$1" තුල ලිවීමට නොහැකිය.',
			'errPerm'              : 'අවසරය නොමැත.',
			'errLocked'            : '"$1" අගුළු දමා ඇති අතර එය නැවත නම් කිරීම, සම්පූර්ණයෙන් විස්ථාපනය කිරීම හෝ ඉවත් කිරීම කළ නොහැක.',
			'errExists'            : '"$1" නම් ගොනුව දැනටමත් පවතී.',
			'errInvName'           : 'ගොනු නම වලංගු නොවේ.',
			'errInvDirname'        : 'ෆෝල්ඩර් නම වලංගු නොවේ.',  // from v2.1.24 added 12.4.2017
			'errFolderNotFound'    : 'ෆෝල්ඩරය හමු නොවිණි.',
			'errFileNotFound'      : 'ගොනුව හමු නොවිණි.',
			'errTrgFolderNotFound' : 'ඉලක්කගත ෆෝල්ඩරය "$1" හමු නොවිනි.',
			'errPopup'             : 'බ්‍රවුසරය උත්පතන කවුළුව විවෘත කිරීම වළක්වයි. ගොනු විවෘත කිරීම සඳහා බ්‍රවුසරයේ විකල්ප තුළ එය සක්රිය කරන්න.',
			'errMkdir'             : '"$1" ෆෝල්ඩරය සෑදීමට නොහැකිය.',
			'errMkfile'            : '"$1" ගොනුව සෑදිය නොහැක.',
			'errRename'            : '"$1" නැවත නම් කිරීමට නොහැකි විය.',
			'errCopyFrom'          : '"$1" volume යෙන් ගොනු පිටපත් කිරීම තහනම්ය.',
			'errCopyTo'            : '"$1" volume යට ගොනු පිටපත් කිරීම තහනම්ය.',
			'errMkOutLink'         : 'volume root යෙන් පිටතට සබැඳිය(link) නිර්මාණය කිරීමට නොහැකි විය.', // from v2.1 added 03.10.2015
			'errUpload'            : 'උඩුගත(upload) කිරීමේ දෝෂයකි.',  // old name - errUploadCommon
			'errUploadFile'        : '"$1" උඩුගත(upload) කිරීමට නොහැකි විය.', // old name - errUpload
			'errUploadNoFiles'     : 'උඩුගත(upload) කිරීම සඳහා ගොනු කිසිවක් සොයාගත නොහැකි විය.',
			'errUploadTotalSize'   : 'දත්ත අවසර දී අැති උපරිම ප්‍රමාණය ඉක්මවා ඇත.', // old name - errMaxSize
			'errUploadFileSize'    : 'ගොනු අවසර දී අැති උපරිම ප්‍රමාණය ඉක්මවා ඇත.', //  old name - errFileMaxSize
			'errUploadMime'        : 'ගොනු වර්ගයට අවසර නැත.',
			'errUploadTransfer'    : '"$1" ව මාරු කිරීමේ දෝෂයකි.',
			'errUploadTemp'        : 'upload කිරීම සඳහා තාවකාලික ගොනුව සෑදිය නොහැක.', // from v2.1 added 26.09.2015
			'errNotReplace'        : '"$1" අායිත්තම(object) දැනටමත් මෙම ස්ථානයේ පවතී, වෙනත් වර්ගයකිනි ප්‍රතිස්ථාපනය කළ නොහැක.', // new
			'errReplace'           : '"$1" ප්‍රතිස්ථාපනය කළ නොහැක.',
			'errSave'              : '"$1" සුරැකීමට නොහැක.',
			'errCopy'              : '"$1" පිටපත් කිරීමට නොහැක.',
			'errMove'              : '"$1" සම්පූර්ණයෙන් විස්ථාපනය කිරීමට නොහැක.',
			'errCopyInItself'      : '"$1" තුලට පිටපත් කිරීමට නොහැක.',
			'errRm'                : '"$1" ඉවත් කිරීමට නොහැකි විය.',
			'errTrash'             : 'කුණු-කූඩය තුලට දැමීමට නොහැක.', // from v2.1.24 added 30.4.2017
			'errRmSrc'             : 'ප්‍රභව ගොනු(ව) ඉවත් කළ නොහැක.',
			'errExtract'           : '"$1" වෙතින් ගොනු දිග හැරීමට නොහැක.',
			'errArchive'           : 'සංරක්ෂිතය සෑදීමට නොහැකි විය.',
			'errArcType'           : 'නොගැලපෙන සංරක්ෂණ වර්ගයකි.',
			'errNoArchive'         : 'ගොනුව නොගැලපෙන සංරක්ෂණ වර්ගයක් හෝ සංරක්ෂිතයක් නොවේ.',
			'errCmdNoSupport'      : 'පසුබිම(Backend) මෙම විධානය නොදනී.',
			'errReplByChild'       : '"$1" ෆෝල්ඩරය එහිම අඩංගු අයිතමයක් මගින් ප්‍රතිස්ථාපනය කළ නොහැක.',
			'errArcSymlinks'       : 'ආරක්ෂිත හේතුව නිසා අනුමත නොකෙරෙන සබැඳි සම්බන්දතා හෝ ලිපිගොනු නම් අඩංගු බැවින් සංරක්ෂිතය දිග හැරීම කිරීමට ඉඩ නොදෙන.', // edited 24.06.2012
			'errArcMaxSize'        : 'සංරක්ෂිතය ලිපිගොනු උපරිම ප්‍රමාණය ඉක්මවා ඇත.',
			'errResize'            : 'ප්‍රතිප්‍රමාණය කිරීමට නොහැකි විය.',
			'errResizeDegree'      : 'වලංගු නොවන භ්‍රමණ කෝණයකි.',  // added 7.3.2013
			'errResizeRotate'      : 'රූපය භ්‍රමණය කිරීමට නොහැකි විය.',  // added 7.3.2013
			'errResizeSize'        : 'රූපයේ ප්‍රමාණය වලංගු නොවේ.',  // added 7.3.2013
			'errResizeNoChange'    : 'රූපයේ ප්‍රමාණය වෙනස් නොවුණි.',  // added 7.3.2013
			'errUsupportType'      : 'නොගැලපෙන ගොනු වර්ගයකි.',
			'errNotUTF8Content'    : '"$1" ගොනුව UTF-8 හි නොමැති අතර සංස්කරණය කළ නොහැක.',  // added 9.11.2011
			'errNetMount'          : '"$1" සවි කිරීමට(mount කිරීමට) නොහැක.', // added 17.04.2012
			'errNetMountNoDriver'  : 'protocol නොගැලපේ.',     // added 17.04.2012
			'errNetMountFailed'    : 'සවි කිරීම(mount කිරීම) අසාර්ථක විය.',         // added 17.04.2012
			'errNetMountHostReq'   : 'ධාරකය(Host) අවශ්‍ය වේ.', // added 18.04.2012
			'errSessionExpires'    : 'ඔබේ අක්‍රියතාව හේතුවෙන් සැසිය(session) කල් ඉකුත් වී ඇත.',
			'errCreatingTempDir'   : 'තාවකාලික ඩිරෙක්ටරයක්(directory) ​​සෑදිය නොහැක: "$1"',
			'errFtpDownloadFile'   : 'FTP වලින් ගොනුව බාගත(download) කිරීමට නොහැකි විය: "$1"',
			'errFtpUploadFile'     : 'ගොනුව FTP වෙත උඩුගත(upload) කිරීමට නොහැකි විය: "$1"',
			'errFtpMkdir'          : 'FTP මත දුරස්ථ නාමාවලියක්(remote directory) නිර්මාණය කිරීමට නොහැකි විය: "$1"',
			'errArchiveExec'       : 'ගොනු සංරක්ෂණය(archiving) කිරීමේදී දෝෂයක් ඇතිවිය: "$1"',
			'errExtractExec'       : 'ගොනු දිගහැරීමේදී(extracting) දෝෂයක් ඇතිවිය: "$1"',
			'errNetUnMount'        : 'විසන්ධි කිරීමට(unmount) නොහැක.', // from v2.1 added 30.04.2012
			'errConvUTF8'          : 'UTF-8 වෙත පරිවර්තනය කළ නොහැක.', // from v2.1 added 08.04.2014
			'errFolderUpload'      : 'ඔබ ෆෝල්ඩරය උඩුගත(upload) කිරීමට කැමති නම් නවීන බ්‍රවුසරයකින් උත්සාහ කරන්න. ', // from v2.1 added 26.6.2015
			'errSearchTimeout'     : '"$1" සෙවීම කල් ඉකුත්වී ඇත. සෙවුම් ප්‍රතිඵල අර්ධ වශයෙන් දිස්වේ.', // from v2.1 added 12.1.2016
			'errReauthRequire'     : 'නැවත බලය(Re-authorization) ලබා දීම අවශ්‍ය වේ.', // from v2.1.10 added 24.3.2016
			'errMaxTargets'        : 'තෝරා ගත හැකි උපරිම අයිතම සංඛ්‍යාව $1 ක් වේ.', // from v2.1.17 added 17.10.2016
			'errRestore'           : 'කුණු කූඩයෙන් නැවත ලබා ගත නොහැක. යළි පිහිටුවීමේ ගමනාන්තය(restore destination) හඳුනාගත නොහැක.', // from v2.1.24 added 3.5.2017
			'errEditorNotFound'    : 'මෙම ගොනු වර්ගයේ සංස්කාරකය හමු නොවිණි.', // from v2.1.25 added 23.5.2017
			'errServerError'       : 'සේවාදායකයේ පැත්තෙන්(server side) දෝශයක් ඇතිවිය.', // from v2.1.25 added 16.6.2017
			'errEmpty'             : '"$1" ෆෝල්ඩරය හිස් කිරීමට නොහැක.', // from v2.1.25 added 22.6.2017

			/******************************* commands names ********************************/
			'cmdarchive'   : 'සංරක්ෂිතය(archive) නිර්මාණය කරන්න',
			'cmdback'      : 'ආපසු',
			'cmdcopy'      : 'පිටපත් කරන්න',
			'cmdcut'       : 'මුළුමනින්ම පිටපත් කරන්න(Cut)',
			'cmddownload'  : 'බාගත කිරන්න(Download)',
			'cmdduplicate' : 'අනුපිටපත් කරන්න(Duplicate)',
			'cmdedit'      : 'ගොනුව සංස්කරණය කරන්න',
			'cmdextract'   : 'සංරක්ෂිතයේ ගොනු දිගහරින්න(Extract)',
			'cmdforward'   : 'ඉදිරියට',
			'cmdgetfile'   : 'ගොනු තෝරන්න',
			'cmdhelp'      : 'මෙම මෘදුකාංගය ගැන',
			'cmdhome'      : 'Home',
			'cmdinfo'      : 'තොරතුරු ලබාගන්න',
			'cmdmkdir'     : 'නව ෆෝල්ඩරය',
			'cmdmkdirin'   : 'නව ෆෝල්ඩරයක් තුළට', // from v2.1.7 added 19.2.2016
			'cmdmkfile'    : 'නව ලිඛිත(text) ගොනුවක්',
			'cmdopen'      : 'විවෘත කරන්න',
			'cmdpaste'     : 'Paste',
			'cmdquicklook' : 'පූර්ව දර්ශනයක්(Preview)',
			'cmdreload'    : 'Reload',
			'cmdrename'    : 'නම වෙනස් කරන්න',
			'cmdrm'        : 'මකන්න',
			'cmdtrash'     : 'කුණු කූඩයට', //from v2.1.24 added 29.4.2017
			'cmdrestore'   : 'Restore', //from v2.1.24 added 3.5.2017
			'cmdsearch'    : 'ගොනු සොයන්න',
			'cmdup'        : 'ප්‍ර්‍රධාන නාමාවලිය(parent directory) වෙත යන්න',
			'cmdupload'    : 'ගොනු උඩුගත(Upload) කරන්න',
			'cmdview'      : 'දර්ශනය(View)',
			'cmdresize'    : 'ප්‍රථිප්‍රමාණය සහ භ්‍රමණය',
			'cmdsort'      : 'වර්ගීකරණය කරන්න',
			'cmdnetmount'  : 'ජාල එ්කකයක්(network volume) සවි(mount) කරන්න', // added 18.04.2012
			'cmdnetunmount': 'ගලවන්න(Unmount)', // from v2.1 added 30.04.2012
			'cmdplaces'    : 'To Places', // added 28.12.2014
			'cmdchmod'     : 'Change mode', // from v2.1 added 20.6.2015
			'cmdopendir'   : 'ෆෝල්ඩරය විවෘත කරන්න', // from v2.1 added 13.1.2016
			'cmdcolwidth'  : 'නැවත තීරු පළල පිහිටුවන්න', // from v2.1.13 added 12.06.2016
			'cmdfullscreen': 'පුළුල් තිරය', // from v2.1.15 added 03.08.2016
			'cmdmove'      : 'Move', // from v2.1.15 added 21.08.2016
			'cmdempty'     : 'ෆෝල්ඩරය හිස් කරන්න', // from v2.1.25 added 22.06.2017

			/*********************************** buttons ***********************************/
			'btnClose'  : 'Close',
			'btnSave'   : 'Save',
			'btnRm'     : 'Remove',
			'btnApply'  : 'Apply',
			'btnCancel' : 'Cancel',
			'btnNo'     : 'No',
			'btnYes'    : 'Yes',
			'btnMount'  : 'Mount',  // added 18.04.2012
			'btnApprove': 'Goto $1 & approve', // from v2.1 added 26.04.2012
			'btnUnmount': 'Unmount', // from v2.1 added 30.04.2012
			'btnConv'   : 'Convert', // from v2.1 added 08.04.2014
			'btnCwd'    : 'Here',      // from v2.1 added 22.5.2015
			'btnVolume' : 'Volume',    // from v2.1 added 22.5.2015
			'btnAll'    : 'All',       // from v2.1 added 22.5.2015
			'btnMime'   : 'MIME Type', // from v2.1 added 22.5.2015
			'btnFileName':'Filename',  // from v2.1 added 22.5.2015
			'btnSaveClose': 'Save & Close', // from v2.1 added 12.6.2015
			'btnBackup' : 'Backup', // fromv2.1 added 28.11.2015
			'btnRename'    : 'Rename',      // from v2.1.24 added 6.4.2017
			'btnRenameAll' : 'Rename(All)', // from v2.1.24 added 6.4.2017
			'btnPrevious' : 'Prev ($1/$2)', // from v2.1.24 added 11.5.2017
			'btnNext'     : 'Next ($1/$2)', // from v2.1.24 added 11.5.2017
			'btnSaveAs'   : 'Save As', // from v2.1.25 added 24.5.2017

			/******************************** notifications ********************************/
			'ntfopen'     : 'Open folder',
			'ntffile'     : 'Open file',
			'ntfreload'   : 'Reload folder content',
			'ntfmkdir'    : 'Creating folder',
			'ntfmkfile'   : 'Creating files',
			'ntfrm'       : 'Delete files',
			'ntfcopy'     : 'Copy files',
			'ntfmove'     : 'Move files',
			'ntfprepare'  : 'Checking existing items',
			'ntfrename'   : 'Rename files',
			'ntfupload'   : 'Uploading files',
			'ntfdownload' : 'Downloading files',
			'ntfsave'     : 'Save files',
			'ntfarchive'  : 'Creating archive',
			'ntfextract'  : 'Extracting files from archive',
			'ntfsearch'   : 'Searching files',
			'ntfresize'   : 'Resizing images',
			'ntfsmth'     : 'Doing something',
			'ntfloadimg'  : 'Loading image',
			'ntfnetmount' : 'Mounting network volume', // added 18.04.2012
			'ntfnetunmount': 'Unmounting network volume', // from v2.1 added 30.04.2012
			'ntfdim'      : 'Acquiring image dimension', // added 20.05.2013
			'ntfreaddir'  : 'Reading folder infomation', // from v2.1 added 01.07.2013
			'ntfurl'      : 'Getting URL of link', // from v2.1 added 11.03.2014
			'ntfchmod'    : 'Changing file mode', // from v2.1 added 20.6.2015
			'ntfpreupload': 'Verifying upload file name', // from v2.1 added 31.11.2015
			'ntfzipdl'    : 'Creating a file for download', // from v2.1.7 added 23.1.2016
			'ntfparents'  : 'Getting path infomation', // from v2.1.17 added 2.11.2016
			'ntfchunkmerge': 'Processing the uploaded file', // from v2.1.17 added 2.11.2016
			'ntftrash'    : 'Doing throw in the trash', // from v2.1.24 added 2.5.2017
			'ntfrestore'  : 'Doing restore from tha trash', // from v2.1.24 added 3.5.2017
			'ntfchkdir'   : 'Checking destination folder', // from v2.1.24 added 3.5.2017

			/*********************************** volumes *********************************/
			'volume_Trash' : 'Trash', //from v2.1.24 added 29.4.2017

			/************************************ dates **********************************/
			'dateUnknown' : 'unknown',
			'Today'       : 'Today',
			'Yesterday'   : 'Yesterday',
			'msJan'       : 'Jan',
			'msFeb'       : 'Feb',
			'msMar'       : 'Mar',
			'msApr'       : 'Apr',
			'msMay'       : 'May',
			'msJun'       : 'Jun',
			'msJul'       : 'Jul',
			'msAug'       : 'Aug',
			'msSep'       : 'Sep',
			'msOct'       : 'Oct',
			'msNov'       : 'Nov',
			'msDec'       : 'Dec',
			'January'     : 'January',
			'February'    : 'February',
			'March'       : 'March',
			'April'       : 'April',
			'May'         : 'May',
			'June'        : 'June',
			'July'        : 'July',
			'August'      : 'August',
			'September'   : 'September',
			'October'     : 'October',
			'November'    : 'November',
			'December'    : 'December',
			'Sunday'      : 'Sunday',
			'Monday'      : 'Monday',
			'Tuesday'     : 'Tuesday',
			'Wednesday'   : 'Wednesday',
			'Thursday'    : 'Thursday',
			'Friday'      : 'Friday',
			'Saturday'    : 'Saturday',
			'Sun'         : 'Sun',
			'Mon'         : 'Mon',
			'Tue'         : 'Tue',
			'Wed'         : 'Wed',
			'Thu'         : 'Thu',
			'Fri'         : 'Fri',
			'Sat'         : 'Sat',

			/******************************** sort variants ********************************/
			'sortname'          : 'by name',
			'sortkind'          : 'by kind',
			'sortsize'          : 'by size',
			'sortdate'          : 'by date',
			'sortFoldersFirst'  : 'Folders first',
			'sortperm'          : 'by permission', // from v2.1.13 added 13.06.2016
			'sortmode'          : 'by mode',       // from v2.1.13 added 13.06.2016
			'sortowner'         : 'by owner',      // from v2.1.13 added 13.06.2016
			'sortgroup'         : 'by group',      // from v2.1.13 added 13.06.2016
			'sortAlsoTreeview'  : 'Also Treeview',  // from v2.1.15 added 01.08.2016

			/********************************** new items **********************************/
			'untitled file.txt' : 'NewFile.txt', // added 10.11.2015
			'untitled folder'   : 'NewFolder',   // added 10.11.2015
			'Archive'           : 'NewArchive',  // from v2.1 added 10.11.2015

			/********************************** messages **********************************/
			'confirmReq'      : 'Confirmation required',
			'confirmRm'       : 'Are you sure you want to permanently remove items?<br/>This cannot be undone!',
			'confirmRepl'     : 'Replace old item with new one?',
			'confirmRest'     : 'Replace existing item with the item in trash?', // fromv2.1.24 added 5.5.2017
			'confirmConvUTF8' : 'Not in UTF-8<br/>Convert to UTF-8?<br/>Contents become UTF-8 by saving after conversion.', // from v2.1 added 08.04.2014
			'confirmNonUTF8'  : 'Character encoding of this file couldn\'t be detected. It need to temporarily convert to UTF-8 for editting.<br/>Please select character encoding of this file.', // from v2.1.19 added 28.11.2016
			'confirmNotSave'  : 'It has been modified.<br/>Losing work if you do not save changes.', // from v2.1 added 15.7.2015
			'confirmTrash'    : 'Are you sure you want to move items to trash bin?', //from v2.1.24 added 29.4.2017
			'apllyAll'        : 'Apply to all',
			'name'            : 'Name',
			'size'            : 'Size',
			'perms'           : 'Permissions',
			'modify'          : 'Modified',
			'kind'            : 'Kind',
			'read'            : 'read',
			'write'           : 'write',
			'noaccess'        : 'no access',
			'and'             : 'and',
			'unknown'         : 'unknown',
			'selectall'       : 'Select all files',
			'selectfiles'     : 'Select file(s)',
			'selectffile'     : 'Select first file',
			'selectlfile'     : 'Select last file',
			'viewlist'        : 'List view',
			'viewicons'       : 'Icons view',
			'places'          : 'Places',
			'calc'            : 'Calculate',
			'path'            : 'Path',
			'aliasfor'        : 'Alias for',
			'locked'          : 'Locked',
			'dim'             : 'Dimensions',
			'files'           : 'Files',
			'folders'         : 'Folders',
			'items'           : 'Items',
			'yes'             : 'yes',
			'no'              : 'no',
			'link'            : 'Link',
			'searcresult'     : 'Search results',
			'selected'        : 'selected items',
			'about'           : 'About',
			'shortcuts'       : 'Shortcuts',
			'help'            : 'Help',
			'webfm'           : 'Web file manager',
			'ver'             : 'Version',
			'protocolver'     : 'protocol version',
			'homepage'        : 'Project home',
			'docs'            : 'Documentation',
			'github'          : 'Fork us on Github',
			'twitter'         : 'Follow us on twitter',
			'facebook'        : 'Join us on facebook',
			'team'            : 'Team',
			'chiefdev'        : 'chief developer',
			'developer'       : 'developer',
			'contributor'     : 'contributor',
			'maintainer'      : 'maintainer',
			'translator'      : 'translator',
			'icons'           : 'Icons',
			'dontforget'      : 'and don\'t forget to take your towel',
			'shortcutsof'     : 'Shortcuts disabled',
			'dropFiles'       : 'Drop files here',
			'or'              : 'or',
			'selectForUpload' : 'Select files',
			'moveFiles'       : 'Move items',
			'copyFiles'       : 'Copy items',
			'restoreFiles'    : 'Restore items', // from v2.1.24 added 5.5.2017
			'rmFromPlaces'    : 'Remove from places',
			'aspectRatio'     : 'Aspect ratio',
			'scale'           : 'Scale',
			'width'           : 'Width',
			'height'          : 'Height',
			'resize'          : 'Resize',
			'crop'            : 'Crop',
			'rotate'          : 'Rotate',
			'rotate-cw'       : 'Rotate 90 degrees CW',
			'rotate-ccw'      : 'Rotate 90 degrees CCW',
			'degree'          : '°',
			'netMountDialogTitle' : 'Mount network volume', // added 18.04.2012
			'protocol'            : 'Protocol', // added 18.04.2012
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
			'mode'            : 'Mode', // from v2.1 added 20.6.2015
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
			'language'        : 'Language setting', // from v2.1.26 added 28.6.2017
			'clearBrowserData': 'Initialize the settings saved in this browser', // from v2.1.26 added 28.6.2017

			/********************************** mimetypes **********************************/
			'kindUnknown'     : 'Unknown',
			'kindRoot'        : 'Volume Root', // from v2.1.16 added 16.10.2016
			'kindFolder'      : 'Folder',
			'kindAlias'       : 'Alias',
			'kindAliasBroken' : 'Broken alias',
			// applications
			'kindApp'         : 'Application',
			'kindPostscript'  : 'Postscript document',
			'kindMsOffice'    : 'Microsoft Office document',
			'kindMsWord'      : 'Microsoft Word document',
			'kindMsExcel'     : 'Microsoft Excel document',
			'kindMsPP'        : 'Microsoft Powerpoint presentation',
			'kindOO'          : 'Open Office document',
			'kindAppFlash'    : 'Flash application',
			'kindPDF'         : 'Portable Document Format (PDF)',
			'kindTorrent'     : 'Bittorrent file',
			'kind7z'          : '7z archive',
			'kindTAR'         : 'TAR archive',
			'kindGZIP'        : 'GZIP archive',
			'kindBZIP'        : 'BZIP archive',
			'kindXZ'          : 'XZ archive',
			'kindZIP'         : 'ZIP archive',
			'kindRAR'         : 'RAR archive',
			'kindJAR'         : 'Java JAR file',
			'kindTTF'         : 'True Type font',
			'kindOTF'         : 'Open Type font',
			'kindRPM'         : 'RPM package',
			// texts
			'kindText'        : 'Text document',
			'kindTextPlain'   : 'Plain text',
			'kindPHP'         : 'PHP source',
			'kindCSS'         : 'Cascading style sheet',
			'kindHTML'        : 'HTML document',
			'kindJS'          : 'Javascript source',
			'kindRTF'         : 'Rich Text Format',
			'kindC'           : 'C source',
			'kindCHeader'     : 'C header source',
			'kindCPP'         : 'C++ source',
			'kindCPPHeader'   : 'C++ header source',
			'kindShell'       : 'Unix shell script',
			'kindPython'      : 'Python source',
			'kindJava'        : 'Java source',
			'kindRuby'        : 'Ruby source',
			'kindPerl'        : 'Perl script',
			'kindSQL'         : 'SQL source',
			'kindXML'         : 'XML document',
			'kindAWK'         : 'AWK source',
			'kindCSV'         : 'Comma separated values',
			'kindDOCBOOK'     : 'Docbook XML document',
			'kindMarkdown'    : 'Markdown text', // added 20.7.2015
			// images
			'kindImage'       : 'Image',
			'kindBMP'         : 'BMP image',
			'kindJPEG'        : 'JPEG image',
			'kindGIF'         : 'GIF Image',
			'kindPNG'         : 'PNG Image',
			'kindTIFF'        : 'TIFF image',
			'kindTGA'         : 'TGA image',
			'kindPSD'         : 'Adobe Photoshop image',
			'kindXBITMAP'     : 'X bitmap image',
			'kindPXM'         : 'Pixelmator image',
			// media
			'kindAudio'       : 'Audio media',
			'kindAudioMPEG'   : 'MPEG audio',
			'kindAudioMPEG4'  : 'MPEG-4 audio',
			'kindAudioMIDI'   : 'MIDI audio',
			'kindAudioOGG'    : 'Ogg Vorbis audio',
			'kindAudioWAV'    : 'WAV audio',
			'AudioPlaylist'   : 'MP3 playlist',
			'kindVideo'       : 'Video media',
			'kindVideoDV'     : 'DV movie',
			'kindVideoMPEG'   : 'MPEG movie',
			'kindVideoMPEG4'  : 'MPEG-4 movie',
			'kindVideoAVI'    : 'AVI movie',
			'kindVideoMOV'    : 'Quick Time movie',
			'kindVideoWM'     : 'Windows Media movie',
			'kindVideoFlash'  : 'Flash movie',
			'kindVideoMKV'    : 'Matroska movie',
			'kindVideoOGG'    : 'Ogg movie'
		}
	};
}));

