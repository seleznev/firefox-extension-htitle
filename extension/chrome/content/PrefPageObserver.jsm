/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const HTITLE_ID = "{c6448328-31f7-4b12-a2e0-5c39d0290307}";

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://gre/modules/Services.jsm");

Cu.import("chrome://htitle/content/HTitleShare.jsm");
Cu.import("chrome://htitle/content/Libs.jsm");

var EXPORTED_SYMBOLS = ["PrefPageObserver"];

var PrefPageObserver = {
    register: function() {
        Services.obs.addObserver(this, "addon-options-displayed", false);
    },

    unregister: function() {
        Services.obs.removeObserver(this, "addon-options-displayed");
    },

    observe: function(subject, topic, data) {
        if (topic == "addon-options-displayed" && data == HTITLE_ID) {
            if (!HTitleShare.defaultMethodFailed) {
                try {
                    var X11 = Libs.open("X11");
                    var Gdk = Libs.open("Gdk", HTitleShare.gtkVersion, X11);
                    Libs.close(Gdk);
                    Libs.close(X11);
                } catch (e) {
                    HTitleShare.defaultMethodFailed = true;
                }
            }

            if (HTitleShare.defaultMethodFailed) {
                var legacy_mode = subject.getElementById("legacy-mode");
                legacy_mode.setAttribute("disabled", "true");
                legacy_mode.setAttribute("selected", "true");

                let bundle = Cc["@mozilla.org/intl/stringbundle;1"]
                               .getService(Ci.nsIStringBundleService)
                               .createBundle("chrome://htitle/locale/options.properties");

                legacy_mode.setAttribute("desc", bundle.GetStringFromName("enableLegacyMethod.description"));

                var hide_mode_auto = subject.getElementById("hide-mode-auto");
                hide_mode_auto.setAttribute("selected", "true");

                var hide_mode_always = subject.getElementById("hide-mode-always");
                hide_mode_always.setAttribute("disabled", "true");
            }
        }
    }
}

PrefPageObserver.register();
