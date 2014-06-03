/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://gre/modules/ctypes.jsm");

var EXPORTED_SYMBOLS = ["X11"];

function init() {
    var X11 = {};
    try {
        X11.library = ctypes.open("libX11.so.6");
    } catch(e) {
        // libX11.so.6 isn't available, try libX11.so instead
        try {
            X11.library = ctypes.open("libX11.so");
        } catch(e) {
            return null;
        }
    }

    /* ::::: Constants ::::: */

    X11.XA_CARDINAL = 6;
    X11.PropModeReplace = 0;

    /* ::::: Types ::::: */

    X11.Display = ctypes.StructType("Display");
    X11.Atom = ctypes.unsigned_long;
    X11.Window = ctypes.unsigned_long;
    X11.XID = ctypes.unsigned_long;

    /* ::::: Functions ::::: */

    X11.XChangeProperty = X11.library.declare("XChangeProperty",
                                              ctypes.default_abi,
                                              ctypes.void_t,
                                              X11.Display.ptr,
                                              X11.Window,
                                              X11.Atom,
                                              X11.Atom,
                                              ctypes.int,
                                              ctypes.int,
                                              ctypes.uint32_t.ptr,
                                              ctypes.int);

    X11.XDeleteProperty = X11.library.declare("XDeleteProperty",
                                              ctypes.default_abi,
                                              ctypes.void_t,
                                              X11.Display.ptr,
                                              X11.Window,
                                              X11.Atom);
    return X11;
}

var X11 = init();
