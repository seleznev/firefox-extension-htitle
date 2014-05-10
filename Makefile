# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

XPI = "firefox-extension-htitle-lite.xpi"

all: xpi

xpi:
	@echo Create $(XPI)
	@cd "extension/"; \
	zip -FS -r "../$(XPI)" *; \
	cd ..

.PHONY : clean xpi

clean:
	@echo Remove $(XPI)
	@rm -f $(XPI)
