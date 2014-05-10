XULRUNNER_SDK_PATH = /home/alex/.bin/xulrunner-sdk-30.0b3
XULRUNNER_SDK_VERSION = 30
PLATFORM = $(shell uname -m)

#nsHTitleWindow-fx30-x86_64.so
LIB = nsHTitleWindow-fx$(XULRUNNER_SDK_VERSION)-$(PLATFORM).so

CXX ?= gcc
deps = gdk-2.0 gdk-pixbuf-2.0 atk

XPIDLSRCS = nsIHTitleWindow.idl

CPPSRCS = nsHTitleWindow.cpp \
          nsHTitleWindowModule.cpp

CPPFLAGS += -fno-rtti       \
            -fno-exceptions \
            -fshort-wchar   \
            -shared         \
            -fPIC           \
            -Wl,-z,defs     \
            -std=c++11      \
            $(shell pkg-config --cflags $(deps))

XULRUNNER_CONFIG_INCLUDE = -include mozilla-config.h

XULRUNNER_DEFINES = -DMOZILLA_STRICT_API

XULRUNNER_INCLUDES = -I$(XULRUNNER_SDK_PATH)               \
                     -I$(XULRUNNER_SDK_PATH)/idl           \
                     -I$(XULRUNNER_SDK_PATH)/include       \
                     -I$(XULRUNNER_SDK_PATH)/include/nspr/

XULRUNNER_LDFLAGS = -L$(XULRUNNER_SDK_PATH)/lib \
                    -lxpcomglue_s               \
                    -shared

%.h: %.idl
	@python2 $(XULRUNNER_SDK_PATH)/sdk/bin/header.py -I $(XULRUNNER_SDK_PATH)/idl -o $@ $<

%.xpt: %.idl
	@python2 $(XULRUNNER_SDK_PATH)/sdk/bin/typelib.py -I $(XULRUNNER_SDK_PATH)/idl -o $@ $<
	

%.o: %.cpp Makefile
	$(CXX) -c $(CPPFLAGS) $(CXXFLAGS) $(XULRUNNER_CONFIG_INCLUDE) $(XULRUNNER_DEFINES) $(XULRUNNER_INCLUDES) $<

$(LIB): $(XPIDLSRCS:%.idl=%.h) $(XPIDLSRCS:%.idl=%.xpt) $(CPPSRCS:%.cpp=%.o)
	$(CXX) -o $@ -Wl,-soname=$(LIB) $(CPPSRCS:%.cpp=%.o) $(XULRUNNER_LDFLAGS)

all: $(LIB)

clean:
	-rm $(LIB)
	-rm *.o

