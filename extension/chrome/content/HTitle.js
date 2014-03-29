/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Components.utils.import("chrome://htitle/content/HTitleTools.jsm");

var HTitle = {
    ENABLED: true,

    windowControlsObservers: [],

    window: null,

    currentMode: "auto",
    previousState: 0,
    previousChangeTime: 0,

    init: function() {
        HTitleTools.prefs.addObserver("", HTitle, false);

        if (HTitleTools.prefs.getBoolPref("check_gnome_shell") && HTitleTools.checkPresenceGnomeShell() != 0) {
            // Nothing doing if WM is not GNOME Shell.
            HTitle.ENABLED = false;
            return;
        }

        HTitle.window = document.getElementById(HTitleTools.isThunderbird() ? "messengerWindow" : "main-window");

        HTitle.start();

        /* Upgrade from previous (< 2.5) versions */
        if (HTitleTools.prefs.getPrefType("show_close_button") && HTitleTools.prefs.getBoolPref("show_close_button")) {
            HTitleTools.prefs.setBoolPref("show_close_button", false);
            HTitleTools.prefs.setBoolPref("show_window_controls", true);
        }

        if (HTitleTools.prefs.getBoolPref("window_controls.get_layout_by_gsettings"))
            HTitle.setWindowControlsLayoutAttribute();

        if (HTitleTools.prefs.getBoolPref("show_window_controls"))
            HTitle.showWindowControls();
    },

    setWindowControlsLayoutAttribute: function() {
        var value = ""
        for (var i in HTitleTools.windowControlsLayout) {
            if (HTitleTools.windowControlsLayout[i]) {
                value = value + (value.length ? "," : "") + i;
            }
        }
        var windowctls = document.getElementById("window-controls");
        if (windowctls) {
            windowctls.setAttribute("htitle-button-layout", value);
        }
    },

    showWindowControls: function() {
        var windowctls = document.getElementById("window-controls");
        windowctls.setAttribute("htitle", "true");

        // Appling CSS
        if (HTitle.currentMode == "always")
            HTitleTools.loadStyle("windowControlsAlways");
        else
            HTitleTools.loadStyle("windowControlsAuto");

        if (HTitleTools.isFirefox()) {
            window.addEventListener("sizemodechange", HTitle.updateWindowControlsPosition);

            var targets_map = [
                    ["TabsToolbar", "tabsontop"],
                    ["toolbar-menubar", "autohide"]
                ];
            if (HTitleTools.isAustralisUI()) {
                targets_map.push(["nav-bar", "default-tabs-position"]);
            }
            else {
                targets_map.push(["nav-bar", "collapsed"]);
            }
        }
        else {
            var targets_map = [
                    ["mail-toolbar-menubar2", "autohide"]
                ];
        }

        for (var i = 0; i < targets_map.length; i++) {
            var tempObserver = new MutationObserver(function(mutations) {
                mutations.forEach(HTitle.updateWindowControlsPosition);
            });
            tempObserver.observe(document.getElementById(targets_map[i][0]), { attributes: true, attributeFilter: [targets_map[i][1]] });
            HTitle.windowControlsObservers.push(tempObserver);
        }
        HTitleTools.log("HTitle.windowControlsObservers = " + HTitle.windowControlsObservers.length, "DEBUG");

        HTitle.updateWindowControlsPosition();
    },

    hideWindowControls: function() {
        if (HTitle.currentMode == "always")
            HTitleTools.unloadStyle("windowControlsAlways");
        else
            HTitleTools.unloadStyle("windowControlsAuto");

        var spring = document.getElementById("htitle-menubar-spring");
        if (spring)
            spring.remove();

        var windowctls = document.getElementById("window-controls");
        windowctls.removeAttribute("htitle");
        //windowctls.setAttribute("flex", "1");

        if (HTitleTools.isFirefox()) {
            window.removeEventListener("sizemodechange", HTitle.updateWindowControlsPosition);

            var navbar = document.getElementById("nav-bar");
            HTitleTools.moveWindowControlsTo(windowctls, navbar);
        }

        for (var i = 0; i < HTitle.windowControlsObservers.length; i++) {
            HTitle.windowControlsObservers[i].disconnect();
        }
        HTitle.windowControlsObservers = [];
    },

    updateWindowControlsPosition: function() {
        var windowctls = document.getElementById("window-controls");

        if (HTitleTools.isFirefox()) {
            var menubar = document.getElementById("toolbar-menubar");
            var navbar = document.getElementById("nav-bar");
            var tabsbar = document.getElementById("TabsToolbar");

            if (!windowctls || !menubar || !navbar || !tabsbar) {
                return;
            }

            if (tabsbar.getAttribute("tabsontop") === "") {
                var tabsontop = navbar.getAttribute("default-tabs-position") != "bottom";
            }
            else {
                var tabsontop = tabsbar.getAttribute("tabsontop") != "false";
            }
        }
        else {
            var menubar = document.getElementById("mail-toolbar-menubar2");
            var tabsbar = document.getElementById("tabs-toolbar");

            if (!windowctls || !menubar || !tabsbar) {
                return;
            }

            var tabsontop = true;
        }

        if (menubar.getAttribute("autohide") != "true" && window.windowState != window.STATE_FULLSCREEN) {
            // Moving to the Menu bar
            if (menubar == windowctls.parentNode)
                return;

            var need_spring = true;
            var nodes = menubar.childNodes;
            for (var i = 0; i < nodes.length; i++) {
                if (parseInt(nodes[i].getAttribute("flex"), 10) >= 1) {
                    need_spring = false;
                    break;
                }
            }

            if (need_spring) {
                var spring = document.createElement("toolbarspring");
                spring.setAttribute("id", "htitle-menubar-spring");
                spring.setAttribute("removable", HTitleTools.isAustralisUI() ? "false" : "true");
                spring.setAttribute("flex", "1");
                HTitleTools.addToCurrentset(menubar, "htitle-menubar-spring");
                menubar.appendChild(spring);
            }

            HTitleTools.moveWindowControlsTo(windowctls, menubar);
        }
        else if (tabsontop || navbar.collapsed || HTitleTools.isThunderbird()) {
            // Moving to the Tabs toolbar
            if (tabsbar == windowctls.parentNode)
                return;
            HTitleTools.moveWindowControlsTo(windowctls, tabsbar);
        }
        else {
            // Moving to the Navigation toolbar
            if (navbar == windowctls.parentNode)
                return;
            HTitleTools.moveWindowControlsTo(windowctls, navbar);
        }

        windowctls.removeAttribute("flex");
    },

    start: function() {
        var result = -2;

        if (!HTitleTools.prefs.getBoolPref("legacy_mode.enable")) {
            HTitleTools.log("Start in normal mode", "DEBUG");

            var utils = HTitleTools.checkUtilsAvailable(["bash", "xwininfo", "xprop"]);
            if (utils) {
                var wm_class = HTitleTools.getWMClass().replace(/\"/g, '\\$&');

                if (HTitleTools.prefs.getIntPref("hide_mode") == 2) {
                    var str = 'WINDOWS=""; i="0"; while [ "$WINDOWS" == "" ] && [ $i -lt 1200 ]; do sleep 0.05; WINDOWS=$(xwininfo -tree -root | grep "(' + wm_class + ')" | sed "s/[ ]*//" | grep -o "0x[0-9a-f]*"); i=$[$i+1]; done; for ID in $WINDOWS; do xprop -id $ID -f _MOTIF_WM_HINTS 32c -set _MOTIF_WM_HINTS "0x2, 0x0, 0x2, 0x0, 0x0"; done';
                }
                else {
                    var str = 'WINDOWS=""; i="0"; while [ "$WINDOWS" == "" ] && [ $i -lt 1200 ]; do sleep 0.05; WINDOWS=$(xwininfo -tree -root | grep "(' + wm_class + ')" | sed "s/[ ]*//" | grep -o "0x[0-9a-f]*"); i=$[$i+1]; done; for ID in $WINDOWS; do xprop -id $ID -f _GTK_HIDE_TITLEBAR_WHEN_MAXIMIZED 32c -set _GTK_HIDE_TITLEBAR_WHEN_MAXIMIZED 1; done';
                }

                var args = ["-c", str];
                result = HTitleTools.run(utils.bash, args, false);
            }
            else {
                result = -1;
            }
        }

        if (result == 0) {
            HTitle.window.setAttribute("hidechrome", false);
            if (HTitleTools.prefs.getIntPref("hide_mode") == 2)
                HTitle.currentMode = "always";
            else {
                HTitle.currentMode = "auto";
                HTitle.window.setAttribute("hidetitlebarwhenmaximized", true);
            }
        }
        else {
            if (result == -1 && !HTitleTools.defaultModeFailed) {
                HTitleTools.defaultModeFailed = true;
                HTitleTools.prefs.setBoolPref("legacy_mode.enable", true);
            }
            HTitleTools.log("Start in legacy mode", "DEBUG");
            HTitleTools.log("TIMEOUT_CHECK = " + HTitleTools.timeoutCheck + "; TIMEOUT_BETWEEN_CHANGES = " + HTitleTools.timeoutBetweenChanges, "DEBUG");
            window.addEventListener("sizemodechange", HTitle.onWindowStateChange);
            HTitle.currentMode = "legacy";

            setTimeout(function(){HTitle.checkWindowState();}, HTitleTools.timeoutCheck);
        }
        HTitle.window.setAttribute("htitlemode", HTitle.currentMode);
    },

    stop: function() {
        if (HTitle.currentMode != "legacy") {
            var utils = HTitleTools.checkUtilsAvailable(["bash"]);
            if (utils) {
                var wm_class = HTitleTools.getWMClass().replace(/\"/g, '\\$&');
                var str = 'WINDOWS=$(xwininfo -tree -root | grep "(' + wm_class + ')" | sed "s/[ ]*//" | grep -o "0x[0-9a-f]*"); for ID in $WINDOWS; do xprop -id $ID -f _MOTIF_WM_HINTS 32c -set _MOTIF_WM_HINTS "0x2, 0x0, 0x1, 0x0, 0x0"; xprop -id $ID -remove _GTK_HIDE_TITLEBAR_WHEN_MAXIMIZED; done';
                var args = ["-c", str]
                result = HTitleTools.run(utils.bash, args, false);
            }
            HTitle.window.removeAttribute("hidetitlebarwhenmaximized");
        }
        else if (HTitle.currentMode == "legacy") {
            window.removeEventListener("sizemodechange", HTitle.onWindowStateChange);
            HTitle.window.setAttribute("hidechrome", false);
        }
        HTitle.currentMode = "stopped";
        HTitle.previousState = 0;
        HTitle.previousChangeTime = 0;
        HTitle.window.setAttribute("htitlemode", HTitle.currentMode);
    },

    observe: function(subject, topic, data) {
        if (topic != "nsPref:changed")
            return;

        switch(data) {
            case "show_window_controls":
                if (HTitleTools.prefs.getBoolPref("show_window_controls")) {
                    HTitleTools.log("Enable show close button", "DEBUG");
                    HTitle.updateWindowControlsPosition(null);
                    HTitle.showWindowControls();
                }
                else {
                    HTitleTools.log("Disable show close button", "DEBUG");
                    HTitle.hideWindowControls();
                }
                break;
            case "legacy_mode.enable":
                if (HTitle.ENABLED && !HTitleTools.defaultModeFailed && HTitle.currentMode != "stopped") {
                    if (HTitleTools.prefs.getBoolPref("show_window_controls"))
                        HTitle.hideWindowControls();

                    HTitle.stop();
                    HTitleTools.prefs.setIntPref("hide_mode", 1);
                    HTitle.start();

                    if (HTitleTools.prefs.getBoolPref("show_window_controls"))
                        HTitle.showWindowControls();
                }
                break;
            case "hide_mode":
                if (HTitle.ENABLED && HTitle.currentMode != "stopped") {
                    if (HTitleTools.prefs.getBoolPref("show_window_controls"))
                        HTitle.hideWindowControls();

                    HTitle.stop();
                    if (HTitleTools.prefs.getIntPref("hide_mode") != 1)
                        HTitleTools.prefs.setBoolPref("legacy_mode.enable", false);
                    HTitle.start();

                    if (HTitleTools.prefs.getBoolPref("show_window_controls"))
                        HTitle.showWindowControls();
                }
                break;
            case "check_gnome_shell":
                if (!HTitle.ENABLED && !HTitleTools.prefs.getBoolPref("check_gnome_shell")) {
                    HTitle.ENABLED = true;
                    HTitle.start();
                }
                else if (HTitle.ENABLED && !HTitleTools.prefs.getBoolPref("check_gnome_shell")) {
                    return;
                }
                else if (HTitleTools.prefs.getBoolPref("check_gnome_shell") && HTitleTools.checkPresenceGnomeShell() != 0 && HTitle.ENABLED) {
                    HTitle.ENABLED = false;
                    HTitle.stop();
                }
                break;
            case "debug":
                HTitleTool.DEBUG = HTitleTools.prefs.getBoolPref("debug");
                break;
            case "legacy_mode.timeout_check":
                HTitleTools.timeoutCheck = HTitleTools.prefs.getIntPref("legacy_mode.timeout_check");
                break;
            case "legacy_mode.timeout_between_changes":
                HTitleTools.timeoutBetweenChanges = HTitleTools.prefs.getIntPref("legacy_mode.timeout_between_changes");
                break;
        }
    },

    onWindowStateChange: function(e) {
        if (HTitle.previousState == window.windowState || window.windowState == window.STATE_FULLSCREEN || window.windowState == window.STATE_MINIMIZED) {
            return;
        }

        if ((Date.now() - HTitle.previousChangeTime) < HTitleTools.timeoutBetweenChanges) {
            if (window.windowState == window.STATE_NORMAL && HTitle.window.getAttribute("hidechrome"))
                 window.maximize();
            return;
        }

        HTitle.logWindowState("onWindowStateChange");

        HTitle.window.setAttribute("hidechrome", (window.windowState == window.STATE_MAXIMIZED));

        HTitle.previousState = window.windowState;
        HTitle.previousChangeTime = Date.now();
    },

    checkWindowState: function() {
        if (window.windowState == window.STATE_NORMAL) {
            HTitle.logWindowState("checkWindowState");
            HTitle.window.setAttribute("hidechrome", false);
            HTitle.previousState = window.STATE_NORMAL;
            HTitle.previousChangeTime = Date.now();
        }
        else if (window.windowState == window.STATE_MAXIMIZED) {
            HTitle.logWindowState("checkWindowState");
            HTitle.window.setAttribute("hidechrome", true);
            HTitle.previousState = window.STATE_MAXIMIZED;
            HTitle.previousChangeTime = Date.now();
        }
    },

    logWindowState: function(from) {
        if (HTitle.DEBUG == false)
            return

        switch (window.windowState) {
            case window.STATE_MAXIMIZED:   var windowState = "maximized"; break;
            case window.STATE_NORMAL:      var windowState = "normal"; break;
            case window.STATE_FULLSCREEN:  var windowState = "fullscreen"; break;
            default: var windowState = window.windowState.toString();
        }

        HTitleTools.log("Action = " + from + "; windowState = " + windowState + ";  hidechrome = " + HTitle.window.getAttribute("hidechrome"), "DEBUG");
    },

    shutdown: function() {
        HTitleTools.prefs.removeObserver("", HTitle);
        //if (HTitleTools.prefs.getBoolPref("show_window_controls"))
        //    HTitle.hideWindowControls();
    },
}

window.addEventListener("load",   HTitle.init);
window.addEventListener("unload", HTitle.shutdown);
