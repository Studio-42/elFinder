# build relese
# author: Troex Nevelin <troex@fury.scancode.ru>

Q=   @
CAT= cat
RM=  rm
CP=  cp
SRC= .
DST= ..
CSS=  ${DST}/css
JS=   ${DST}/js
I18N= ${DST}/js/i18n
CONN= ${DST}/connectors
IMG=  ${DST}/images

# used as ${COMPRESSOR} OUT IN
COMPRESSOR=    java -jar ../../yuicompressor-2.4.2/build/yuicompressor-2.4.2.jar \
					--charset utf8 -o

PHONY:     help
all:       elrte elfinder elrtefinder
clean:     clean-elrte clean-elfinder clean-elrtefinder
install:   elrte-install elfinder-install elrtefinder-install
uninstall: ellib-uninstall elrte-uninstall elfinder-uninstall elrtefinder-uninstall \
		     connectors-uninstall
distclean: uninstall clean

help:
	@echo 'Makefile for release build automation'
	@echo ' Packages:'
	@echo '   elrte         - elRTE WYSIWYG html editor'
	@echo '   elfinder      - elFinder file manager for web'
	@echo '   elrtefinder   - bundled elRTE and elFinder in one pack'
	@echo ''
	@echo ' MAKE targets:'
	@echo '   all           - build all packages'
	@echo '   help          - show this message'
	@echo '   install       - install all packages, will auto build'
	@echo '   uninstall     - remove all generated files from DST (${DST})'
	@echo '   clean         - remove generated files from SRC (${SRC})'
	@echo '   distclean     - preform uninstall and clean'
	@echo ''
	@echo ' Individual package targets are possible. To build single package replace PACKAGE'
	@echo ' with name from "Packages" section:'
	@echo '   PACKAGE'
	@echo '   PACKAGE-install'
	@echo '   PACKAGE-unstall'
	@echo '   clean-PACKAGE'





# define objects

# elLib
ellib_img_obj=    ${SRC}/ellib/images/eldirtree.png \
						${SRC}/ellib/images/loading.gif
ellib_img_obj_dst=${IMG}/eldirtree.png \
						${IMG}/loading.gif


# elRTE
elrte_css=        elrte.full.css
elrte_css_obj=    ${SRC}/ellib/css/elcommon.css \
						${SRC}/ellib/css/elcolorpicker.css \
						${SRC}/ellib/css/elcontextmenu.css \
						${SRC}/ellib/css/eldialogform.css \
						${SRC}/ellib/css/eldirtree.css \
						${SRC}/ellib/css/elpaddinginput.css \
						${SRC}/ellib/css/elselect.css \
						${SRC}/elrte/css/elrte.css

