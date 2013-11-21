/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

var HTitleTools = {
    DEBUG: false,
    appInfo: null,
    prefs: null,
    
    init: function() {
        this.prefs = Cc["@mozilla.org/preferences-service;1"]
                       .getService(Ci.nsIPrefService)
                       .getBranch("extensions.htitle.");

        this.DEBUG = this.prefs.getBoolPref("debug");

        this.appInfo = Cc["@mozilla.org/xre/app-info;1"]
                         .getService(Ci.nsIXULAppInfo);
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
                this.log("Command \"" + name + "\" is found in \"" + path[i] + "\"", "DEBUG");
                return full_path_to_exec;
            }
        }

        this.log("$PATH = " + path, "DEBUG");
        this.log("Command \"" + name + "\" not found", "ERROR");

        return null;
    },

    run: function(path, args, needWait=true) {
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
            this.log(error.message, "ERROR");
            return -1;
        }

        if (needWait) {
            this.log("Exit value of " + path + " is \"" + process.exitValue + "\"", "DEBUG");
            return process.exitValue;
        }
        else
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

        var pidof_path = this.findPathToExec("pidof");

        if (pidof_path) {
            var exitValue = this.run(pidof_path, ["gnome-shell"]);
            return (exitValue == 1 ? 1 : 0);
        }
        else {
            this.log("pidof doesn't exist", "ERROR");
            return 2;
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
