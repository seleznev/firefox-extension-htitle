/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var HTitle = {
    DEBUG: false,
    
    window: null,
    isFullscreen: false,
    stateBeforeFullscreen: 0,
    firstState: 0,
    magicCounter1: 0,
    magicCounter2: 0,
    
    needMagic: true,
    aMaximize: [ 202, 302, 402 ],
    aShowTitle: [],
    aNotMaximize: [], /* 101, 301 */
    
    isMouseDown: false,
    
    init: function() {
        HTitle.DEBUG = Application.prefs.getValue("extensions.htitle.debug", false);
        
        HTitle.window = document.getElementById("main-window");
        
        if (HTitle.DEBUG)
            HTitle.onLog("init");
    },
    
    isNeedMagic: function(mCounter1, mCounter2, mArray) {
        mNumber = mCounter1 * 100 + mCounter2;
        
        var length = mArray.length;
        for (var i = 0; i < length; i++) {
            if (mArray[i] == mNumber)
                return true;
        }
        return false;
    },
    
    onWindowStateChange: function(e) {
        if (HTitle.window == null) {
            if ((HTitle.window = document.getElementById("main-window")) == null) {
                if (HTitle.DEBUG)
                    HTitle.pushLog("Error!", "HTitle.window == null");
                return;
            }
        }
        
        if (HTitle.firstState == 0) {
            HTitle.firstState = window.windowState;
            if (HTitle.DEBUG)
                HTitle.onLog("FirstState");
        }
        
        if (window.windowState == window.STATE_FULLSCREEN) {
            HTitle.isFullscreen = true;
            return;
        }
        
        if (HTitle.isFullscreen) {
            HTitle.isFullscreen = false;
            if (HTitle.stateBeforeFullscreen == window.STATE_MAXIMIZED)
                window.maximize();
            return;
        }
        
        if (HTitle.DEBUG || (HTitle.magicCounter1 < 5 && HTitle.magicCounter2 < 5) ) {
            switch (e.type) {
                case "resize": HTitle.magicCounter1++; break;
                case "sizemodechange": HTitle.magicCounter2++; break;
            }
        }
        
        if (HTitle.DEBUG)
            HTitle.onLog(e.type);
        
        if (e.type == "sizemodechange") {
            if (window.windowState == window.STATE_MAXIMIZED)
                if (HTitle.needMagic) {
                    // Not need maximizied
                    if (
                            HTitle.firstState == window.STATE_NORMAL &&
                            HTitle.isNeedMagic(HTitle.magicCounter1, HTitle.magicCounter2, HTitle.aNotMaximize)
                    ) {
                        window.restore();
                        HTitle.needMagic = false;
                    }
                    else
                        HTitle.window.setAttribute("hidechrome", true);
                }
                else
                    HTitle.window.setAttribute("hidechrome", true);
            else {
                if (HTitle.needMagic) {
                    // Need maximizied
                    if (
                            HTitle.firstState == window.STATE_MAXIMIZED &&
                            HTitle.isNeedMagic(HTitle.magicCounter1, HTitle.magicCounter2, HTitle.aMaximize)
                    ) {
                        window.maximize();
                        HTitle.needMagic = false;
                    }
                    
                    // Need show title
                    if (
                            HTitle.firstState == window.STATE_NORMAL &&
                            HTitle.isNeedMagic(HTitle.magicCounter1, HTitle.magicCounter2, HTitle.aShowTitle)
                    ) {
                        HTitle.window.setAttribute("hidechrome", false);
                        HTitle.needMagic = false;
                    }
                }
            }
        }
        
        if (e.type == "resize" && window.windowState == window.STATE_NORMAL && HTitle.window.getAttribute("hidechrome")) {
            HTitle.window.setAttribute("hidechrome", false);
        }
        
        HTitle.stateBeforeFullscreen = window.windowState;
        
        if (HTitle.DEBUG)
            HTitle.onLog(e.type + "_end");
    },
    
    onMouseDown: function(e) {
        var e = e || window.event;
        if ('object' === typeof e) {
            if (e.button == 0)
                HTitle.isMouseDown = true;
        }
    },
    
    onMouseOut: function() {
        if (HTitle.isMouseDown) {
            window.restore();
            HTitle.isMouseDown = false;
        }
    },
    
    onMouseUp: function() {
        HTitle.isMouseDown = false;
    },
    
    onClick: function() {
        if (HTitle.DEBUG) {
            HTitle.onLog("onClick");
            HTitle.pushLog(HTitle.logStr);
            HTitle.logStr = "";
        }
        if (window.windowState == window.STATE_NORMAL && HTitle.window.getAttribute("hidechrome")) {
            HTitle.window.setAttribute("hidechrome", false);
        }
    },
    
    logStr: "",
    logStrCount: 0,
    
    onLog: function(who) {
        switch (window.windowState) {
            case window.STATE_MAXIMIZED:   var windowState = "maximized"; break;
            case window.STATE_NORMAL:      var windowState = "normal"; break;
            case window.STATE_FULLSCREEN:  var windowState = "fullscreen"; break;
            default: var windowState = window.windowState.toString();
        }
        
        HTitle.logStr += who + ": windowState = " + windowState + ";  hidechrome = " + HTitle.window.getAttribute("hidechrome") + "; magicCounter1 = " + HTitle.magicCounter1 + "; magicCounter2 = " + HTitle.magicCounter2 + "; isFullscreen = " + HTitle.isFullscreen + ".\n";
        
        if (HTitle.logStrCount++ > 50) {
            HTitle.pushLog(HTitle.logStr);
            HTitle.logStr = "";
            HTitle.logStrCount = 0;
        }
    },
    
    pushLog: function(message="", title="") {
        Application.console.log(":: HTitle debug log" + " - " + title + "\n" + message + ":: End");
    },
    
    disableMagic: function(e) {
        if (HTitle.DEBUG) {
            HTitle.onLog("disableMagic");
        }
        HTitle.needMagic = false;
        window.removeEventListener("mousemove", HTitle.disableMagic);
    },
}

window.addEventListener("load",           HTitle.init);
window.addEventListener("resize",         HTitle.onWindowStateChange);
window.addEventListener("sizemodechange", HTitle.onWindowStateChange);
window.addEventListener("mousemove",      HTitle.disableMagic);
