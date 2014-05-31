/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/ctypes.jsm");

Cu.import("chrome://htitle/content/X11.jsm");
Cu.import("chrome://htitle/content/Gdk.jsm");

var EXPORTED_SYMBOLS = ["HTitleTools"];

function execute(path, args, needWait=true) {
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

var HTitleTools = {
    DEBUG: false,
    appInfo: null,
    versionComparator: null,
    prefs: null,

    windowControlsLayout: null,
    titlebarActions: null,

    utils: {},
    defaultMethodFailed: false,

    timeoutCheck: 200, // ms
    timeoutBetweenChanges: 200, // ms

    isInitialized: false,

    init: function() {
        if (this.isInitialized) {
            this.log("Already initialized", "DEBUG");
            return;
        }
        
        this.prefs = Cc["@mozilla.org/preferences-service;1"]
                       .getService(Ci.nsIPrefService)
                       .getBranch("extensions.htitle.");

        this.DEBUG = this.prefs.getBoolPref("debug");

        this.appInfo = Cc["@mozilla.org/xre/app-info;1"]
                         .getService(Ci.nsIXULAppInfo);

        this.versionComparator = Cc["@mozilla.org/xpcom/version-comparator;1"]
                                   .getService(Ci.nsIVersionComparator);

        this.timeoutCheck = this.prefs.getIntPref("legacy_mode.timeout_check");
        this.timeoutBetweenChanges = this.prefs.getIntPref("legacy_mode.timeout_between_changes");

        Services.obs.addObserver(this.pref_page_observer, "addon-options-displayed", false);

        HTitleTools.windowControlsLayout = HTitleTools.getWindowControlsLayout();
        HTitleTools.titlebarActions = HTitleTools.getTitlebarActions();

        this.isInitialized = true;
    },

    /* ::::: App info functions ::::: */

    isFirefox: function() {
        if (this.appInfo.ID == "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}") {
            return true;
        }
        return false;
    },

    isThunderbird: function() {
        if (this.appInfo.ID == "{3550f703-e582-4d05-9a08-453d09bdfdc6}") {
            return true;
        }
        return false;
    },

    isAustralisUI: function() {
        if (this.isFirefox) {
            return this.versionComparator.compare(this.appInfo.version, "29.0a1") >= 0;
        }
        return false;
    },

    getWMClass: function() {
        return '"' + (this.isThunderbird() ? 'Mail' : 'Navigator') + '" "' + this.appInfo.name + '"';
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

    moveWindowControlsTo: function(windowctls, target) {
        this.removeFromCurrentset(windowctls.parentNode, windowctls.id);
        target.appendChild(windowctls);
        this.addToCurrentset(target, windowctls.id);
        this.log("Close button moved to #" + target.id, "DEBUG");
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

    getNativeWindow: function(window) {
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
        var x11_display = GdkX11.X11Display.get_xdisplay(gdk_display);
        var x11_window = Gdk.gdk_x11_drawable_get_xid(ctypes.cast(gdk_window, Gdk.GdkDrawable.ptr));

        return [gdk_window, x11_window, gdk_display, x11_display];
    },

    setWindowProperty: function(window, mode) {
        if (X11 === null || Gdk === null) {
            return -1;
        }
        var [gdk_window, x11_window, gdk_display, x11_display] = this.getNativeWindow(window);
        //Gdk.Window.hide(gdk_window);
        if (mode == "always") {
            Gdk.Window.set_decorations(gdk_window, Gdk.GDK_DECOR_BORDER);
        }
        else {
            let x11_property = GdkX11.x11_get_xatom_by_name_for_display(gdk_display, "_GTK_HIDE_TITLEBAR_WHEN_MAXIMIZED");
            // let t = new Uint8Array([1]);
            // let x11_data = ctypes.uint8_t.ptr(t);
            let t = new Uint32Array([1]);
            let x11_data = ctypes.uint32_t.ptr(t);
            X11.XChangeProperty(x11_display, x11_window, x11_property, X11.XA_CARDINAL, 32, X11.PropModeReplace, x11_data, 1);
        }
        return 0;
    },

    removeWindowProperty: function(window, mode) {
        if (X11 === null || Gdk === null) {
            return -1;
        }
        var [gdk_window, x11_window, gdk_display, x11_display] = this.getNativeWindow(window);
        //Gdk.Window.hide(gdk_window);
        if (mode == "always") {
            Gdk.Window.set_decorations(gdk_window, Gdk.GDK_DECOR_ALL);
        }
        else {
            let x11_property = GdkX11.x11_get_xatom_by_name_for_display(gdk_display, "_GTK_HIDE_TITLEBAR_WHEN_MAXIMIZED");
            X11.XDeleteProperty(x11_display, x11_window, x11_property);
        }
        //Gdk.Window.show(gdk_window);
        return 0;
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

    checkPresenceGnomeShell: function() {
        this.log("Start checking DE", "DEBUG");

        var path = this.checkUtilsAvailable(["pidof"]);

        if (path.pidof) {
            var exitValue = execute(path.pidof, ["gnome-shell"]);
            return (exitValue == 1 ? 1 : 0);
        }
        else {
            this.log("pidof doesn't exist", "ERROR");
            return 2;
        }
    },

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

    lowerWindow: function(window) {
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
    },

    pref_page_observer: {
        observe: function(aSubject, aTopic, aData) {
            if (aTopic == "addon-options-displayed" && aData == "{c6448328-31f7-4b12-a2e0-5c39d0290307}") {
                if (this.defaultMethodFailed || X11 === null || Gdk === null) {
                    var legacy_mode = aSubject.getElementById("legacy-mode");
                    legacy_mode.setAttribute("disabled", "true");
                    legacy_mode.setAttribute("selected", "true");

                    let bundle = Cc["@mozilla.org/intl/stringbundle;1"]
                                   .getService(Ci.nsIStringBundleService)
                                   .createBundle("chrome://htitle/locale/settings.properties");

                    legacy_mode.setAttribute("desc", bundle.GetStringFromName("enableLegacyMethod.description"));

                    var hide_mode_auto = aSubject.getElementById("hide-mode-auto");
                    hide_mode_auto.setAttribute("selected", "true");

                    var hide_mode_always = aSubject.getElementById("hide-mode-always");
                    hide_mode_always.setAttribute("disabled", "true");
                }
            }
        }
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
