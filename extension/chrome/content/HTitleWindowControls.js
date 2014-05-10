/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var HTitleWindowControls = {
    observers: [],

    init: function() {
        var windowctls = document.getElementById("window-controls");

        if (!windowctls) {
            return;
        }

        windowctls.setAttribute("htitle", "true");
        windowctls.setAttribute("htitle-button-layout", HTitleWindowControls.getWindowControlsLayout());

        window.addEventListener("sizemodechange", HTitleWindowControls.updateWindowControlsPosition);
        var targets_map = [
                ["TabsToolbar", "tabsontop"],
                ["toolbar-menubar", "autohide"]
            ];
        targets_map.push(["nav-bar", "default-tabs-position"]);

        for (var i = 0; i < targets_map.length; i++) {
            var tempObserver = new MutationObserver(function(mutations) {
                mutations.forEach(HTitleWindowControls.updateWindowControlsPosition);
            });
            tempObserver.observe(document.getElementById(targets_map[i][0]), { attributes: true, attributeFilter: [targets_map[i][1]] });
            HTitleWindowControls.observers.push(tempObserver);
        }

        HTitleWindowControls.updateWindowControlsPosition();
    },

    /* ::::: Get user's global preferences ::::: */

    getWindowControlsLayout: function() {
        var layout = ":close"; // It's default for GNOME 3

        try {
            let gsettings = Cc["@mozilla.org/gsettings-service;1"]
                              .getService(Ci.nsIGSettingsService)
                              .getCollectionForSchema("org.gnome.shell.overrides");
            let button_layout = gsettings.getString("button-layout");
            if (/^([a-zA-Z0-9:,]*)$/.test(button_layout)) {
                layout = button_layout;
            }
        } catch(e) {}

        return layout;
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
        HTitleWindowControls.removeFromCurrentset(windowctls.parentNode, windowctls.id);
        target.appendChild(windowctls);
        HTitleWindowControls.addToCurrentset(target, windowctls.id);
    },

    /* ::::: Move window controls to correct place ::::: */

    updateWindowControlsPosition: function() {
        var windowctls = document.getElementById("window-controls");

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
                spring.setAttribute("removable", "false");
                spring.setAttribute("flex", "1");
                HTitleWindowControls.addToCurrentset(menubar, "htitle-menubar-spring");
                menubar.appendChild(spring);
            }

            HTitleWindowControls.moveWindowControlsTo(windowctls, menubar);
        }
        else if (tabsontop || navbar.collapsed) {
            // Moving to the Tabs toolbar
            if (tabsbar == windowctls.parentNode)
                return;
            HTitleWindowControls.moveWindowControlsTo(windowctls, tabsbar);
        }
        else {
            // Moving to the Navigation toolbar
            if (navbar == windowctls.parentNode)
                return;
            HTitleWindowControls.moveWindowControlsTo(windowctls, navbar);
        }

        windowctls.removeAttribute("flex");
    }
}

window.addEventListener("load", HTitleWindowControls.init);
