/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var HTitle = {
    DEBUG: false,
    ENABLED: true,
    TIMEOUT_CHECK: 200, // ms
    TIMEOUT_BETWEEN_CHANGES: 200, // ms
    
    appInfo: null,
    prefs: null,
    
    tabsObserver: null,
    navbarObserver: null,
    menubarObserver: null,
    
    window: null,
    
    currentMode: "normal",
    previousState: 0,
    previousChangeTime: 0,
    
    defaultModeFailed: false,
    
    init: function() {
        HTitle.prefs = Components.classes["@mozilla.org/preferences-service;1"]
                                 .getService(Components.interfaces.nsIPrefService)
                                 .getBranch("extensions.htitle.");
        
        HTitle.DEBUG = HTitle.prefs.getBoolPref("debug");
        HTitle.TIMEOUT_CHECK = HTitle.prefs.getIntPref("legacy_mode.timeout_check");
        HTitle.TIMEOUT_BETWEEN_CHANGES = HTitle.prefs.getIntPref("legacy_mode.timeout_between_changes");
        
        HTitle.prefs.addObserver("", HTitle, false);
        
        if (HTitle.prefs.getBoolPref("check_gnome_shell") && HTitle.checkPresenceGnomeShell() != 0) {
            HTitle.ENABLED = false;
        }
        
        HTitle.appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                                   .getService(Components.interfaces.nsIXULAppInfo);
        
        if (HTitle.ENABLED)
            HTitle.start();
        
        if (HTitle.prefs.getBoolPref("show_close_button")) {
            HTitle.loadStyle("windowControls");
        }
        
        // TabsOnTop
        HTitle.tabsObserver = new MutationObserver(function(mutations) {
            mutations.forEach(HTitle.updateWindowControlsPosition);    
        });
        HTitle.tabsObserver.observe(document.getElementById("TabsToolbar"), { attributes: true, attributeFilter: ["tabsontop"] });
        
        // Navigation Toolbar
        HTitle.navbarObserver = new MutationObserver(function(mutations) {
            mutations.forEach(HTitle.updateWindowControlsPosition);    
        });
        HTitle.navbarObserver.observe(document.getElementById("nav-bar"), { attributes: true, attributeFilter: ["collapsed"] });
        
        // Menu Toolbar
        HTitle.menubarObserver = new MutationObserver(function(mutations) {
            mutations.forEach(HTitle.updateWindowControlsPosition);    
        });
        HTitle.menubarObserver.observe(document.getElementById("toolbar-menubar"), { attributes: true, attributeFilter: ["autohide"] });
        
        HTitle.log("TIMEOUT_CHECK = " + HTitle.TIMEOUT_CHECK + "; TIMEOUT_BETWEEN_CHANGES = " + HTitle.TIMEOUT_BETWEEN_CHANGES, "DEBUG");
    },
    
    addToCurrentset: function(node, id) {
        var currentset = node.getAttribute("currentset");
        currentset = currentset + (currentset == "" ? "" : ",") + id;
        node.setAttribute("currentset", currentset);
    },
    
    removeFromCurrentset: function(node, id) {
        var currentset = node.getAttribute("currentset");
        var re = new RegExp("(^|,)" + id + "($|,)");
        currentset = currentset.replace(re, "$2");
        node.setAttribute("currentset", currentset);
    },
    
    updateWindowControlsPosition: function(mutation) {
        var windowctls = document.getElementById("window-controls");

        var menubar = document.getElementById("toolbar-menubar");
        var navbar = document.getElementById("nav-bar");
        var tabsbar = document.getElementById("TabsToolbar");
        
        if (!windowctls || !menubar || !navbar || !tabsbar) {
            return;
        }
        
        var tabsontop = tabsbar.getAttribute("tabsontop");
        
        // Removing window controls from currentset attribute
        HTitle.removeFromCurrentset(windowctls.parentNode, "window-controls");
        
        if (menubar.getAttribute("autohide") == "false") {
            // Moving to the Menu bar
            var need_spring = true;
            var nodes = menubar.childNodes;
            for (var i = 0; i < nodes.length; i++) {
                if (nodes[i].getAttribute("flex") == "1") {
                    need_spring = false;
                    break;
                }
            }
            
            if (need_spring) {
                var spring = document.createElement("toolbarspring");
                spring.setAttribute("id", "htitle-menubar-spring");
                spring.setAttribute("removable", "true");
                spring.setAttribute("flex", "1");
                HTitle.addToCurrentset(menubar, "htitle-menubar-spring");
                menubar.appendChild(spring);
            }
            
            windowctls.removeAttribute("flex");
            menubar.appendChild(windowctls);
            HTitle.log("Close button moved to the Menu bar...", "DEBUG");
        }
        else if (tabsontop == "true" || navbar.collapsed) {
            // Moving to the Tabs toolbar
            windowctls.removeAttribute("flex");
            tabsbar.appendChild(windowctls);
            HTitle.log("Close button moved to the Tabs toolbar...", "DEBUG");
        }
        else {
            // Moving to the Navigation toolbar
            windowctls.setAttribute("flex", "1");
            navbar.appendChild(windowctls);
            HTitle.log("Close button moved to the Navigation toolbar...", "DEBUG");
        }
        
        HTitle.addToCurrentset(windowctls.parentNode, "window-controls");
    },
    
    _findPathToExec: function(name) {
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
        
        var pidof_path = HTitle._findPathToExec("pidof");
        
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
    
    start: function() {
        var result = -2;
        
        if (!HTitle.prefs.getBoolPref("legacy_mode.enable")) {
            HTitle.log("Start in normal mode", "DEBUG");
            
            var bash_path = HTitle._findPathToExec("bash");
            if (bash_path && HTitle._findPathToExec("xwininfo") && HTitle._findPathToExec("xprop")) {
                if (HTitle.appInfo.ID == "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}") { // Firefox
                    var wm_class = '\\"Navigator\\" \\"Firefox\\"';
                }
                else if (HTitle.appInfo.ID == "{3550f703-e582-4d05-9a08-453d09bdfdc6}") { // Thunderbird
                    var wm_class = '\\"Mail\\" \\"Thunderbird\\"';
                }
                var str = 'WINDOWS=""; i="0"; while [ "$WINDOWS" == "" ] && [ $i -lt 1200 ]; do sleep 0.05; WINDOWS=$(xwininfo -tree -root | grep "(' + wm_class + ')" | sed "s/[ ]*//" | grep -o "0x[0-9a-f]*"); i=$[$i+1]; done; for ID in $WINDOWS; do xprop -id $ID -f _GTK_HIDE_TITLEBAR_WHEN_MAXIMIZED 32c -set _GTK_HIDE_TITLEBAR_WHEN_MAXIMIZED 1; done';
                var args = ["-c", str]
                result = HTitle._run(bash_path, args, false);
            }
            else {
                result = -1;
            }
        }
        
        if (HTitle.appInfo.ID == "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}") { // Firefox
            HTitle.window = document.getElementById("main-window");
        }
        else if (HTitle.appInfo.ID == "{3550f703-e582-4d05-9a08-453d09bdfdc6}") { // Thunderbird
            HTitle.window = document.getElementById("messengerWindow");
        }
        
        if (result == 0) {
            HTitle.window.setAttribute("hidetitlebarwhenmaximized", true);
            HTitle.window.setAttribute("hidechrome", false);
            HTitle.currentMode = "normal";
        }
        else {
            if (result == -1 && !HTitle.defaultModeFailed) {
                HTitle.defaultModeFailed = true;
                HTitle.prefs.setBoolPref("legacy_mode.enable", true);
            }
            HTitle.log("Start in legacy mode", "DEBUG");
            window.addEventListener("sizemodechange", HTitle.onWindowStateChange);
            HTitle.currentMode = "legacy";
            //HTitle.onWindowStateChange();
            
            setTimeout(function(){HTitle.checkWindowState();}, HTitle.TIMEOUT_CHECK);
        }
    },
    
    stop: function() {
        if (HTitle.currentMode == "normal") {
            var bash_path = HTitle._findPathToExec("bash");
            if (bash_path) {
                if (HTitle.appInfo.ID == "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}") { // Firefox
                    var wm_class = '\\"Navigator\\" \\"Firefox\\"';
                }
                else if (HTitle.appInfo.ID == "{3550f703-e582-4d05-9a08-453d09bdfdc6}") { // Thunderbird
                    var wm_class = '\\"Mail\\" \\"Thunderbird\\"';
                }
                var str = 'WINDOWS=""; i="0"; while [ "$WINDOWS" == "" ] && [ $i -lt 1200 ]; do sleep 0.05; WINDOWS=$(xwininfo -tree -root | grep "(' + wm_class + ')" | sed "s/[ ]*//" | grep -o "0x[0-9a-f]*"); i=$[$i+1]; done; for ID in $WINDOWS; do xprop -id $ID -remove _GTK_HIDE_TITLEBAR_WHEN_MAXIMIZED; done';
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
    
    observe: function(subject, topic, data) {
        if (topic != "nsPref:changed") {
            return;
        }

        switch(data) {
            case "show_close_button":
                if (HTitle.prefs.getBoolPref("show_close_button")) {
                    HTitle.log("Enable show close button", "DEBUG");
                    HTitle.loadStyle("windowControls");
                }
                else {
                    HTitle.log("Disable show close button", "DEBUG");
                    HTitle.unloadStyle("windowControls");
                }
                break;
            case "legacy_mode.enable":
                if (HTitle.ENABLED && !HTitle.defaultModeFailed) {
                    HTitle.stop();
                    HTitle.start();
                }
                break;
            case "check_gnome_shell":
                if (!HTitle.ENABLED && !HTitle.prefs.getBoolPref("check_gnome_shell")) {
                    HTitle.ENABLED = true;
                    HTitle.start();
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
            case "legacy_mode.timeout_check":
                HTitle.TIMEOUT_CHECK = HTitle.prefs.getIntPref("legacy_mode.timeout_check");
                break;
            case "legacy_mode.timeout_between_changes":
                HTitle.TIMEOUT_BETWEEN_CHANGES = HTitle.prefs.getIntPref("legacy_mode.timeout_between_changes");
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
        
        if (window.windowState == window.STATE_MAXIMIZED)
            HTitle.window.setAttribute("hidechrome", true);
        else {
            HTitle.window.setAttribute("hidechrome", false);
        }
        
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
        
        HTitle.log("Action = " + from + "; windowState = " + windowState + ";  hidechrome = " + HTitle.window.getAttribute("hidechrome"), "DEBUG");
    },
    
    log: function(message, level="ERROR") {
        // TODO: Logging a message with additional information
        // https://developer.mozilla.org/en-US/docs/XPCOM_Interface_Reference/nsIConsoleService
        
        if (HTitle.DEBUG == false && level == "DEBUG")
            return;
        
        var console = Components.classes["@mozilla.org/consoleservice;1"]
                                .getService(Components.interfaces.nsIConsoleService);
        
        console.logStringMessage("[" + Date.now() + "] " + level + " HTitle: " + message);
    },
    
    shutdown: function() {
        HTitle.prefs.removeObserver("", HTitle);
        HTitle.tabsObserver.disconnect();
        HTitle.navbarObserver.disconnect();
        HTitle.menubarObserver.disconnect();
    },
}

window.addEventListener("load",   HTitle.init);
window.addEventListener("unload", HTitle.shutdown);
