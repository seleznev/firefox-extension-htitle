all: xpi

xpi:
	cd "extension"; \
	zip -FS -r "../firefox-extension-htitle.xpi" *; \
	cd ..

clean:
	rm -f "firefox-extension-htitle.xpi"
