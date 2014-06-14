/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://gre/modules/ctypes.jsm");

var EXPORTED_SYMBOLS = ["X11"];

function X11() {
    this.library = null;
    try {
        this.library = ctypes.open("libX11.so.6");
    } catch(e) {
        // libX11.so.6 isn't available, try libX11.so instead
        try {
            X11.library = ctypes.open("libX11.so");
        } catch(e) {
            throw "libX11.so isn't available";
        }
    }

    /* ::::: Constants ::::: */

    this.XA_CARDINAL = 6;
    this.PropModeReplace = 0;

    /* ::::: Types ::::: */

    this.Display = ctypes.StructType("Display");
    this.Atom = ctypes.unsigned_long;
    this.Window = ctypes.unsigned_long;
    this.XID = ctypes.unsigned_long;

    /* ::::: Functions ::::: */

    this.XChangeProperty = this.library.declare("XChangeProperty",
                                                ctypes.default_abi,
                                                ctypes.void_t,
                                                this.Display.ptr,
                                                this.Window,
                                                this.Atom,
                                                this.Atom,
                                                ctypes.int,
                                                ctypes.int,
                                                ctypes.uint32_t.ptr,
                                                ctypes.int);

    this.XDeleteProperty = this.library.declare("XDeleteProperty",
                                                ctypes.default_abi,
                                                ctypes.void_t,
                                                this.Display.ptr,
                                                this.Window,
                                                this.Atom);

    this.close = function() {
        this.library.close();
    }
}
