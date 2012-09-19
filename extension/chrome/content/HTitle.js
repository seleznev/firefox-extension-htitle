/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var HTitle = {
    DEBUG: true,
    
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
        HTitle.window = document.getElementById("main-window");
        HTitle.isFullscreen = false;
        HTitle.stateBeforeFullscreen = 0;
        HTitle.firstState = 0;
        HTitle.magicCounter1 = 0;
        HTitle.magicCounter2 = 0;
        
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
        if (HTitle.firstState == 0 && e.type == "sizemodechange") {
            HTitle.firstState = window.windowState;
            if (HTitle.DEBUG)
                HTitle.onLog("FirstState");
        }
        
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
                case "resize": HTitle.magicCounter1++; break;
                case "sizemodechange": HTitle.magicCounter2++; break;
            }
        }
        else if (e.type == "resize" && HTitle.magicCounter1 < 4)
            HTitle.magicCounter1++;
        
        if (HTitle.DEBUG)
            HTitle.onLog(e.type);
        
        if (e.type == "sizemodechange") {
            if (window.windowState == 1)
                if (HTitle.needMagic) {
                    // Not need maximizied
                    if (
                            HTitle.firstState == 3 &&
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
                            HTitle.firstState == 1 &&
                            HTitle.isNeedMagic(HTitle.magicCounter1, HTitle.magicCounter2, HTitle.aMaximize)
                    ) {
                        window.maximize();
                        HTitle.needMagic = false;
                    }
                    
                    // Need show title
                    if (
                            HTitle.firstState == 3 &&
                            HTitle.isNeedMagic(HTitle.magicCounter1, HTitle.magicCounter2, HTitle.aShowTitle)
                    ) {
                        HTitle.window.setAttribute("hidechrome", false);
                        HTitle.needMagic = false;
                    }
                }
            }
        }
        
        if (e.type == "resize" && window.windowState == 3 && HTitle.window.getAttribute("hidechrome")) {
            HTitle.window.setAttribute("hidechrome", false);
        }
        
        HTitle.stateBeforeFullscreen = window.windowState;
        
        if (HTitle.DEBUG)
            HTitle.onLog(e.type + "2");
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
        if (window.windowState == 3 && HTitle.window.getAttribute("hidechrome")) {
            //if (HTitle.DEBUG)
            //    HTitle.onLog("onClick");
            HTitle.window.setAttribute("hidechrome", false);
        }
    },
    
    logStr: "",
    
    onLog: function(who) {
        switch (window.windowState) {
            case 1:  var windowState = "maximized"; break;
            case 3:  var windowState = "normal"; break;
            case 4:  var windowState = "fullscreen"; break;
            default: var windowState = window.windowState.toString();
        }
        
        HTitle.logStr += who + ": windowState = " + windowState + ";  hidechrome = " + HTitle.window.getAttribute("hidechrome") + "; magicCounter1 = " + HTitle.magicCounter1 + "; magicCounter2 = " + HTitle.magicCounter2 + "; isFullscreen = " + HTitle.isFullscreen + ".\n";
        
        //Application.console.log(who + ": windowState = " + windowState + ";  hidechrome = " + HTitle.window.getAttribute("hidechrome") + "; magicCounter1 = " + HTitle.magicCounter1 + "; magicCounter2 = " + HTitle.magicCounter2 + "; isFullscreen = " + HTitle.isFullscreen + ".");
    },
    
    disableMagic: function(e) {
        if (HTitle.needMagic) {
            Application.console.log(":: HTitle debug log\n" + HTitle.logStr + ":: End");
            HTitle.logStr = "";
        }
        HTitle.needMagic = false;
    },
}

window.addEventListener("load",           HTitle.init);
window.addEventListener("resize",         HTitle.onWindowStateChange);
window.addEventListener("sizemodechange", HTitle.onWindowStateChange);
window.addEventListener("mousemove",      HTitle.disableMagic);
