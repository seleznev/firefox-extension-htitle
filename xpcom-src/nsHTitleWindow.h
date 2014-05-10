#ifndef nsHTitleWindow_h
#define nsHTitleWindow_h

#include "nsIHTitleWindow.h"

#define NS_HTITLEWINDOW_CONTRACTID "@seleznev.github.com/htitle-window;1"
#define NS_HTITLEWINDOW_CLASSNAME "HTitle XPCOM Interface"
#define NS_HTITLEWINDOW_CID { 0x2d641949, 0x5f4b, 0x426f, { 0xb9, 0x69, 0x37, 0x77, 0x9a, 0x97, 0x6e, 0xa3 } }

class nsHTitleWindow : public nsIHTitleWindow
{
public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSIHTITLEWINDOW

  nsHTitleWindow();

private:
  ~nsHTitleWindow();

protected:
  /* additional members */
};

#endif

