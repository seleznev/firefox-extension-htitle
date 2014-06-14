/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://gre/modules/ctypes.jsm");

Cu.import("chrome://htitle/content/PrefPageObserver.jsm");
Cu.import("chrome://htitle/content/Libs.jsm");

var EXPORTED_SYMBOLS = ["HTitleTools"];

var HTitlePrefObserver = {
    register: function() {
        HTitleTools.prefs.addObserver("", this, false);
    },

    unregister: function() {
        HTitleTools.prefs.removeObserver("", this);
    },

    observe: function(subject, topic, data) {
        if (topic != "nsPref:changed")
            return;

        switch(data) {
            case "debug":
                HTitleTools.DEBUG = HTitleTools.prefs.getBoolPref("debug");
                break;
            case "legacy_mode.timeout_check":
                HTitleTools.timeoutCheck = HTitleTools.prefs.getIntPref("legacy_mode.timeout_check");
                break;
            case "legacy_mode.timeout_between_changes":
                HTitleTools.timeoutBetweenChanges = HTitleTools.prefs.getIntPref("legacy_mode.timeout_between_changes");
                break;
        }
    }
}

var HTitleToolsPrivate = {
    execute: function(path, args, needWait=true) {
        var file = Cc["@mozilla.org/file/local;1"]
                     .createInstance(Ci.nsIFile);
        file.initWithPath(path);

        var process = Cc["@mozilla.org/process/util;1"]
                        .createInstance(Ci.nsIProcess);
        try {
            process.init(file);
            process.run(needWait, args, args.length);
        }
        catch (error) {
            HTitleTools.log(error.message, "ERROR");
            return -1;
        }

        if (needWait) {
            HTitleTools.log("Exit value of " + path + " is \"" + process.exitValue + "\"", "DEBUG");
            return process.exitValue;
        }
        else
            return 0;
    }
}

