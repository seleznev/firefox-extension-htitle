/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://gre/modules/ctypes.jsm");

var EXPORTED_SYMBOLS = ["Gdk2"];

function Gdk2(X11) {
    try {
        this.library = ctypes.open("libgdk-x11-2.0.so.0");
    } catch(e) {
        // libgdk-x11-2.0.so.0 isn't available, try libgdk-x11-2.0.so instead
        try {
            this.library = ctypes.open("libgdk-x11-2.0.so");
        } catch(e) {
            throw "libgdk-x11-2.0.so isn't available";
        }
    }

    /* ::::: Constants ::::: */

    this.GdkWMDecoration = ctypes.int; // enum
    this.GDK_DECOR_ALL      = 1 << 0;
    this.GDK_DECOR_BORDER   = 1 << 1;
    this.GDK_DECOR_RESIZEH  = 1 << 2;
    this.GDK_DECOR_TITLE    = 1 << 3;
    this.GDK_DECOR_MENU     = 1 << 4;
    this.GDK_DECOR_MINIMIZE = 1 << 5;
    this.GDK_DECOR_MAXIMIZE = 1 << 6;

    /* ::::: Types ::::: */

    this.GdkWindow = ctypes.StructType("GdkWindow");
    this.GdkDisplay = ctypes.StructType("GdkDisplay");
    this.GdkDrawable = ctypes.StructType("GdkDrawable");

    this.gchar = ctypes.char;

    /* ::::: Functions ::::: */

    this.Window = {};
    this.Display = {};
    if (X11) {
        this.X11Display = {};
    }

    this.Window.get_toplevel = this.library.declare("gdk_window_get_toplevel",
                                                    ctypes.default_abi,
                                                    this.GdkWindow.ptr,
                                                    this.GdkWindow.ptr);

    this.Window.set_decorations = this.library.declare("gdk_window_set_decorations",
                                                       ctypes.default_abi,
                                                       ctypes.void_t,
                                                       this.GdkWindow.ptr,
                                                       this.GdkWMDecoration);

    this.Window.lower = this.library.declare("gdk_window_lower",
                                             ctypes.default_abi,
                                             ctypes.void_t,
                                             this.GdkWindow.ptr);

    /*
    this.Window.hide = this.library.declare("gdk_window_hide",
                                            ctypes.default_abi,
                                            ctypes.void_t,
                                            this.GdkWindow.ptr);

    this.Window.show = this.library.declare("gdk_window_show",
                                            ctypes.default_abi,
                                            ctypes.void_t,
                                            this.GdkWindow.ptr);
    */

    this.Display.get_default = this.library.declare("gdk_display_get_default",
                                                    ctypes.default_abi,
                                                    this.GdkDisplay.ptr);

    if (X11) {
        this.gdk_x11_drawable_get_xid = this.library.declare("gdk_x11_drawable_get_xid", // FIXME
                                                             ctypes.default_abi,
                                                             X11.XID,
                                                             this.GdkDrawable.ptr);

        this.X11Display.get_xdisplay = this.library.declare("gdk_x11_display_get_xdisplay",
                                                            ctypes.default_abi,
                                                            X11.Display.ptr,
                                                            this.GdkDisplay.ptr);

        this.x11_get_xatom_by_name_for_display = this.library.declare("gdk_x11_get_xatom_by_name_for_display",
                                                                      ctypes.default_abi,
                                                                      X11.Atom,
                                                                      this.GdkDisplay.ptr,
                                                                      this.gchar.ptr);
    }

    this.close = function() {
        this.library.close();
    }
}
