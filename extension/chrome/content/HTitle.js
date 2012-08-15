/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var HTitle = {
    DEBUG: false,
    
    window: null,
    isFullscreen: false,
    stateBeforeFullscreen: 0,
    firstState: 0,
    magicCounter: 0,
    countSizeModeChange: 0,
    
    isMouseDown: false,
    
    init: function() {
        HTitle.window = document.getElementById("main-window");
        HTitle.isFullscreen = false;
        HTitle.stateBeforeFullscreen = 0;
        HTitle.firstState = 0;
        HTitle.magicCounter = 0;
        HTitle.countSizeModeChange = 0;
        
        if (HTitle.DEBUG)
            HTitle.onLog("init");
    },
    
    onWindowStateChange: function(e) {
        if (window.windowState == 4) {
            HTitle.isFullscreen = true;
            return;
        }
        
        if (HTitle.isFullscreen) {
            HTitle.isFullscreen = false;
            if (HTitle.stateBeforeFullscreen == 1)
                window.maximize();
            return;
        }
        
        if (HTitle.DEBUG) {
            switch (e.type) {
                case "resize": HTitle.magicCounter++; break;
                case "sizemodechange": HTitle.countSizeModeChange++; break;
            }
        }
        else if (e.type == "resize" && HTitle.magicCounter < 3)
            HTitle.magicCounter++;
        
        if (HTitle.DEBUG)
            HTitle.onLog(e.type);
        
        if (HTitle.firstState == 0) {
            HTitle.firstState = window.windowState;
        }
        
        if (e.type == "sizemodechange") {
            if (window.windowState == 1)
                HTitle.window.setAttribute("hidechrome", true);
            else if (HTitle.firstState == 1 && HTitle.magicCounter == 2) {
                // It's magic.
                window.maximize();
            }
        }
        
        if (e.type == "resize" && window.windowState == 3 && HTitle.window.getAttribute("hidechrome")) {
            HTitle.window.setAttribute("hidechrome", false);
        }
        
        HTitle.stateBeforeFullscreen = window.windowState;
        
        if (HTitle.DEBUG)
            HTitle.onLog(e.type + "2");
    },
    
    onLog: function(who) {
        switch (window.windowState) {
            case 1:  var windowState = "maximized"; break;
            case 3:  var windowState = "normal"; break;
            case 4:  var windowState = "fullscreen"; break;
            default: var windowState = window.windowState.toString();
        }
        
        Application.console.log(who + ": windowState = " + windowState + ";  hidechrome = " + HTitle.window.getAttribute("hidechrome") + "; magicCounter = " + HTitle.magicCounter + "; countSizeModeChange = " + HTitle.countSizeModeChange + "; isFullscreen = " + HTitle.isFullscreen + ".");
    },
    
    omMouseDown: function(e) {
        var e = e || window.event;
        if ('object' === typeof e) {
            if (e.button == 0)
                HTitle.isMouseDown = true;
        }
    },
    
    omMouseOut: function() {
        if (HTitle.isMouseDown) {
            window.restore();
            HTitle.isMouseDown = false;
        }
    },
    
    omMouseUp: function() {
        HTitle.isMouseDown = false;
    },
}

window.addEventListener("load",           HTitle.init);
window.addEventListener("resize",         HTitle.onWindowStateChange);
window.addEventListener("sizemodechange", HTitle.onWindowStateChange);
