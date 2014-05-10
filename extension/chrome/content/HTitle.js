/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var HTitle = {
    init: function() {
        var base_window = window.QueryInterface(Ci.nsIInterfaceRequestor)
                                .getInterface(Ci.nsIWebNavigation)
                                .QueryInterface(Ci.nsIDocShellTreeItem)
                                .treeOwner
                                .QueryInterface(Ci.nsIInterfaceRequestor)
                                .getInterface(Ci.nsIXULWindow)
                                .docShell
                                .QueryInterface(Ci.nsIBaseWindow);

        try {
            var hw = Cc["@seleznev.github.com/htitle-window;1"]
                       .createInstance(Ci.nsIHTitleWindow);
            hw.setHideTitlebarWhenMaximized(base_window);
        } catch(e) {
            return;
        }

        var mw = document.getElementById("main-window");
        mw.setAttribute("hidetitlebarwhenmaximized", true); // Legacy
        mw.setAttribute("htitlemode", "auto"); // Legacy
    },
}

window.addEventListener("load", HTitle.init);
