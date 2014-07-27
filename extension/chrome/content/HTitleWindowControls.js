/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Components.utils.import("chrome://htitle/content/HTitleUtils.jsm");

var HTitleWindowControls = {
    observers: [],

    setLayoutAttribute: function() {
        var windowctls = document.getElementById("window-controls");
        if (windowctls) {
            windowctls.setAttribute("htitlebuttonlayout", HTitleUtils.windowControlsLayout);
        }
    },

    show: function() {
        var windowctls = document.getElementById("window-controls");
        windowctls.setAttribute("htitle", "true");
        HTitleUtils.loadStyle("windowControls"); // Appling CSS

        if (HTitleUtils.isFirefox()) {
            window.addEventListener("sizemodechange", HTitleWindowControls.updatePosition);

            var targets_map = [
                    ["toolbar-menubar", "autohide"],
                    ["TabsToolbar", "tabsontop"],
                    ["TabsToolbar", "collapsed"],
                    ["nav-bar", "default-tabs-position"],
                ];
        }
        else {
            var targets_map = [
                    ["mail-toolbar-menubar2", "autohide"],
                    ["tabs-toolbar", "collapsed"],
                ];
        }

        for (let i = 0; i < targets_map.length; i++) {
            var tempObserver = new MutationObserver(function(mutations) {
                mutations.forEach(HTitleWindowControls.updatePosition);
            });
            tempObserver.observe(document.getElementById(targets_map[i][0]), { attributes: true, attributeFilter: [targets_map[i][1]] });
            HTitleWindowControls.observers.push(tempObserver);
        }
        HTitleUtils.log("HTitleWindowControls.Observers = " + HTitleWindowControls.observers.length, "DEBUG");

        HTitleWindowControls.updatePosition();
    },

    hide: function() {
        HTitleUtils.unloadStyle("windowControls");

        var spring = document.getElementById("htitle-menubar-spring");
        if (spring)
            spring.remove();

        var windowctls = document.getElementById("window-controls");
        windowctls.removeAttribute("htitle");
        //windowctls.setAttribute("flex", "1");

        if (HTitleUtils.isFirefox()) {
            window.removeEventListener("sizemodechange", HTitleWindowControls.updatePosition);

            let navbar = document.getElementById("nav-bar");
            HTitleWindowControls.moveTo(windowctls, navbar);
        }

        for (let i = 0; i < HTitleWindowControls.observers.length; i++) {
            HTitleWindowControls.observers[i].disconnect();
        }
        HTitleWindowControls.observers = [];
    },

    updatePosition: function() {
        var windowctls = document.getElementById("window-controls");
        if (!windowctls)
            return;

        if (HTitleUtils.isFirefox()) {
            var menubar = document.getElementById("toolbar-menubar");
            var tabsbar = document.getElementById("TabsToolbar");
            var mainbar = document.getElementById("nav-bar");
        }
        else {
            var menubar = document.getElementById("mail-toolbar-menubar2");
            var tabsbar = document.getElementById("tabs-toolbar");
            var mainbar = document.getElementById("mail-bar3");
        }
        if (!menubar || !tabsbar || !mainbar) {
            return;
        }

        /* Get tabsontop value */
        var tabsontop = true; // Default
        if (HTitleUtils.isFirefox()) {
            if (tabsbar.getAttribute("tabsontop") === "") {
                tabsontop = mainbar.getAttribute("default-tabs-position") != "bottom";
            }
            else {
                tabsontop = tabsbar.getAttribute("tabsontop") != "false";
            }
        }

        if (menubar.getAttribute("autohide") != "true" && window.windowState != window.STATE_FULLSCREEN) {
            // Moving to the Menu bar
            if (menubar == windowctls.parentNode)
                return;

            let need_spring = true;
            let nodes = menubar.childNodes;
            for (let i = 0; i < nodes.length; i++) {
                if (parseInt(nodes[i].getAttribute("flex"), 10) >= 1) {
                    need_spring = false;
                    break;
                }
            }

            if (need_spring) {
                let spring = document.createElement("toolbarspring");
                spring.setAttribute("id", "htitle-menubar-spring");
                spring.setAttribute("removable", "false");
                spring.setAttribute("flex", "1");
                HTitleUtils.addToCurrentset(menubar, "htitle-menubar-spring");
                menubar.appendChild(spring);
            }

            HTitleWindowControls.moveTo(windowctls, menubar);
        }
        else if ((tabsontop && !tabsbar.collapsed) || mainbar.collapsed) {
            // Moving to the Tabs toolbar
            if (tabsbar == windowctls.parentNode)
                return;
            HTitleWindowControls.moveTo(windowctls, tabsbar);
        }
        else {
            // Moving to the Navigation/Mail toolbar
            if (mainbar == windowctls.parentNode)
                return;
            HTitleWindowControls.moveTo(windowctls, mainbar);
        }

        windowctls.removeAttribute("flex");
    },

    moveTo: function(windowctls, target) {
        HTitleUtils.removeFromCurrentset(windowctls.parentNode, windowctls.id);
        target.appendChild(windowctls);
        HTitleUtils.addToCurrentset(target, windowctls.id);
        HTitleUtils.log("Window controls moved to #" + target.id, "DEBUG");
    },
}
