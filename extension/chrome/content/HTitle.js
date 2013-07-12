/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var HTitle = {
    DEBUG: false,
    ENABLED: true,
    TIMEWAIT: 200, // ms
    
    prefs: null,
    
    window: null,
    
    currentMode: "normal",
    previousState: 0,
    previousChangeTime: 0,
    
    _find_path_to_exec: function(name) {
        var file = Components.classes["@mozilla.org/file/local;1"]
                             .createInstance(Components.interfaces.nsIFile);
        
        var env = Components.classes["@mozilla.org/process/environment;1"]
                            .getService(Components.interfaces.nsIEnvironment);
        var path = env.get("PATH").split(":");
        
        HTitle.log("PATH = " + path, "DEBUG");
        
        var path_to_exec = null;
        for (var i = 0; i < path.length; i++) {
            var full_path_to_exec = path[i] + "/" + name;
            file.initWithPath(full_path_to_exec);
            if (file.exists() && file.isExecutable()) {
                path_to_exec = full_path_to_exec;
                HTitle.log("Path to " + name + " is \"" + full_path_to_exec + "\"", "DEBUG");
                break;
            }
            else {
                HTitle.log("File \"" + full_path_to_exec + "\" doesn't exists", "DEBUG");
            }
        }
        
        return path_to_exec;
    },
    
    _run: function(path, args, needWait=true) {
        var file = Components.classes["@mozilla.org/file/local;1"]
                             .createInstance(Components.interfaces.nsIFile);
        
        file.initWithPath(path);
        
        var process = Components.classes["@mozilla.org/process/util;1"]
                                .createInstance(Components.interfaces.nsIProcess);
        
        try {
            process.init(file);
            process.run(needWait, args, args.length);
        }
        catch (error) {
            HTitle.log(error.message, "ERROR");
            return -1;
        }
        
        if (needWait) {
            HTitle.log("Exit value of " + path + " is \"" + process.exitValue + "\"", "DEBUG");
            return process.exitValue;
        }
        else
            return 0;
    },
    
    loadStyle: function(name) {
        var sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
                            .getService(Components.interfaces.nsIStyleSheetService);
        var io = Components.classes["@mozilla.org/network/io-service;1"]
                           .getService(Components.interfaces.nsIIOService);
        var uri = io.newURI("chrome://htitle/skin/" + name + ".css", null, null);
        if (!sss.sheetRegistered(uri, sss.USER_SHEET))
            sss.loadAndRegisterSheet(uri, sss.USER_SHEET);
    },
    
    unloadStyle: function(name) {
        var sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
                            .getService(Components.interfaces.nsIStyleSheetService);
        var io = Components.classes["@mozilla.org/network/io-service;1"]
                           .getService(Components.interfaces.nsIIOService);
        var uri = io.newURI("chrome://htitle/skin/" + name + ".css", null, null);
        if (sss.sheetRegistered(uri, sss.USER_SHEET))
            sss.unregisterSheet(uri, sss.USER_SHEET);
    },
    
    checkPresenceGnomeShell: function() {
        HTitle.log("Start checking DE", "DEBUG");
        
        var pidof_path = HTitle._find_path_to_exec("pidof");
        
        if (pidof_path) {
            var exitValue = HTitle._run(pidof_path, ["gnome-shell"]);
            if (exitValue == 1)
                return 1;
            else
                return 0;
        }
        else {
            HTitle.log("pidof doesn't exist", "ERROR");
            return 2;
        }
    },
    
    launch: function() {
        var result = -2;
        
        if (!HTitle.prefs.getBoolPref("enable_legacy_method")) {
            HTitle.log("Start in normal mode", "DEBUG");
            
            var bash_path = HTitle._find_path_to_exec("bash");
            if (bash_path) {
                var str = 'WINDOWS=""; i="0"; while [ "$WINDOWS" == "" ] && [ $i -lt 1200 ]; do sleep 0.05; WINDOWS=$(xwininfo -tree -root | grep "(\\"Navigator\\" \\"Firefox\\")" | sed "s/[ ]*//" | grep -o "0x[0-9a-f]*"); i=$[$i+1]; done; for ID in $WINDOWS; do xprop -id $ID -f _GTK_HIDE_TITLEBAR_WHEN_MAXIMIZED 32c -set _GTK_HIDE_TITLEBAR_WHEN_MAXIMIZED 1; done';
                var args = ["-c", str]
                result = HTitle._run(bash_path, args, false);
            }
        }
        
        HTitle.window = document.getElementById("main-window");
        
        if (result == 0) {
            HTitle.window.setAttribute("hidetitlebarwhenmaximized", true);
            HTitle.window.setAttribute("hidechrome", false);
            HTitle.currentMode = "normal";
        }
        else {
            HTitle.log("Start in legacy mode", "DEBUG");
            window.addEventListener("sizemodechange", HTitle.onWindowStateChange);
            HTitle.currentMode = "legacy";
            HTitle.onWindowStateChange();
        }
    },
    
    stop: function() {
        if (HTitle.currentMode == "normal") {
            var bash_path = HTitle._find_path_to_exec("bash");
            if (bash_path) {
                var str = 'WINDOWS=""; i="0"; while [ "$WINDOWS" == "" ] && [ $i -lt 1200 ]; do sleep 0.05; WINDOWS=$(xwininfo -tree -root | grep "(\\"Navigator\\" \\"Firefox\\")" | sed "s/[ ]*//" | grep -o "0x[0-9a-f]*"); i=$[$i+1]; done; for ID in $WINDOWS; do xprop -id $ID -remove _GTK_HIDE_TITLEBAR_WHEN_MAXIMIZED; done';
                var args = ["-c", str]
                HTitle._run(bash_path, args, false);
            }
            HTitle.window.removeAttribute("hidetitlebarwhenmaximized");
        }
        else if (HTitle.currentMode == "legacy") {
            window.removeEventListener("sizemodechange", HTitle.onWindowStateChange);
            HTitle.window.setAttribute("hidechrome", false);
        }
        HTitle.currentMode = "normal";
        HTitle.previousState = 0;
        HTitle.previousChangeTime = 0;
    },
    
    init: function() {
        HTitle.prefs = Components.classes["@mozilla.org/preferences-service;1"]
                                 .getService(Components.interfaces.nsIPrefService)
                                 .getBranch("extensions.htitle.");
        
        HTitle.DEBUG = HTitle.prefs.getBoolPref("debug");
        
        HTitle.prefs.addObserver("", HTitle, false);
        
        if (HTitle.prefs.getBoolPref("check_gnome_shell") && HTitle.checkPresenceGnomeShell() != 0) {
            HTitle.ENABLED = false;
        }
        
        if (HTitle.ENABLED)
            HTitle.launch();
        
        if (HTitle.prefs.getBoolPref("show_close_button")) {
            HTitle.loadStyle("window-controls");
        }
    },
    
    observe: function(subject, topic, data) {
        if (topic != "nsPref:changed") {
            return;
        }

        switch(data) {
            case "show_close_button":
                if (HTitle.prefs.getBoolPref("show_close_button")) {
                    HTitle.log("Enable show close button", "DEBUG");
                    HTitle.loadStyle("window-controls");
                }
                else {
                    HTitle.log("Disable show close button", "DEBUG");
                    HTitle.unloadStyle("window-controls");
                }
                break;
            case "enable_legacy_method":
                if (HTitle.ENABLED) {
                    HTitle.stop();
                    HTitle.launch();
                }
                break;
            case "check_gnome_shell":
                if (!HTitle.ENABLED && !HTitle.prefs.getBoolPref("check_gnome_shell")) {
                    HTitle.ENABLED = true;
                    HTitle.launch();
                }
                else if (HTitle.ENABLED && !HTitle.prefs.getBoolPref("check_gnome_shell")) {
                    return;
                }
                else if (HTitle.prefs.getBoolPref("check_gnome_shell") && HTitle.checkPresenceGnomeShell() != 0 && HTitle.ENABLED) {
                    HTitle.ENABLED = false;
                    HTitle.stop();
                }
                break;
            case "debug":
                HTitle.DEBUG = HTitle.prefs.getBoolPref("debug");
                break;
        }
    },
    
    onWindowStateChange: function(e) {
        if (
                HTitle.previousState == window.windowState ||
                window.windowState == window.STATE_FULLSCREEN ||
                Date.now() - HTitle.previousChangeTime < HTitle.TIMEWAIT
            ) {
            return;
        }
        
        HTitle.logWindowState("onWindowStateChange");
        
        if (window.windowState == window.STATE_MAXIMIZED)
            HTitle.window.setAttribute("hidechrome", true);
        else {
            HTitle.window.setAttribute("hidechrome", false);
        }
        
        HTitle.previousState = window.windowState;
        HTitle.previousChangeTime = Date.now();
    },
    
    onClick: function() {
        if (window.windowState == window.STATE_NORMAL && HTitle.window.getAttribute("hidechrome")) {
            HTitle.logWindowState("onClick");
            HTitle.window.setAttribute("hidechrome", false);
            HTitle.previousState = window.STATE_NORMAL;
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
        
        HTitle.log("Action = " + from + "; windowState = " + windowState + ";  hidechrome = " + HTitle.window.getAttribute("hidechrome") + "; isFullscreen = " + HTitle.isFullscreen, "DEBUG");
    },
    
    log: function(message, level="ERROR") {
        if (HTitle.DEBUG == false && level == "DEBUG")
            return;
        
        var timestamp = Date.now();
        Application.console.log("[" + timestamp + "] " + level + " HTitle: " + message);
    },
    
    shutdown: function() {
        HTitle.prefs.removeObserver("", HTitle);
    },
}

window.addEventListener("load",   HTitle.init);
window.addEventListener("unload", HTitle.shutdown);
