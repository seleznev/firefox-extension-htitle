/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Components.utils.import("chrome://htitle/content/HTitleShare.jsm");
Components.utils.import("chrome://htitle/content/HTitleUtils.jsm");

var HTitle = {
    ENABLED: true,

    window: null,

    currentMode: "auto",
    currentMethod: "xlib",
    isFirstStart: true,
    isStopped: true,
    previousState: 0,
    previousChangeTime: 0,

    init: function() {
        HTitleUtils.prefs.addObserver("", HTitle, false);

        if (HTitleUtils.prefs.getBoolPref("check_gnome_shell") && HTitleUtils.checkPresenceGnomeShell() != 0) {
            // Nothing doing if WM is not GNOME Shell.
            HTitle.ENABLED = false;
            return;
        }

        HTitle.window = window.document.documentElement;

        HTitle.start();

        if (typeof HTitleWindowControls != "undefined") {
            if (HTitleUtils.prefs.getBoolPref("window_controls.get_layout_by_gsettings"))
                HTitleWindowControls.setLayoutAttribute();

            if (HTitleUtils.prefs.getBoolPref("show_window_controls"))
                HTitleWindowControls.show();
        }
    },

    start: function() {
        HTitle.currentMode = (HTitleUtils.prefs.getIntPref("hide_mode") == 2) ? "always" : "auto";
        HTitle.currentMethod = (HTitleUtils.prefs.getBoolPref("legacy_mode.enable")) ? "hidechrome" : "xlib";

        if (HTitle.currentMethod == "xlib") {
            HTitleUtils.log("Start in normal mode", "DEBUG");
            var result = HTitleUtils.setWindowProperty(window, HTitle.currentMode);
            if (HTitle.isFirstStart && (HTitle.currentMode == "always" || HTitleShare.gtkVersion == 3) && result == 0) {
                // Really bad hack
                var timeouts = [100, 2*100, 3*100, 4*100, 10*100];
                for (let i = 0; i < timeouts.length; i++) {
                    setTimeout(function(){HTitleUtils.setWindowProperty(window, HTitle.currentMode);}, timeouts[i]);
                }
            }
            if (result == -1 && !HTitleShare.defaultMethodFailed) {
                HTitleShare.defaultMethodFailed = true;
                HTitle.currentMethod = "hidechrome";
                HTitleUtils.prefs.setBoolPref("legacy_mode.enable", true);
            }
        }

        if (HTitle.currentMethod == "hidechrome") {
            HTitleUtils.log("Start in legacy mode", "DEBUG");
            HTitleUtils.log("TIMEOUT_CHECK = " + HTitleUtils.timeoutCheck + "; TIMEOUT_BETWEEN_CHANGES = " + HTitleUtils.timeoutBetweenChanges, "DEBUG");
            window.addEventListener("sizemodechange", HTitle.onWindowStateChange);
            setTimeout(function(){HTitle.checkWindowState();}, HTitleUtils.timeoutCheck);
        }

        HTitle.window.setAttribute("htitlemode", HTitle.currentMode);
        HTitle.window.setAttribute("htitlemethod", HTitle.currentMethod);
        HTitle.isFirstStart = false;
        HTitle.isStopped = false;
    },

    stop: function() {
        if (HTitle.currentMethod == "xlib") {
            HTitleUtils.removeWindowProperty(window, HTitle.currentMode);
        }
        else {
            window.removeEventListener("sizemodechange", HTitle.onWindowStateChange);
            HTitle.window.setAttribute("hidechrome", false);
            HTitle.previousState = 0;
            HTitle.previousChangeTime = 0;
        }

        HTitle.window.removeAttribute("htitlemode");
        HTitle.window.removeAttribute("htitlemethod");
        HTitle.isStopped = true;
    },

    observe: function(subject, topic, data) {
        if (topic != "nsPref:changed")
            return;

        switch(data) {
            case "show_window_controls":
                if (typeof HTitleWindowControls == "undefined") {
                    break;
                }
                if (HTitleUtils.prefs.getBoolPref("show_window_controls")) {
                    HTitleUtils.log("Enable show close button", "DEBUG");
                    HTitleWindowControls.updatePosition(null);
                    HTitleWindowControls.show();
                }
                else {
                    HTitleUtils.log("Disable show close button", "DEBUG");
                    HTitleWindowControls.hide();
                }
                break;
            case "legacy_mode.enable":
                if (HTitle.ENABLED && !HTitleShare.defaultMethodFailed && !HTitle.isStopped) {
                    let wc = (typeof HTitleWindowControls != "undefined");
                    if (wc && HTitleUtils.prefs.getBoolPref("show_window_controls"))
                        HTitleWindowControls.hide();

                    HTitle.stop();
                    HTitleUtils.prefs.setIntPref("hide_mode", 1);
                    HTitle.start();

                    if (wc && HTitleUtils.prefs.getBoolPref("show_window_controls"))
                        HTitleWindowControls.show();
                }
                break;
            case "hide_mode":
                if (HTitle.ENABLED && !HTitle.isStopped) {
                    let wc = (typeof HTitleWindowControls != "undefined");
                    if (wc && HTitleUtils.prefs.getBoolPref("show_window_controls"))
                        HTitleWindowControls.hide();

                    HTitle.stop();
                    if (HTitleUtils.prefs.getIntPref("hide_mode") != 1)
                        HTitleUtils.prefs.setBoolPref("legacy_mode.enable", false);
                    HTitle.start();

                    if (wc && HTitleUtils.prefs.getBoolPref("show_window_controls"))
                        HTitleWindowControls.show();
                }
                break;
            case "check_gnome_shell":
                if (!HTitle.ENABLED && !HTitleUtils.prefs.getBoolPref("check_gnome_shell")) {
                    HTitle.ENABLED = true;
                    HTitle.start();
                }
                else if (HTitle.ENABLED && !HTitleUtils.prefs.getBoolPref("check_gnome_shell")) {
                    return;
                }
                else if (HTitleUtils.prefs.getBoolPref("check_gnome_shell") && HTitleUtils.checkPresenceGnomeShell() != 0 && HTitle.ENABLED) {
                    HTitle.ENABLED = false;
                    HTitle.stop();
                }
                break;
        }
    },

    onWindowStateChange: function(e) {
        if (HTitle.previousState == window.windowState || window.windowState == window.STATE_FULLSCREEN || window.windowState == window.STATE_MINIMIZED) {
            return;
        }

        if ((Date.now() - HTitle.previousChangeTime) < HTitleUtils.timeoutBetweenChanges) {
            if (window.windowState == window.STATE_NORMAL && HTitle.window.getAttribute("hidechrome"))
                 window.maximize();
            return;
        }

        HTitle.logWindowState("onWindowStateChange");

        HTitle.window.setAttribute("hidechrome", (window.windowState == window.STATE_MAXIMIZED));

        HTitle.previousState = window.windowState;
        HTitle.previousChangeTime = Date.now();
    },

    onClickTitlebar: function(e, window) {
        var e = e || window.event;
        if ("object" !== typeof e) {
            return;
        }
        var targets = ["window-controls", "minimize-button", "restore-button", "close-button"];
        if (targets.indexOf(e.target.id) != -1) {
            switch(e.button) {
                case 1:
                    switch(HTitleUtils.titlebarActions.middle) {
                        case "lower":
                            HTitleUtils.lowerWindow(window);
                            break;
                        case "minimize":
                            window.minimize();
                            break;
                    }
                    break;
            }
        }
        HTitleUtils.log("Detected click under #" + e.target.id, "DEBUG");
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
        if (HTitleShare.debug == false)
            return;

        switch (window.windowState) {
            case window.STATE_MAXIMIZED:  var windowState = "maximized"; break;
            case window.STATE_NORMAL:     var windowState = "normal"; break;
            case window.STATE_FULLSCREEN: var windowState = "fullscreen"; break;
            default:                      var windowState = window.windowState.toString();
        }

        HTitleUtils.log("Action = " + from + "; windowState = " + windowState + ";  hidechrome = " + HTitle.window.getAttribute("hidechrome"), "DEBUG");
    },

    shutdown: function() {
        HTitleUtils.prefs.removeObserver("", HTitle);
        //let wc = (typeof HTitleWindowControls != "undefined");
        //if (wc && HTitleUtils.prefs.getBoolPref("show_window_controls"))
        //    HTitleWindowControls.hide();
    },
}

window.addEventListener("load",   HTitle.init);
window.addEventListener("unload", HTitle.shutdown);