var HTitleTools = {
    DEBUG: false,
    appInfo: null,
    prefs: null,

    windowControlsLayout: null,
    titlebarActions: null,

    utils: {},
    defaultMethodFailed: false,

    timeoutCheck: 200, // ms
    timeoutBetweenChanges: 200, // ms

    GDK_VERSION: 2,

    init: function() {
        this.appInfo = Cc["@mozilla.org/xre/app-info;1"]
                         .getService(Ci.nsIXULAppInfo);

        this.prefs = Cc["@mozilla.org/preferences-service;1"]
                       .getService(Ci.nsIPrefService)
                       .getBranch("extensions.htitle.");
        HTitlePrefObserver.register();

        this.DEBUG = this.prefs.getBoolPref("debug");
        this.GDK_VERSION = (this.prefs.getCharPref("toolkit") == "gtk3") ? 3 : 2;
        this.timeoutCheck = this.prefs.getIntPref("legacy_mode.timeout_check");
        this.timeoutBetweenChanges = this.prefs.getIntPref("legacy_mode.timeout_between_changes");

        this.windowControlsLayout = this.getWindowControlsLayout();
        this.titlebarActions = this.getTitlebarActions();
    },

    /* ::::: App info functions ::::: */

    isFirefox: function() {
        return (this.appInfo.ID == "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}");
    },

    isThunderbird: function() {
        return (this.appInfo.ID == "{3550f703-e582-4d05-9a08-453d09bdfdc6}");
    },

    /* ::::: Change currentset attribute ::::: */

    addToCurrentset: function(node, id) {
        var currentset = node.getAttribute("currentset");
        if (!currentset)
            currentset = node.getAttribute("defaultset");
        currentset = currentset + (currentset == "" ? "" : ",") + id;
        node.setAttribute("currentset", currentset);
    },

    removeFromCurrentset: function(node, id) {
        var currentset = node.getAttribute("currentset");
        if (!currentset)
            currentset = node.getAttribute("defaultset");
        var re = new RegExp("(^|,)" + id + "($|,)");
        currentset = currentset.replace(re, "$2");
        node.setAttribute("currentset", currentset);
    },

    /* ::::: Use external utilities ::::: */

    findPathToExec: function(name) {
        // Return full path or null. Works like "which $name"

        var file = Cc["@mozilla.org/file/local;1"]
                     .createInstance(Ci.nsIFile);

        var env = Cc["@mozilla.org/process/environment;1"]
                    .getService(Ci.nsIEnvironment);
        var path = env.get("PATH").split(":");

        for (var i = 0; i < path.length; i++) {
            var full_path_to_exec = path[i] + "/" + name;

            file.initWithPath(full_path_to_exec);
            if (file.exists() && file.isExecutable()) {
                this.log("Command \"" + name + "\" was found in \"" + path[i] + "\"", "DEBUG");
                return full_path_to_exec;
            }
        }

        this.log("$PATH = " + path, "DEBUG");
        this.log("Command \"" + name + "\" not found", "ERROR");

        return null;
    },

    checkUtilsAvailable: function(utils) {
        var paths = {};
        for (var i = 0; i < utils.length; i++) {
            var path;
            if (this.utils[utils[i]] === undefined) {
                path = this.findPathToExec(utils[i]);
                this.utils[utils[i]] = path;
            }
            else {
                path = this.utils[utils[i]];
            }
            if (path == null)
                return null;
            paths[utils[i]] = path;
        }
        return paths;
    },

    checkPresenceGnomeShell: function() {
        this.log("Start checking DE", "DEBUG");

        var path = this.checkUtilsAvailable(["pidof"]);

        if (path.pidof) {
            var exitValue = HTitleToolsPrivate.execute(path.pidof, ["gnome-shell"]);
            return (exitValue == 1 ? 1 : 0);
        }
        else {
            this.log("pidof doesn't exist", "ERROR");
            return 2;
        }
    },

    /* ::::: Native window ::::: */

    changeWindowProperty: function(window, mode, action) {
        var X11 = Libs.open("X11");
        var Gdk = Libs.open("Gdk"+this.GDK_VERSION, X11);

        /* Get native window */
        var base_window = window.QueryInterface(Ci.nsIInterfaceRequestor)
                                .getInterface(Ci.nsIWebNavigation)
                                .QueryInterface(Ci.nsIDocShellTreeItem)
                                .treeOwner
                                .QueryInterface(Ci.nsIInterfaceRequestor)
                                .nsIBaseWindow;
        var native_handle = base_window.nativeHandle;

        var gdk_window = new Gdk.GdkWindow.ptr(ctypes.UInt64(native_handle));
        gdk_window = Gdk.Window.get_toplevel(gdk_window);

        var gdk_display = Gdk.Display.get_default();
        var x11_display = Gdk.X11Display.get_xdisplay(gdk_display);
        if (this.GDK_VERSION == 2) {
            var x11_window = Gdk.X11Window.get_xid(ctypes.cast(gdk_window, Gdk.GdkDrawable.ptr));
        }
        else {
            var x11_window = Gdk.X11Window.get_xid(gdk_window);
        }

        //Gdk.Window.hide(gdk_window);
        if (mode == "always") {
            Gdk.Window.set_decorations(gdk_window, (action == "set") ? Gdk.GDK_DECOR_BORDER : Gdk.GDK_DECOR_ALL);
        }
        else {
            if (this.GDK_VERSION == 2) {
                let x11_property = Gdk.x11_get_xatom_by_name_for_display(gdk_display, "_GTK_HIDE_TITLEBAR_WHEN_MAXIMIZED");
                if (action == "set") {
                    // let t = new Uint8Array([1]);
                    // let x11_data = ctypes.uint8_t.ptr(t);
                    let t = new Uint32Array([1]);
                    let x11_data = ctypes.uint32_t.ptr(t);
                    X11.XChangeProperty(x11_display, x11_window, x11_property, X11.XA_CARDINAL, 32, X11.PropModeReplace, x11_data, 1);
                }
                else {
                    X11.XDeleteProperty(x11_display, x11_window, x11_property);
                }
            }
            else {
                Gdk.X11Window.set_hide_titlebar_when_maximized(gdk_window, (action == "set"));
            }
        }
        //Gdk.Window.show(gdk_window);

        Libs.close(Gdk);
        Libs.close(X11);
    },

    setWindowProperty: function(window, mode) {
        try {
            this.changeWindowProperty(window, mode, "set");
        } catch (e) {
            return -1;
        }
        return 0;
    },

    removeWindowProperty: function(window, mode) {
        try {
            this.changeWindowProperty(window, mode, "remove");
        } catch (e) {
            return -1;
        }
        return 0;
    },

    lowerWindow: function(window) {
        var Gdk = Libs.open("Gdk"+this.GDK_VERSION, X11);
        var base_window = window.QueryInterface(Ci.nsIInterfaceRequestor)
                                .getInterface(Ci.nsIWebNavigation)
                                .QueryInterface(Ci.nsIDocShellTreeItem)
                                .treeOwner
                                .QueryInterface(Ci.nsIInterfaceRequestor)
                                .nsIBaseWindow;
        var native_handle = base_window.nativeHandle;
        var gdk_window = new Gdk.GdkWindow.ptr(ctypes.UInt64(native_handle));
        gdk_window = Gdk.Window.get_toplevel(gdk_window);
        Gdk.Window.lower(gdk_window);
        Libs.close(Gdk);
    },

    /* ::::: CSS stylesheets ::::: */

    loadStyle: function(name) {
        var sss = Cc["@mozilla.org/content/style-sheet-service;1"]
                    .getService(Ci.nsIStyleSheetService);
        var io = Cc["@mozilla.org/network/io-service;1"]
                   .getService(Ci.nsIIOService);
        var uri = io.newURI("chrome://htitle/skin/" + name + ".css", null, null);
        if (!sss.sheetRegistered(uri, sss.USER_SHEET))
            sss.loadAndRegisterSheet(uri, sss.USER_SHEET);
    },

    unloadStyle: function(name) {
        var sss = Cc["@mozilla.org/content/style-sheet-service;1"]
                    .getService(Ci.nsIStyleSheetService);
        var io = Cc["@mozilla.org/network/io-service;1"]
                   .getService(Ci.nsIIOService);
        var uri = io.newURI("chrome://htitle/skin/" + name + ".css", null, null);
        if (sss.sheetRegistered(uri, sss.USER_SHEET))
            sss.unregisterSheet(uri, sss.USER_SHEET);
    },

    /* ::::: Preferences ::::: */

    getWindowControlsLayout: function() {
        var layout = ":close"; // It's default for GNOME 3

        if (!this.prefs.getBoolPref("window_controls.get_layout_by_gsettings"))
            return layout;

        try {
            let gsettings = Cc["@mozilla.org/gsettings-service;1"]
                              .getService(Ci.nsIGSettingsService)
                              .getCollectionForSchema("org.gnome.shell.overrides");
            let button_layout = gsettings.getString("button-layout");
            if (/^([a-zA-Z0-9:,]*)$/.test(button_layout)) {
                layout = button_layout;
            }
            this.log("org.gnome.shell.overrides.button-layout = '" + button_layout + "'", "DEBUG");
        } catch(e) {
            this.log("GSettings isn't available", "WARNING");
            return layout;
        }

        return layout;
    },

    getTitlebarActions: function() {
        var actions = {double: "toggle-maximize",
                       middle: "lower",
                       right:  "menu"}; // It's default for GNOME 3

        if (!this.prefs.getBoolPref("titlebar.get_actions_by_gsettings"))
            return actions;

        try {
            let gsettings = Cc["@mozilla.org/gsettings-service;1"]
                              .getService(Ci.nsIGSettingsService)
                              .getCollectionForSchema("org.gnome.desktop.wm.preferences");

            actions.double = gsettings.getString("action-double-click-titlebar");
            actions.middle = gsettings.getString("action-middle-click-titlebar");
            actions.right = gsettings.getString("action-right-click-titlebar");

            this.log("org.gnome.desktop.wm.preferences.action-double-click-titlebar = '" + actions.double + "'", "DEBUG");
            this.log("org.gnome.desktop.wm.preferences.action-middle-click-titlebar = '" + actions.middle + "'", "DEBUG");
            this.log("org.gnome.desktop.wm.preferences.action-right-click-titlebar = '" + actions.right + "'", "DEBUG");
        } catch(e) {
            this.log("GSettings isn't available", "WARNING");
            return actions;
        }

        return actions;
    },

    /* ::::: Logging ::::: */

    log: function(message, level="ERROR") {
        if (this.DEBUG == false && level == "DEBUG")
            return;

        var console = Cc["@mozilla.org/consoleservice;1"]
                        .getService(Ci.nsIConsoleService);

        var flag;
        switch (level) {
            case "ERROR":
                flag = 0;
                break;
            case "WARNING":
                flag = 1;
                break;
            default:
                flag = 4;
        }

        if (flag == 4) {
            console.logStringMessage("HTitle DEBUG: " + message);
        }
        else {
            var console_message = Cc["@mozilla.org/scripterror;1"]
                                    .createInstance(Ci.nsIScriptError);
            console_message.init(message, "HTitle", null, null, null, flag, null);
            console.logMessage(console_message);
        }
    },
}

HTitleTools.init();
