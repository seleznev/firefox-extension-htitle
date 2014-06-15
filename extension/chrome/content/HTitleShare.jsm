/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* Module for sharing variables between HTitle.js, HTitleTools.jsm
 * and PrefPageObserver.jsm */

"use strict";

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

var EXPORTED_SYMBOLS = ["HTitleShare"];

var HTitleShare = {
    debug: false,
    defaultMethodFailed: false,
    gtkVersion: 2,
}
