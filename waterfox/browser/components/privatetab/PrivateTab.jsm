/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ["PrivateTab"];

const { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

const { ContextualIdentityService } = ChromeUtils.import(
  "resource://gre/modules/ContextualIdentityService.jsm"
);

const { PlacesUIUtils } = ChromeUtils.import(
  "resource:///modules/PlacesUIUtils.jsm"
);

const { TabStateCache } = ChromeUtils.import(
  "resource:///modules/sessionstore/TabStateCache.jsm"
);

const { TabStateFlusher } = ChromeUtils.import(
  "resource:///modules/sessionstore/TabStateFlusher.jsm"
);

const { BrowserUtils } = ChromeUtils.import(
  "resource:///modules/BrowserUtils.jsm"
);

const { PrefUtils } = ChromeUtils.import("resource:///modules/PrefUtils.jsm");

const PrivateTab = {
  config: {
    neverClearData: false, // TODO: change to pref controlled value; if you want to not record history but don"t care about other data, maybe even want to keep private logins
    restoreTabsOnRestart: true,
    doNotClearDataUntilFxIsClosed: false,
  },

  openTabs: new Set(),

  BTN_ID: "privateTab-button",
  BTN2_ID: "newPrivateTab-button",

  get style() {
    return `
     @-moz-document url('chrome://browser/content/browser.xhtml') {
       #private-mask[enabled="true"] {
         display: block !important;
       }
       #${this.BTN_ID}, #${this.BTN2_ID} {
         list-style-image: url(chrome://browser/skin/privateBrowsing.svg);
       }
       #tabbrowser-tabs[hasadjacentnewprivatetabbutton]:not([overflow="true"]) ~ #${this.BTN_ID},
       #tabbrowser-tabs[overflow="true"] > #tabbrowser-arrowscrollbox > #${this.BTN2_ID},
       #tabbrowser-tabs:not([hasadjacentnewprivatetabbutton]) > #tabbrowser-arrowscrollbox > #${this.BTN2_ID},
       #TabsToolbar[customizing="true"] #${this.BTN2_ID} {
         display: none;
       }
       .tabbrowser-tab[usercontextid="${this.container.userContextId}"] .tab-label {
         text-decoration: underline !important;
         text-decoration-color: -moz-nativehyperlinktext !important;
         text-decoration-style: dashed !important;
       }
       .tabbrowser-tab[usercontextid="${this.container.userContextId}"][pinned] .tab-icon-image,
       .tabbrowser-tab[usercontextid="${this.container.userContextId}"][pinned] .tab-throbber {
         border-bottom: 1px dashed -moz-nativehyperlinktext !important;
       }
     }
   `;
  },

  init(window) {
    // Only init in a non-private window
    if (!window.PrivateBrowsingUtils.isWindowPrivate(window)) {
      window.PrivateTab = this;
      this.initContainer("Private");
      this.initObservers(window);
      this.initListeners(window);
      this.initCustomFunctions(window);
      this.overridePlacesUIUtils();
      this.updatePrivateMaskId(window);
      BrowserUtils.setStyle(this.style);
    }
  },

  initContainer(aName) {
    ContextualIdentityService.ensureDataReady();
    this.container = ContextualIdentityService._identities.find(
      container => container.name == aName
    );
    if (!this.container) {
      ContextualIdentityService.create(aName, "fingerprint", "purple");
      this.container = ContextualIdentityService._identities.find(
        container => container.name == aName
      );
    } else if (!this.config.neverClearData) {
      this.clearData();
    }
    return this.container;
  },

  clearData() {
    Services.clearData.deleteDataFromOriginAttributesPattern({
      userContextId: this.container.userContextId,
    });
  },

  initObservers(aWindow) {
    this.setPrivateObserver();
  },

  initListeners(aWindow) {
    this.initPrivateTabListeners(aWindow);
    aWindow.document
      .getElementById("placesContext")
      ?.addEventListener("popupshowing", this.placesContext);
    aWindow.document
      .getElementById("contentAreaContextMenu")
      ?.addEventListener("popupshowing", this.contentContext);
    aWindow.document
      .getElementById("contentAreaContextMenu")
      ?.addEventListener("popuphidden", this.hideContext);
    aWindow.document
      .getElementById("tabContextMenu")
      ?.addEventListener("popupshowing", this.tabContext);
    aWindow.document
      .getElementById("newPrivateTab-button")
      ?.addEventListener("click", this.toolbarClick);
  },

  async updatePrivateMaskId(aWindow) {
    let privateMask = aWindow.document.getElementsByClassName(
      "private-browsing-indicator"
    )[0];
    privateMask.id = "private-mask";
  },

  setPrivateObserver() {
    if (!this.config.neverClearData) {
      let observe = () => {
        this.clearData();
        if (!this.config.restoreTabsOnRestart) {
          this.closeTabs();
        }
      };
      Services.obs.addObserver(observe, "quit-application-granted");
    }
  },

  closeTabs() {
    ContextualIdentityService._forEachContainerTab((tab, tabbrowser) => {
      if (tab.userContextId == this.container.userContextId) {
        tabbrowser.removeTab(tab);
      }
    });
  },

  placesContext(aEvent) {
    let win = aEvent.view;
    if (!win) {
      return;
    }
    let { document } = win;
    let openAll = "placesContext_openBookmarkContainer:tabs";
    let openAllLinks = "placesContext_openLinks:tabs";
    let openTab = "placesContext_open:newtab";
    // let document = event.target.ownerDocument;
    document.getElementById("openPrivate").disabled = document.getElementById(
      openTab
    ).disabled;
    document.getElementById("openPrivate").hidden = document.getElementById(
      openTab
    ).hidden;
    document.getElementById(
      "openAllPrivate"
    ).disabled = document.getElementById(openAll).disabled;
    document.getElementById("openAllPrivate").hidden = document.getElementById(
      openAll
    ).hidden;
    document.getElementById(
      "openAllLinksPrivate"
    ).disabled = document.getElementById(openAllLinks).disabled;
    document.getElementById(
      "openAllLinksPrivate"
    ).hidden = document.getElementById(openAllLinks).hidden;
  },

  isPrivate(aTab) {
    return aTab.getAttribute("usercontextid") == this.container.userContextId;
  },

  contentContext(aEvent) {
    let win = aEvent.view;
    if (!win) {
      return;
    }
    let { gContextMenu, gBrowser, PrivateTab } = win;
    let tab = gBrowser.getTabForBrowser(gContextMenu.browser);
    gContextMenu.showItem(
      "openLinkInPrivateTab",
      gContextMenu.onSaveableLink || gContextMenu.onPlainTextLink
    );
    let isPrivate = PrivateTab.isPrivate(tab);
    if (isPrivate) {
      gContextMenu.showItem("context-openlinkincontainertab", false);
    }
  },

  hideContext(aEvent) {
    if (!aEvent.view) {
      return;
    }
    if (aEvent.target == this) {
      aEvent.view.document.getElementById("openLinkInPrivateTab").hidden = true;
    }
  },

  tabContext(aEvent) {
    let win = aEvent.view;
    if (!win) {
      return;
    }
    let { document, PrivateTab } = win;
    const isPrivate =
      win.TabContextMenu.contextTab.userContextId ===
      PrivateTab.container.userContextId;
    document
      .getElementById("toggleTabPrivateState")
      .setAttribute("data-l10n-args", JSON.stringify({ isPrivate }));
  },

  openLink(aEvent) {
    let win = aEvent.view;
    if (!win) {
      return;
    }
    let { gContextMenu, PrivateTab, document } = win;
    win.openLinkIn(
      gContextMenu.linkURL,
      "tab",
      gContextMenu._openLinkInParameters({
        userContextId: PrivateTab.container.userContextId,
        triggeringPrincipal: document.nodePrincipal,
      })
    );
  },

  toolbarClick(aEvent) {
    let win = aEvent.view;
    if (!win) {
      return;
    }
    let { PrivateTab, document } = win;
    if (aEvent.button == 0) {
      PrivateTab.browserOpenTabPrivate(win);
    } else if (aEvent.button == 2) {
      document.popupNode = document.getElementById(PrivateTab.BTN_ID);
      document
        .getElementById("toolbar-context-menu")
        .openPopup(this, "after_start", 14, -10, false, false);
      document.getElementsByClassName(
        "customize-context-removeFromToolbar"
      )[0].disabled = false;
      document.getElementsByClassName(
        "customize-context-moveToPanel"
      )[0].disabled = false;
      aEvent.preventDefault();
    }
  },

  overridePlacesUIUtils() {
    // Unused vars required for eval to execute
    // eslint-disable-next-line no-unused-vars
    const { PlacesUtils } = ChromeUtils.import(
      "resource://gre/modules/PlacesUtils.jsm"
    );
    const { BrowserWindowTracker } = ChromeUtils.import(
      "resource:///modules/BrowserWindowTracker.jsm"
    );
    // eslint-disable-next-line no-unused-vars
    const { PrivateBrowsingUtils } = ChromeUtils.import(
      "resource://gre/modules/PrivateBrowsingUtils.jsm"
    );

    const lazy = {
      BrowserWindowTracker,
      PlacesUIUtils,
      PrivateBrowsingUtils,
    }

    // eslint-disable-next-line no-unused-vars
    function getBrowserWindow(aWindow) {
      // Prefer the caller window if it's a browser window, otherwise use
      // the top browser window.
      return aWindow &&
        aWindow.document.documentElement.getAttribute("windowtype") ==
        "navigator:browser"
        ? aWindow
        : lazy.BrowserWindowTracker.getTopWindow();
    }

    // TODO: replace eval with new Function()();
    try {
      // eslint-disable-next-line no-eval
      eval(
        "lazy.PlacesUIUtils.openTabset = function " +
        lazy.PlacesUIUtils.openTabset
          .toString()
          .replace(
            /(\s+)(inBackground: loadInBackground,)/,
            "$1$2$1userContextId: aEvent.userContextId || 0,"
          )
      );
    } catch (ex) { }
  },

  openAllPrivate(event) {
    event.userContextId = this.container.userContextId;
    PlacesUIUtils.openSelectionInTabs(event);
  },

  openPrivateTab(event) {
    let view = event.target.parentElement._view;
    PlacesUIUtils._openNodeIn(view.selectedNode, "tab", view.ownerWindow, {
      aPrivate: false,
      userContextId: this.container.userContextId,
    });
  },

  togglePrivate(aWindow, aTab = aWindow.gBrowser.selectedTab) {
    let newTab;
    const { gBrowser, gURLBar } = aWindow;
    aTab.setAttribute("isToggling", true);
    const shouldSelect = aTab == aWindow.gBrowser.selectedTab;
    try {
      newTab = gBrowser.duplicateTab(aTab);
      if (shouldSelect) {
        gBrowser.selectedTab = newTab;
        const focusUrlbar = gURLBar.focused;
        if (focusUrlbar) {
          gURLBar.focus();
        }
      }
      gBrowser.removeTab(aTab);
    } catch (ex) {
      // Can use this to pop up failure message
    }
    return newTab;
  },

  browserOpenTabPrivate(aWindow) {
    aWindow.openTrustedLinkIn(aWindow.BROWSER_NEW_TAB_URL, "tab", {
      userContextId: this.container.userContextId,
    });
  },

  initPrivateTabListeners(aWindow) {
    let { gBrowser } = aWindow;
    gBrowser.tabContainer.addEventListener("TabSelect", this.onTabSelect);
    gBrowser.tabContainer.addEventListener("TabOpen", this.onTabOpen);

    gBrowser.privateListener = e => {
      let browser = e.target;
      let tab = gBrowser.getTabForBrowser(browser);
      if (!tab) {
        return;
      }
      let isPrivate = this.isPrivate(tab);

      if (!isPrivate) {
        if (this.observePrivateTabs) {
          this.openTabs.delete(tab);
          if (!this.openTabs.size) {
            this.clearData();
          }
        }
        return;
      }

      if (this.observePrivateTabs) {
        this.openTabs.add(tab);
      }

      browser.browsingContext.useGlobalHistory = false;
    };

    aWindow.addEventListener("XULFrameLoaderCreated", gBrowser.privateListener);

    if (this.observePrivateTabs) {
      gBrowser.tabContainer.addEventListener("TabClose", this.onTabClose);
    }
  },

  onTabSelect(aEvent) {
    let tab = aEvent.target;
    if (!tab) {
      return;
    }
    let win = tab.ownerGlobal;
    let { PrivateTab } = win;
    let prevTab = aEvent.detail.previousTab;
    let isPrivate = PrivateTab.isPrivate(tab);

    if (tab.userContextId != prevTab.userContextId) {
      // Show/hide private mask on browser window
      PrivateTab.toggleMask(win);
      // Ensure we don't save search suggestions for PrivateTab
      win.gURLBar.isPrivate = isPrivate;
      // Update selected tab private status for autofill
      PrefUtils.set("browser.tabs.selectedTabPrivate", isPrivate);
    }
  },

  async onTabOpen(aEvent) {
    // Update tab state cache
    let tab = aEvent.target;
    if (!tab) {
      return;
    }
    let { PrivateTab } = tab.ownerGlobal;
    let isPrivate = PrivateTab.isPrivate(tab);
    // if statement is temp solution to prevent containers being dropped on restart.
    // The flushing and cache updating should only occur if the parent tab was
    // private and the new tab is non-private OR the parent tab was non-private
    // and the new tab is private. Otherwise we should rely on default behaviour.
    // We also need to be wary of pinned state of tabs, as that may also have been
    // affected in the same case.
    if (isPrivate) {
      let userContextId = isPrivate ? PrivateTab.container.userContextId : 0;
      // Duplicating a tab copies the tab state cache from the parent tab.
      // Therefore we need to flush the tab state to ensure it's updated,
      // then overwrite the tab usercontextid so that any restored tabs
      // are opened in the correct container, rather than that of their
      // parent tab.
      let browser = tab.linkedBrowser;
      // Can't update tab state if we can't get the browser
      if (browser) {
        TabStateFlusher.flush(browser)
          .then(() => {
            TabStateCache.update(tab.linkedBrowser.permanentKey, {
              isPrivate,
              userContextId,
            });
          })
          .catch(ex => {
            // Sometimes tests fail here
          });
      }
    }
  },

  onTabClose(aEvent) {
    let tab = aEvent.target;
    if (!tab) {
      return;
    }
    let { PrivateTab } = tab.ownerGlobal;
    if (PrivateTab.isPrivate(tab)) {
      PrivateTab.openTabs.delete(tab);
      if (!PrivateTab.openTabs.size) {
        PrivateTab.clearData();
      }
    }
  },

  toggleMask(aWindow) {
    let { gBrowser } = aWindow;
    let privateMask = aWindow.document.getElementById("private-mask");
    if (gBrowser.selectedTab.isToggling) {
      privateMask.setAttribute(
        "enabled",
        gBrowser.selectedTab.userContextId == this.container.userContextId
          ? "false"
          : "true"
      );
    } else {
      privateMask.setAttribute(
        "enabled",
        gBrowser.selectedTab.userContextId == this.container.userContextId
          ? "true"
          : "false"
      );
    }
  },

  get observePrivateTabs() {
    return (
      !this.config.neverClearData && !this.config.doNotClearDataUntilFxIsClosed
    );
  },

  initCustomFunctions(aWindow) {
    let { MozElements, PrivateTab } = aWindow;
    MozElements.MozTab.prototype.getAttribute = function (att) {
      if (att == "usercontextid" && this.getAttribute("isToggling", false)) {
        this.removeAttribute("isToggling");
        // If in private tab and we attempt to toggle, remove container, else convert to private tab
        return PrivateTab.orig_getAttribute.call(this, att) ==
          PrivateTab.container.userContextId
          ? 0
          : PrivateTab.container.userContextId;
      }
      return PrivateTab.orig_getAttribute.call(this, att);
    };
  },

  orig_getAttribute: Services.wm.getMostRecentBrowserWindow("navigator:browser")
    .MozElements.MozTab.prototype.getAttribute,
};