elrte_js=         elrte.full.js
elrte_js_min=     elrte.min.js
elrte_js_obj=     ${SRC}/ellib/js/elcookie.js \
						${SRC}/ellib/js/eli18n.js \
						${SRC}/ellib/js/eldialogform.js \
						${SRC}/ellib/js/jquery.elcolorpicker.js \
						${SRC}/ellib/js/jquery.elborderselect.js \
						${SRC}/ellib/js/jquery.elcontextmenu.js \
						${SRC}/ellib/js/jquery.eldirtree.js \
						${SRC}/ellib/js/jquery.elpaddinginput.js \
						${SRC}/ellib/js/jquery.elselect.js \
						${SRC}/elrte/js/elRTE.js \
						${SRC}/elrte/js/elRTE.*.js \
						${SRC}/elrte/js/ui/*.js


# elFinder
elfinder_css=     elfinder.full.css
elfinder_css_obj= ${SRC}/ellib/css/elcommon.css \
						${SRC}/ellib/css/eldialogform.css \
						${SRC}/ellib/css/eldirtree.css \
						${SRC}/ellib/css/elcontextmenu.css \
						${SRC}/elfinder/css/elfinder.css

elfinder_js=      elfinder.full.js
elfinder_js_min=  elfinder.min.js
elfinder_js_obj=  ${SRC}/ellib/js/eli18n.js \
						${SRC}/ellib/js/elcookie.js \
						${SRC}/ellib/js/eldialogform.js \
						${SRC}/ellib/js/jquery.eldirtree.js \
						${SRC}/ellib/js/jquery.elcontextmenu.js \
						${SRC}/elfinder/js/elfinder.js


# elRTE + elFinder
elrtefin_css=     elrtefinder.full.css
elrtefin_css_obj= ${SRC}/ellib/css/elcommon.css \
						${SRC}/ellib/css/elcolorpicker.css \
						${SRC}/ellib/css/elcontextmenu.css \
						${SRC}/ellib/css/eldialogform.css \
						${SRC}/ellib/css/eldirtree.css \
						${SRC}/ellib/css/elpaddinginput.css \
						${SRC}/ellib/css/elselect.css \
						${SRC}/elfinder/css/elfinder.css \
						${SRC}/elrte/css/elrte.css

elrtefin_js=      elrtefinder.full.js
elrtefin_js_min=  elrtefinder.min.js
elrtefin_js_obj=  ${SRC}/ellib/js/elcookie.js \
						${SRC}/ellib/js/eli18n.js \
						${SRC}/ellib/js/eldialogform.js \
						${SRC}/ellib/js/jquery.elcolorpicker.js \
						${SRC}/ellib/js/jquery.elborderselect.js \
						${SRC}/ellib/js/jquery.elcontextmenu.js \
						${SRC}/ellib/js/jquery.eldirtree.js \
						${SRC}/ellib/js/jquery.elpaddinginput.js \
						${SRC}/ellib/js/jquery.elselect.js \
						${SRC}/elfinder/js/elfinder.js \
						${SRC}/elrte/js/elRTE.js \
						${SRC}/elrte/js/elRTE.*.js \
						${SRC}/elrte/js/ui/*.js


# elLib
ellib-install:
	${CP} ${ellib_img_obj} ${IMG}/

ellib-uninstall:
	${RM} -f ${ellib_img_obj_dst}


# elRTE
elrte: ${elrte_css} ${elrte_js}

elrte-install: elrte ellib-install
	${CP} ${elrte_css} ${SRC}/elrte/css/elrte-inner.css ${CSS}/
	${CP} ${elrte_js}  ${JS}/
	${CP} ${SRC}/elrte/js/i18n/elrte.??.js ${I18N}/
	${CP} ${SRC}/elrte/images/elrte-*      ${IMG}/

${elrte_css}:
	${CAT} ${elrte_css_obj} > $@

${elrte_js}:
	${CAT} ${elrte_js_obj} > $@

elrte-uninstall:
	${RM} -f ${CSS}/${elrte_css} ${CSS}/elrte-inner.css \
	         ${JS}/${elrte_js} ${JS}/${elrte_js_min} ${I18N}/elrte.??.js ${IMG}/elrte-* 

clean-elrte:
	${RM} -f ${elrte_css} ${elrte_js} ${elrte_js_min} 


# elFinder
elfinder: ${elfinder_css} ${elfinder_js}

elfinder-install: elfinder ellib-install connectors-install
	${CP} ${elfinder_css} ${CSS}/
	${CP} ${elfinder_js}  ${JS}/
	${CP} ${SRC}/elfinder/js/i18n/elfinder.??.js ${I18N}/
	${CP} ${SRC}/elfinder/images/elfinder-*      ${IMG}/

${elfinder_css}:
	${CAT} ${elfinder_css_obj} > $@

${elfinder_js}:
	${CAT} ${elfinder_js_obj} > $@

elfinder-uninstall:
	${RM} -f ${CSS}/${elfinder_css} ${JS}/${elfinder_js} ${JS}/${elfinder_js_min} \
	         ${I18N}/elfinder.??.js ${IMG}/elfinder-*

clean-elfinder:
	${RM} -f ${elfinder_css} ${elfinder_js} ${elfinder_js_min}


# elRTE + elFinder
elrtefinder: ${elrtefin_css} ${elrtefin_js}

elrtefinder-install: elrtefinder ellib-install connectors-install
	${CP} ${elrtefin_css} ${SRC}/elrte/css/elrte-inner.css ${CSS}/
	${CP} ${elrtefin_js}  ${JS}/
	${CP} ${SRC}/elrte/css/elrte-inner.css       ${CSS}/
	${CP} ${SRC}/elrte/js/i18n/elrte.??.js       ${I18N}/
	${CP} ${SRC}/elfinder/js/i18n/elfinder.??.js ${I18N}/

${elrtefin_css}:
	${CAT} ${elrtefin_css_obj} > $@

${elrtefin_js}:
	${CAT} ${elrtefin_js_obj} > $@

elrtefinder-uninstall:
	${RM} -f ${CSS}/${elrtefin_css} ${CSS}/elrte-inner.css \
	         ${JS}/${elrtefin_js} ${JS}/${elrtefin_js_min} \
	         ${I18N}/elfinder.??.js ${I18N}/elrte.??.js

clean-elrtefinder:
	${RM} -f ${elrtefin_css} ${elrtefin_js} ${elrtefin_js_min} 


# connectors
connectors-install:
	${CP} -R ${SRC}/elfinder/connectors/* ${CONN}/
	${CP} ${CONN}/php/connector.php ${CONN}/php/connector.php.tmp
	${CAT} ${CONN}/php/connector.php.tmp \
	     | sed -e s_/src/elfinder/connectors/php_/connectors/php_ \
	     > ${CONN}/php/connector.php
	${RM} ${CONN}/php/connector.php.tmp

connectors-uninstall:
	${RM} -rf ${CONN}/*


# compressor

elrte-compress:
	${COMPRESSOR} ${elrte_js_min} ${elrte_js}

elfinder-compress:
	${COMPRESSOR} ${elfinder_js_min} ${elfinder_js}

elrtefinder-compress:
	${COMPRESSOR} ${elrtefin_js_min} ${elrtefin_js}

elrte-compress-install:
	${CP} ${SRC}/${elrte_js_min} ${JS}/

elfinder-compress-install:
	${CP} ${SRC}/${elfinder_js_min} ${JS}/

elrtefinder-compress-install:
	${CP} ${SRC}/${elrtefin_js_min} ${JS}/


ifdef COMPRESSOR
elrte:                elrte-compress
elfinder:             elfinder-compress
elrtefinder:          elrtefinder-compress

elrte-install:        elrte-compress-install
elfinder-install:     elfinder-compress-install
elrtefinder-install:  elrtefinder-compress-install
endif

