/*
 * DO NOT EDIT.  THIS FILE IS GENERATED FROM nsIHTitleWindow.idl
 */

#ifndef __gen_nsIHTitleWindow_h__
#define __gen_nsIHTitleWindow_h__


#ifndef __gen_nsISupports_h__
#include "nsISupports.h"
#endif

#ifndef __gen_nsIBaseWindow_h__
#include "nsIBaseWindow.h"
#endif

/* For IDL files that don't want to include root IDL files. */
#ifndef NS_NO_VTABLE
#define NS_NO_VTABLE
#endif

/* starting interface:    nsIHTitleWindow */
#define NS_IHTITLEWINDOW_IID_STR "2d641949-5f4b-426f-b969-37779a976ea3"

#define NS_IHTITLEWINDOW_IID \
  {0x2d641949, 0x5f4b, 0x426f, \
    { 0xb9, 0x69, 0x37, 0x77, 0x9a, 0x97, 0x6e, 0xa3 }}

class NS_NO_VTABLE nsIHTitleWindow : public nsISupports {
 public: 

  NS_DECLARE_STATIC_IID_ACCESSOR(NS_IHTITLEWINDOW_IID)

  /* long setHideTitlebarWhenMaximized (in nsIBaseWindow aWindow); */
  NS_IMETHOD SetHideTitlebarWhenMaximized(nsIBaseWindow *aWindow, int32_t *_retval) = 0;

};

  NS_DEFINE_STATIC_IID_ACCESSOR(nsIHTitleWindow, NS_IHTITLEWINDOW_IID)

/* Use this macro when declaring classes that implement this interface. */
#define NS_DECL_NSIHTITLEWINDOW \
  NS_IMETHOD SetHideTitlebarWhenMaximized(nsIBaseWindow *aWindow, int32_t *_retval); 

/* Use this macro to declare functions that forward the behavior of this interface to another object. */
#define NS_FORWARD_NSIHTITLEWINDOW(_to) \
  NS_IMETHOD SetHideTitlebarWhenMaximized(nsIBaseWindow *aWindow, int32_t *_retval) { return _to SetHideTitlebarWhenMaximized(aWindow, _retval); } 

/* Use this macro to declare functions that forward the behavior of this interface to another object in a safe way. */
#define NS_FORWARD_SAFE_NSIHTITLEWINDOW(_to) \
  NS_IMETHOD SetHideTitlebarWhenMaximized(nsIBaseWindow *aWindow, int32_t *_retval) { return !_to ? NS_ERROR_NULL_POINTER : _to->SetHideTitlebarWhenMaximized(aWindow, _retval); } 

#if 0
/* Use the code below as a template for the implementation class for this interface. */

/* Header file */
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

/* Implementation file */
NS_IMPL_ISUPPORTS1(nsHTitleWindow, nsIHTitleWindow)

nsHTitleWindow::nsHTitleWindow()
{
  /* member initializers and constructor code */
}

nsHTitleWindow::~nsHTitleWindow()
{
  /* destructor code */
}

/* long setHideTitlebarWhenMaximized (in nsIBaseWindow aWindow); */
NS_IMETHODIMP nsHTitleWindow::SetHideTitlebarWhenMaximized(nsIBaseWindow *aWindow, int32_t *_retval)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* End of implementation class template. */
#endif


#endif /* __gen_nsIHTitleWindow_h__ */
