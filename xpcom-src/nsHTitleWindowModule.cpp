#include "mozilla/ModuleUtils.h"

#include "nsHTitleWindow.h"

NS_GENERIC_FACTORY_CONSTRUCTOR(nsHTitleWindow)

NS_DEFINE_NAMED_CID(NS_HTITLEWINDOW_CID);

static const mozilla::Module::CIDEntry kHTitleWindowCIDs[] = {
    { &kNS_HTITLEWINDOW_CID, false, nullptr, nsHTitleWindowConstructor },
    { nullptr }
};

static const mozilla::Module::ContractIDEntry kHTitleWindowContracts[] = {
    { NS_HTITLEWINDOW_CONTRACTID, &kNS_HTITLEWINDOW_CID },
    { nullptr }
};

static const mozilla::Module::CategoryEntry kHTitleWindowCategories[] = {
    { nullptr }
};

static const mozilla::Module kHTitleWindowModule = {
    mozilla::Module::kVersion,
    kHTitleWindowCIDs,
    kHTitleWindowContracts,
    kHTitleWindowCategories
};

NSMODULE_DEFN(nsHTitleWindowModule) = &kHTitleWindowModule;

