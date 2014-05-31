/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://gre/modules/ctypes.jsm");
Cu.import("chrome://htitle/content/X11.jsm");

var EXPORTED_SYMBOLS = ["Gdk", "GdkX11"];

function init() {
    var Gdk = {};
    var GdkX11 = {};
    try {
        Gdk.library = ctypes.open("libgdk-x11-2.0.so");
    } catch(e) {
        return [null, null];
    }

    /* ::::: Constants ::::: */

    Gdk.GdkWMDecoration = ctypes.int; // enum
    Gdk.GDK_DECOR_ALL      = 1 << 0;
    Gdk.GDK_DECOR_BORDER   = 1 << 1;
    Gdk.GDK_DECOR_RESIZEH  = 1 << 2;
    Gdk.GDK_DECOR_TITLE    = 1 << 3;
    Gdk.GDK_DECOR_MENU     = 1 << 4;
    Gdk.GDK_DECOR_MINIMIZE = 1 << 5;
    Gdk.GDK_DECOR_MAXIMIZE = 1 << 6;

    /* ::::: Types ::::: */

    Gdk.GdkWindow = ctypes.StructType("GdkWindow");
    Gdk.GdkDisplay = ctypes.StructType("GdkDisplay");
    Gdk.GdkDrawable = ctypes.StructType("GdkDrawable");

    Gdk.gchar = ctypes.char;

    /* ::::: Functions ::::: */

    Gdk.Window = {};
    Gdk.Display = {};
    GdkX11.X11Display = {};

    Gdk.Window.get_toplevel = Gdk.library.declare("gdk_window_get_toplevel",
                                                  ctypes.default_abi,
                                                  Gdk.GdkWindow.ptr,
                                                  Gdk.GdkWindow.ptr);

    Gdk.Window.set_decorations = Gdk.library.declare("gdk_window_set_decorations",
                                                     ctypes.default_abi,
                                                     ctypes.void_t,
                                                     Gdk.GdkWindow.ptr,
                                                     Gdk.GdkWMDecoration);

    Gdk.Window.lower = Gdk.library.declare("gdk_window_lower",
                                           ctypes.default_abi,
                                           ctypes.void_t,
                                           Gdk.GdkWindow.ptr);

    /*
    Gdk.Window.hide = Gdk.library.declare("gdk_window_hide",
                                          ctypes.default_abi,
                                          ctypes.void_t,
                                          Gdk.GdkWindow.ptr);

    Gdk.Window.show = Gdk.library.declare("gdk_window_show",
                                          ctypes.default_abi,
                                          ctypes.void_t,
                                          Gdk.GdkWindow.ptr);
    */

    Gdk.Display.get_default = Gdk.library.declare("gdk_display_get_default",
                                                  ctypes.default_abi,
                                                  Gdk.GdkDisplay.ptr);

    Gdk.gdk_x11_drawable_get_xid = Gdk.library.declare("gdk_x11_drawable_get_xid", // FIXME
                                                       ctypes.default_abi,
                                                       X11.XID,
                                                       Gdk.GdkDrawable.ptr);

    GdkX11.X11Display.get_xdisplay = Gdk.library.declare("gdk_x11_display_get_xdisplay",
                                                         ctypes.default_abi,
                                                         X11.Display.ptr,
                                                         Gdk.GdkDisplay.ptr);

    GdkX11.x11_get_xatom_by_name_for_display = Gdk.library.declare("gdk_x11_get_xatom_by_name_for_display",
                                                                    ctypes.default_abi,
                                                                    X11.Atom,
                                                                    Gdk.GdkDisplay.ptr,
                                                                    Gdk.gchar.ptr);
    return [Gdk, GdkX11];
}

var [Gdk, GdkX11] = init();

