# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

XPI = "firefox-extension-htitle.xpi"

DIRS = $(shell find extension/ -type d)
DIRS := $(filter-out extension/chrome/skin/shared, $(DIRS))

INCLUDES = $(shell find extension/ -type f -name '*.inc.css')

FILES = $(shell find extension/ -type f ! -name '*.inc.css')

TARGET_DIRS = $(patsubst extension/%, .build/%, $(DIRS))
TARGET_FILES = $(patsubst extension/%, .build/%, $(FILES))

all: prepare $(TARGET_DIRS) $(TARGET_FILES) $(XPI)

prepare:
	@mkdir -p ".build/"

$(TARGET_DIRS):
	@echo Create directory "$@"
	@mkdir -p "$@"

.build/%.css: extension/%.css $(INCLUDES)
	@echo Convert "$<" to "$@"
	@python2 preprocessor.py --marker="%" \
		--output="$@" "$<"

.build/%: extension/%
	@echo Copy "$<" to "$@"
	@cp "$<" "$@"

$(XPI):
	@echo Create $(XPI)
	@cd ".build/"; \
	zip -FS -r "../$(XPI)" *; \
	cd ..

.PHONY : clean

clean:
	@echo Remove $(XPI)
	@rm -f $(XPI)
	@echo Remove .build/
	@rm -rf ".build"
	@echo Remove *.pyc
	@rm -f *.pyc
