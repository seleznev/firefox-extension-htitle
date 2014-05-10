#include "nsHTitleWindow.h"

#include <X11/Xatom.h>
#include <gdk/gdkx.h>
#include "nsIWidget.h"

NS_IMPL_ISUPPORTS1(nsHTitleWindow, nsIHTitleWindow)

nsHTitleWindow::nsHTitleWindow() {
}

nsHTitleWindow::~nsHTitleWindow() {
}

/* long setHideTitlebarWhenMaximized (in nsIBaseWindow aWindow); */
NS_IMETHODIMP nsHTitleWindow::SetHideTitlebarWhenMaximized(nsIBaseWindow *aWindow, int32_t *_retval) {
    nsCOMPtr< nsIWidget > widget;
    aWindow->GetMainWidget(getter_AddRefs(widget));

    if (widget) {
        GdkWindow  *native_window = (GdkWindow*) widget->GetNativeData(NS_NATIVE_WINDOW);
        GdkDisplay *display = gdk_window_get_display(native_window);

        bool wasVisible = false;
        if (gdk_window_is_visible(native_window)) {
            gdk_window_hide(native_window);
            wasVisible = true;
        }

        long hide_titlebar_when_maximized = 1;
        XChangeProperty(GDK_DISPLAY_XDISPLAY(display),
                        GDK_WINDOW_XID(native_window),
                        gdk_x11_get_xatom_by_name_for_display(display, "_GTK_HIDE_TITLEBAR_WHEN_MAXIMIZED"),
                        XA_CARDINAL, 32,
                        PropModeReplace, (unsigned char*)&hide_titlebar_when_maximized, 1);
        /*
        XDeleteProperty(GDK_DISPLAY_XDISPLAY(display),
                        GDK_WINDOW_XID(native_window),
                        gdk_x11_get_xatom_by_name_for_display(display, "_GTK_HIDE_TITLEBAR_WHEN_MAXIMIZED"));
        */

        if (wasVisible)
            gdk_window_show(native_window);

        *_retval = 0;
    }

    *_retval = 1;
    return NS_OK;
}
