/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const EXPORTED_SYMBOLS = ["WaterfoxGlue"];

const { XPCOMUtils } = ChromeUtils.import(
  "resource://gre/modules/XPCOMUtils.jsm"
);

const { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

XPCOMUtils.defineLazyModuleGetters(this, {
  AddonManager: "resource://gre/modules/AddonManager.jsm",
  AttributionCode: "resource:///modules/AttributionCode.jsm",
  BrowserUtils: "resource:///modules/BrowserUtils.jsm",
  ChromeManifest: "resource:///modules/ChromeManifest.jsm",
  Overlays: "resource:///modules/Overlays.jsm",
  PrefUtils: "resource:///modules/PrefUtils.jsm",
  PrivateTab: "resource:///modules/PrivateTab.jsm",
  setTimeout: "resource://gre/modules/Timer.jsm",
  StatusBar: "resource:///modules/StatusBar.jsm",
  TabFeatures: "resource:///modules/TabFeatures.jsm",
  UICustomizations: "resource:///modules/UICustomizations.jsm",
});

XPCOMUtils.defineLazyGlobalGetters(this, ["fetch"]);

const WATERFOX_CUSTOMIZATIONS_PREF =
  "browser.theme.enableWaterfoxCustomizations";

const WATERFOX_DEFAULT_THEMES = [
  "default-theme@mozilla.org",
  "firefox-compact-light@mozilla.org",
  "firefox-compact-dark@mozilla.org",
  "firefox-alpenglow@mozilla.org",
];

const WATERFOX_USERCHROME = "chrome://browser/skin/userChrome.css";
const WATERFOX_USERCONTENT = "chrome://browser/skin/userContent.css";

const WaterfoxGlue = {
  _addonManagersListeners: [],

  async init() {
    // Parse attribution data
    this._setAttributionData();

    // Set pref observers
    this._setPrefObservers();

    // Load always-on Waterfox custom CSS.
    BrowserUtils.registerStylesheet(
      "chrome://browser/skin/waterfox/general.css"
    );

    // Maybe load Waterfox stylesheets
    (async () => {
      let amInitialized = false;
      while (!amInitialized) {
        try {
          const activeThemeId = await this.getActiveThemeId();
          this.updateCustomStylesheets({ id: activeThemeId, type: "theme" });
          amInitialized = true;
        } catch (ex) {
          await new Promise(res => setTimeout(res, 500, {}));
        }
      }
    })();

    // Parse chrome.manifest
    this.startupManifest = await this.getChromeManifest("startup");
    this.privateManifest = await this.getChromeManifest("private");

    // before-ui-startup topic not reliably notified before WaterfoxGlue init
    // Observe chrome-document-loaded topic to detect window open
    Services.obs.addObserver(this, "chrome-document-loaded");
    // Observe main-pane-loaded topic to detect about:preferences open
    Services.obs.addObserver(this, "main-pane-loaded");
    // Observe browser-delayed-startup-finished to launch delayed tasks
    Services.obs.addObserver(this, "browser-delayed-startup-finished");
    // Observe browser shutdown
    Services.obs.addObserver(this, "quit-application-granted");
    // Listen for addon events
    this.addAddonListener();
  },

  async _setAttributionData() {
    // Kick off async process to set attribution code preference
    try {
      let attrData = await AttributionCode.getAttrDataAsync();
      if (Object.keys(attrData).length) {
        let attributionStr = "";
        for (const [key, value] of Object.entries(attrData)) {
          // If PTAG/TypeTag we only want to set the relevant pref
          if (["PTAG", "hspart", "hsimp", "typetag"].includes(key)) {
            Services.prefs.setCharPref(
              "browser.search." + key.toLowerCase(),
              value
            );
            continue;
          }
          if (key == "engine" && ["bing", "yahoo"].includes(value)) {
            this._setDefaultEng(value);
            continue;
          } else if (key == "engines") {
            let engineList = value.split(",").map(engine => {
              return engine + "@search.waterfox.net";
            });

            Services.prefs.setCharPref(
              "distribution.engines",
              engineList.join(",")
            );
            continue;
          } else if (key == "uid") {
            Services.prefs.setCharPref("distribution.uid", value);
          }
          // Only add to postSigningData if this hasn't been called previously
          attributionStr += `&${key}=${value}`;
        }
        // Add install param
        if (attributionStr) {
          attributionStr += "&status=install";
        }
        let additionalPage = Services.urlFormatter.formatURLPref(
          "startup.homepage_welcome_url.additional"
        );
        Services.prefs.setCharPref(
          "startup.homepage_welcome_url.additional",
          additionalPage + attributionStr
        );
        let overridePage = Services.urlFormatter.formatURLPref(
          "startup.homepage_override_url"
        );
        Services.prefs.setCharPref(
          "startup.homepage_override_url",
          overridePage + attributionStr
        );
      }
    } catch (ex) {
      Services.console.logStringMessage(ex + "error setting attr data");
    }
  },

  async _setDefaultEng(value) {
    try {
      let searchInitializedPromise = new Promise(resolve => {
        if (Services.search.isInitialized) {
          resolve();
        }
        const SEARCH_SERVICE_TOPIC = "browser-search-service";
        Services.obs.addObserver(function observer(subject, topic, data) {
          if (data != "init-complete") {
            return;
          }
          Services.obs.removeObserver(observer, SEARCH_SERVICE_TOPIC);
          resolve();
        }, SEARCH_SERVICE_TOPIC);
      });
      searchInitializedPromise.then(() => {
        const nameMap = { bing: "Bing", yahoo: "Yahoo!" };
        const engine = Services.search.getEngineByName(nameMap[value]);
        Services.search.setDefault(engine);
        Services.search.setDefaultPrivate(engine);
      });
    } catch (ex) {
      // Minor issue, carry on
    }
  },

  async _setPrefObservers() {
    this.leptonListener = PrefUtils.addObserver(
      WATERFOX_CUSTOMIZATIONS_PREF,
      async _ => {
        const activeThemeId = await this.getActiveThemeId();
        this.updateCustomStylesheets({ id: activeThemeId, type: "theme" });
      }
    );
    this.pinnedTabListener = PrefUtils.addObserver(
      "browser.tabs.pinnedIconOnly",
      isEnabled => {
        // Pref being true actually means we need to unload the sheet, so invert.
        const uri = "chrome://browser/content/tabfeatures/pinnedtab.css";
        BrowserUtils.registerOrUnregisterSheet(uri, !isEnabled);
      }
    );
  },

  async getChromeManifest(manifest) {
    let uri;
    let privateWindow = false;
    switch (manifest) {
      case "startup":
        uri = "resource://waterfox/overlays/chrome.overlay";
        break;
      case "private":
        uri = "resource://waterfox/overlays/chrome.overlay";
        privateWindow = true;
        break;
      case "preferences-general":
        uri = "resource://waterfox/overlays/preferences-general.overlay";
        break;
      case "preferences-other":
        uri = "resource://waterfox/overlays/preferences-other.overlay";
        break;
    }
    let chromeManifest = new ChromeManifest(async () => {
      let res = await fetch(uri);
      let text = await res.text();
      if (privateWindow) {
        let tArr = text.split("\n");
        let indexPrivate = tArr.findIndex(overlay =>
          overlay.includes("private")
        );
        tArr.splice(indexPrivate, 1);
        text = tArr.join("\n");
      }
      return text;
    }, this.options);
    await chromeManifest.parse();
    return chromeManifest;
  },

  options: {
    application: Services.appinfo.ID,
    appversion: Services.appinfo.version,
    platformversion: Services.appinfo.platformVersion,
    os: Services.appinfo.OS,
    osversion: Services.sysinfo.getProperty("version"),
    abi: Services.appinfo.XPCOMABI,
  },

  async observe(subject, topic, data) {
    switch (topic) {
      case "chrome-document-loaded":
        // Only load overlays in new browser windows
        // baseURI for about:blank is also browser.xhtml, so use URL
        if (subject.URL.includes("browser.xhtml")) {
          const window = subject.defaultView;
          // Do not load non-private overlays in private window
          if (window.PrivateBrowsingUtils.isWindowPrivate(window)) {
            Overlays.load(this.privateManifest, window);
          } else {
            Overlays.load(this.startupManifest, window);
            // Only load in non-private browser windows
            PrivateTab.init(window);
          }
          // Load in all browser windows (private and normal)
          TabFeatures.init(window);
          StatusBar.init(window);
          UICustomizations.init(window);
        }
        break;
      case "main-pane-loaded":
        // Subject is preferences page content window
        if (!subject.initialized) {
          // If we are not loading directly on privacy, we need to wait until permissionsGroup
          // exists before we attempt to load our overlay. If we are loading directly on privacy
          // this exists before overlaying occurs, so we have no issues. Loading overlays on
          // #general is fine regardless of which pane we refresh/initially load.
          await Overlays.load(
            await this.getChromeManifest("preferences-general"),
            subject
          );
          if (
            !subject.document.getElementById("permissionsGroup") &&
            !subject.document.getElementById("homeContentsGroup")
          ) {
            subject.setTimeout(async () => {
              await Overlays.load(
                await this.getChromeManifest("preferences-other"),
                subject
              );
              subject.privacyInitialized = true;
            }, 500);
          } else {
            await Overlays.load(
              await this.getChromeManifest("preferences-other"),
              subject
            );
            subject.privacyInitialized = true;
          }
          subject.initialized = true;
        }
        break;
      case "browser-delayed-startup-finished":
        this._beforeUIStartup();
        this._delayedTasks();
        break;
      case "quit-application-granted":
        Services.obs.removeObserver(this, "quit-application-granted");
        this.removeAddonListeners();
    }
  },

  async _beforeUIStartup() {
    this._migrateUI();

    AddonManager.maybeInstallBuiltinAddon(
      "addonstores@waterfox.net",
      "1.0.0",
      "resource://builtin-addons/addonstores/"
    );
  },

  async _migrateUI() {
    let currentUIVersion = Services.prefs.getIntPref(
      "browser.migration.version",
      128
    );

    const waterfoxUIVersion = PrefUtils.get(
      "browser.migration.waterfox_version",
      0
    );

    async function enableTheme(id) {
      const addon = await AddonManager.getAddonByID(id);
      // If we found it, enable it.
      addon?.enable();
    }

    if (currentUIVersion < 128) {
      // Ensure the theme id is set correctly for G5
      const DEFAULT_THEME = "default-theme@mozilla.org";
      const activeThemeId = await this.getActiveThemeId();
      if (activeThemeId) {
        switch (activeThemeId) {
          case "lepton@waterfox.net":
            enableTheme("default-theme@mozilla.org");
            break;
          case "australis-light@waterfox.net":
            enableTheme("firefox-compact-light@mozilla.org");
            break;
          case "australis-dark@waterfox.net":
            enableTheme("firefox-compact-dark@mozilla.org");
            break;
        }
      } else {
        // If no activeTheme detected, set default.
        enableTheme(DEFAULT_THEME);
      }
    }
    if (waterfoxUIVersion < 1) {
      const themeEnablePref = "userChrome.theme.enable";
      const enabled = PrefUtils.get(themeEnablePref);
      PrefUtils.set(WATERFOX_CUSTOMIZATIONS_PREF, enabled ? 1 : 2);
    }

    PrefUtils.set("browser.migration.waterfox_version", 1);
  },

  async _delayedTasks() {
    let tasks = [
      {
        task: () => {
          AttributionCode.deleteFileAsync();
          // Reset prefs
          Services.prefs.clearUserPref(
            "startup.homepage_welcome_url.additional"
          );
          Services.prefs.clearUserPref("startup.homepage_override_url");
        },
      },
    ];

    for (const task of tasks) {
      task.task();
    }
  },

  async getActiveThemeId() {
    // Try to get active theme from the pref
    const activeThemeID = PrefUtils.get("extensions.activeThemeID", "");
    if (activeThemeID) {
      return activeThemeID;
    }
    // Otherwise just grab it from AddonManager
    const themes = await AddonManager.getAddonsByTypes(["theme"]);
    return themes.find(addon => addon.isActive).id;
  },

  addAddonListener() {
    let listener = {
      onInstalled: addon => this.updateCustomStylesheets(addon),
      onEnabled: addon => this.updateCustomStylesheets(addon),
    };
    this._addonManagersListeners.push(listener);
    AddonManager.addAddonListener(listener);
  },

  removeAddonListeners() {
    for (let listener of this._addonManagersListeners) {
      AddonManager.removeAddonListener(listener);
    }
  },

  updateCustomStylesheets(addon) {
    if (addon.type === "theme") {
      // If any theme and WF on any theme, reload stylesheets for every theme enable.
      // If WF theme and WF customisations, then reload stylesheets.
      // If no customizations, unregister sheets for every theme enable.
      if (
        PrefUtils.get(WATERFOX_CUSTOMIZATIONS_PREF, 0) === 0 ||
        (PrefUtils.get(WATERFOX_CUSTOMIZATIONS_PREF, 0) === 1 &&
          WATERFOX_DEFAULT_THEMES.includes(addon.id))
      ) {
        this.loadWaterfoxStylesheets();
      } else {
        this.unloadWaterfoxStylesheets();
      }
    }
  },

  loadWaterfoxStylesheets() {
    BrowserUtils.registerStylesheet(WATERFOX_USERCHROME);
    BrowserUtils.registerStylesheet(WATERFOX_USERCONTENT);
  },

  unloadWaterfoxStylesheets() {
    BrowserUtils.unregisterStylesheet(WATERFOX_USERCHROME);
    BrowserUtils.unregisterStylesheet(WATERFOX_USERCONTENT);
  },
};
