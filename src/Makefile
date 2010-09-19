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
COMPRESSOR=    java -jar ../../../yuicompressor-2.4.2/build/yuicompressor-2.4.2.jar \
					--charset utf8 -o

PHONY:     help
all:       elfinder elfinder-install
clean:     clean-elfinder
install:   elfinder-install
uninstall: elfinder-uninstall connectors-uninstall
distclean: uninstall clean

help:
	@echo 'Makefile for release build automation'
	@echo ' Packages:'
	@echo '   elfinder      - elFinder file manager for web'
	@echo ''
	@echo ' MAKE targets:'
	@echo '   all           - build and install all packages'
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

# elFinder
elfinder_css=		elfinder.css
elfinder_css_obj=	${SRC}/css/elfinder.css

elfinder_js=		elfinder.full.js
elfinder_js_min=	elfinder.min.js
elfinder_js_obj=	${SRC}/js/elFinder.js \
					${SRC}/js/elFinder.view.js \
					${SRC}/js/elFinder.ui.js \
					${SRC}/js/elFinder.quickLook.js \
					${SRC}/js/elFinder.eventsManager.js


# elFinder
elfinder: ${elfinder_css} ${elfinder_js}

elfinder-install: elfinder connectors-install
	${CP} ${elfinder_css} ${CSS}/
	${CP} ${elfinder_js}  ${JS}/
	${CP} ${SRC}/js/i18n/elfinder.??.js ${I18N}/
	${CP} ${SRC}/images/*      ${IMG}/

${elfinder_css}:
	${CAT} ${elfinder_css_obj} > $@

${elfinder_js}:
	${CAT} ${elfinder_js_obj} > $@

elfinder-uninstall:
	${RM} -f ${CSS}/${elfinder_css} ${JS}/${elfinder_js} ${JS}/${elfinder_js_min} \
	         ${I18N}/elfinder.??.js ${IMG}/*

clean-elfinder:
	${RM} -f ${elfinder_css} ${elfinder_js} ${elfinder_js_min}


# connectors
connectors-install:
	${CP} -R ${SRC}/connectors/* ${CONN}/
	${CP} ${CONN}/php/connector.php ${CONN}/php/connector.php.tmp
	${CAT} ${CONN}/php/connector.php.tmp \
		| sed -e s_../../../files_../../files_ \
		> ${CONN}/php/connector.php
	${RM} ${CONN}/php/connector.php.tmp


connectors-uninstall:
	${RM} -rf ${CONN}/*


# compressor

elfinder-compress:
	${COMPRESSOR} ${elfinder_js_min} ${elfinder_js}

elfinder-compress-install:
	${CP} ${SRC}/${elfinder_js_min} ${JS}/

ifdef COMPRESSOR
elfinder:             elfinder-compress
elfinder-install:     elfinder-compress-install
endif

