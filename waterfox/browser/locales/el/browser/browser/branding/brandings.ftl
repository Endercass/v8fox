# This Source Code Form is subject to the terms of the Waterfox Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


## The following feature names must be treated as a brand.
##
## They cannot be:
## - Transliterated.
## - Translated.
##
## Declension should be avoided where possible, leaving the original
## brand unaltered in prominent UI positions.
##
## For further details, consult:
## https://mozilla-l10n.github.io/styleguides/mozilla_general/#brands-copyright-and-trademark

-facebook-container-brand-name = Facebook Container
-lockwise-brand-name = Waterfox Lockwise
-lockwise-brand-short-name = Lockwise
-monitor-brand-name = Waterfox Monitor
-monitor-brand-short-name = Monitor
-pocket-brand-name = Pocket
-send-brand-name = Waterfox Send
-screenshots-brand-name = Waterfox Screenshots
-mozilla-vpn-brand-name = Waterfox VPN
-profiler-brand-name = Waterfox Profiler
-translations-brand-name = Waterfox Translations
-rally-brand-name = Waterfox Rally
-rally-short-name = Rally
-focus-brand-name = Waterfox Focus
# “Suggest” can be localized, “Waterfox” must be treated as a brand
# and kept in English.
-firefox-suggest-brand-name = Προτάσεις Waterfox
# ”Home" can be localized, “Waterfox” must be treated as a brand
# and kept in English.
-firefox-home-brand-name =
    { $case ->
       *[nom]
            { $capitalization ->
               *[upper] Αρχική Waterfox
                [lower] αρχική Waterfox
            }
        [gen]
            { $capitalization ->
               *[upper] Αρχικής Waterfox
                [lower] αρχικής Waterfox
            }
    }
# View" can be localized, “Waterfox” must be treated as a brand
# and kept in English.
-firefoxview-brand-name = Προβολή Waterfox
