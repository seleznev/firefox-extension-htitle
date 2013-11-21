/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Components.utils.import("chrome://htitle/content/HTitleTools.jsm");

var HTitle = {
    ENABLED: true,
    TIMEOUT_CHECK: 200, // ms
    TIMEOUT_BETWEEN_CHANGES: 200, // ms

    windowControlsObservers: [],

    window: null,

    currentMode: "auto",
    previousState: 0,
    previousChangeTime: 0,

    defaultModeFailed: false,

    init: function() {
        HTitle.TIMEOUT_CHECK = HTitleTools.prefs.getIntPref("legacy_mode.timeout_check");
        HTitle.TIMEOUT_BETWEEN_CHANGES = HTitleTools.prefs.getIntPref("legacy_mode.timeout_between_changes");

        HTitleTools.prefs.addObserver("", HTitle, false);

        if (HTitleTools.prefs.getBoolPref("check_gnome_shell") && HTitleTools.checkPresenceGnomeShell() != 0) {
            // Nothing doing if WM is not GNOME Shell.
            HTitle.ENABLED = false;
            return;
        }

        HTitle.start();

        /* Upgrade from previous (< 2.5) versions */
        if (HTitleTools.prefs.getPrefType("show_close_button") && HTitleTools.prefs.getBoolPref("show_close_button")) {
            HTitleTools.prefs.setBoolPref("show_close_button", false);
            HTitleTools.prefs.setBoolPref("show_window_controls", true);
        }

        if (HTitleTools.prefs.getBoolPref("show_window_controls"))
            HTitle.showWindowControls();

        HTitleTools.log("TIMEOUT_CHECK = " + HTitle.TIMEOUT_CHECK + "; TIMEOUT_BETWEEN_CHANGES = " + HTitle.TIMEOUT_BETWEEN_CHANGES, "DEBUG");
    },

    showWindowControls: function() {
        if (HTitleTools.isFirefox()) {
            var windowctls = document.getElementById("window-controls");
            windowctls.setAttribute("htitle", "true");

            // Appling CSS
            if (HTitle.currentMode == "always")
                HTitleTools.loadStyle("windowControlsAlways");
            else
                HTitleTools.loadStyle("windowControlsAuto");

            var targets_map = [
                    ["TabsToolbar", "tabsontop"], 
                    ["nav-bar", "collapsed"],
                    ["toolbar-menubar", "autohide"],
                    ["main-window", "sizemode"]
                ];

            for (var i = 0; i < targets_map.length; i++) {
                var tempObserver = new MutationObserver(function(mutations) {
                    mutations.forEach(HTitle.updateWindowControlsPosition);
                });
                tempObserver.observe(document.getElementById(targets_map[i][0]), { attributes: true, attributeFilter: [targets_map[i][1]] });
                HTitle.windowControlsObservers.push(tempObserver);
            }
            HTitleTools.log("HTitle.windowControlsObservers = " + HTitle.windowControlsObservers.length, "DEBUG");
        }
    },

    hideWindowControls: function() {
        if (!HTitleTools.isFirefox())
            return;

        if (HTitle.currentMode == "always")
            HTitleTools.unloadStyle("windowControlsAlways");
        else
            HTitleTools.unloadStyle("windowControlsAuto");

        var spring = document.getElementById("htitle-menubar-spring");
        if (spring)
            spring.remove();

        var windowctls = document.getElementById("window-controls");
        windowctls.removeAttribute("htitle");
        windowctls.setAttribute("flex", "1");
        var navbar = document.getElementById("nav-bar");
        HTitleTools.moveWindowControlsTo(windowctls, navbar);

        for (var i = 0; i < HTitle.windowControlsObservers.length; i++) {
            HTitle.windowControlsObservers[i].disconnect();
        }
        HTitle.windowControlsObservers = [];
    },

    updateWindowControlsPosition: function(mutation) {
        var windowctls = document.getElementById("window-controls");

        var window = document.getElementById("main-window");
        var menubar = document.getElementById("toolbar-menubar");
        var navbar = document.getElementById("nav-bar");
        var tabsbar = document.getElementById("TabsToolbar");

        if (!windowctls || !menubar || !navbar || !tabsbar) {
            return;
        }

        var tabsontop = tabsbar.getAttribute("tabsontop");

        if (menubar.getAttribute("autohide") != "true" && window.getAttribute("sizemode") != "fullscreen") {
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
                spring.setAttribute("removable", "true");
                spring.setAttribute("flex", "1");
                HTitleTools.addToCurrentset(menubar, "htitle-menubar-spring");
                menubar.appendChild(spring);
            }

            windowctls.removeAttribute("flex");
            HTitleTools.moveWindowControlsTo(windowctls, menubar);
        }
        else if (tabsontop != "false" || navbar.collapsed) {
            // Moving to the Tabs toolbar
            if (tabsbar == windowctls.parentNode)
                return;
            windowctls.removeAttribute("flex");
            HTitleTools.moveWindowControlsTo(windowctls, tabsbar);
        }
        else {
            // Moving to the Navigation toolbar
            if (navbar == windowctls.parentNode)
                return;
            windowctls.setAttribute("flex", "1");
            HTitleTools.moveWindowControlsTo(windowctls, navbar);
        }
    },

    start: function() {
        var result = -2;

        if (!HTitleTools.prefs.getBoolPref("legacy_mode.enable")) {
            HTitleTools.log("Start in normal mode", "DEBUG");

            var bash_path = HTitleTools.findPathToExec("bash");
            if (bash_path && HTitleTools.findPathToExec("xwininfo") && HTitleTools.findPathToExec("xprop")) {
                var wm_class = HTitleTools.getWMClass().replace(/\"/g, '\\$&');

                if (HTitleTools.prefs.getIntPref("hide_mode") == 2) {
                    var str = 'WINDOWS=""; i="0"; while [ "$WINDOWS" == "" ] && [ $i -lt 1200 ]; do sleep 0.05; WINDOWS=$(xwininfo -tree -root | grep "(' + wm_class + ')" | sed "s/[ ]*//" | grep -o "0x[0-9a-f]*"); i=$[$i+1]; done; for ID in $WINDOWS; do xprop -id $ID -f _MOTIF_WM_HINTS 32c -set _MOTIF_WM_HINTS "0x2, 0x0, 0x2, 0x0, 0x0"; done';
                    var args = ["-c", str]
                    result = HTitleTools.run(bash_path, args, false);
                }
                else {
                    var str = 'WINDOWS=""; i="0"; while [ "$WINDOWS" == "" ] && [ $i -lt 1200 ]; do sleep 0.05; WINDOWS=$(xwininfo -tree -root | grep "(' + wm_class + ')" | sed "s/[ ]*//" | grep -o "0x[0-9a-f]*"); i=$[$i+1]; done; for ID in $WINDOWS; do xprop -id $ID -f _GTK_HIDE_TITLEBAR_WHEN_MAXIMIZED 32c -set _GTK_HIDE_TITLEBAR_WHEN_MAXIMIZED 1; done';
                    var args = ["-c", str]
                    result = HTitleTools.run(bash_path, args, false);
                }
            }
            else {
                result = -1;
            }
        }

        if (HTitleTools.isFirefox()) {
            HTitle.window = document.getElementById("main-window");
        }
        else if (HTitleTools.isThunderbird()) {
            HTitle.window = document.getElementById("messengerWindow");
        }

        if (result == 0) {
            HTitle.window.setAttribute("hidetitlebarwhenmaximized", true);
            HTitle.window.setAttribute("hidechrome", false);
            if (HTitleTools.prefs.getIntPref("hide_mode") == 2)
                HTitle.currentMode = "always";
            else
                HTitle.currentMode = "auto";
        }
        else {
            if (result == -1 && !HTitle.defaultModeFailed) {
                HTitle.defaultModeFailed = true;
                HTitleTools.prefs.setBoolPref("legacy_mode.enable", true);
            }
            HTitleTools.log("Start in legacy mode", "DEBUG");
            window.addEventListener("sizemodechange", HTitle.onWindowStateChange);
            HTitle.currentMode = "legacy";
            //HTitle.onWindowStateChange();

            setTimeout(function(){HTitle.checkWindowState();}, HTitle.TIMEOUT_CHECK);
        }
        HTitle.window.setAttribute("htitlemode", HTitle.currentMode);
    },

    stop: function() {
        if (HTitle.currentMode != "legacy") {
            var bash_path = HTitleTools.findPathToExec("bash");
            if (bash_path) {
                var wm_class = HTitleTools.getWMClass().replace(/\"/g, '\\$&');
                var str = 'WINDOWS=$(xwininfo -tree -root | grep "(' + wm_class + ')" | sed "s/[ ]*//" | grep -o "0x[0-9a-f]*"); for ID in $WINDOWS; do xprop -id $ID -f _MOTIF_WM_HINTS 32c -set _MOTIF_WM_HINTS "0x2, 0x0, 0x1, 0x0, 0x0"; xprop -id $ID -remove _GTK_HIDE_TITLEBAR_WHEN_MAXIMIZED; done';
                var args = ["-c", str]
                result = HTitleTools.run(bash_path, args, false);
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
                if (HTitle.ENABLED && !HTitle.defaultModeFailed && HTitle.currentMode != "stopped") {
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
                HTitle.TIMEOUT_CHECK = HTitleTools.prefs.getIntPref("legacy_mode.timeout_check");
                break;
            case "legacy_mode.timeout_between_changes":
                HTitle.TIMEOUT_BETWEEN_CHANGES = HTitleTools.prefs.getIntPref("legacy_mode.timeout_between_changes");
                break;
        }
    },

    onWindowStateChange: function(e) {
        if (HTitle.previousState == window.windowState || window.windowState == window.STATE_FULLSCREEN || window.windowState == window.STATE_MINIMIZED) {
            return;
        }

        if ((Date.now() - HTitle.previousChangeTime) < HTitle.TIMEOUT_BETWEEN_CHANGES) {
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
