# This Source Code Form is subject to the terms of the Waterfox Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

connection-dns-over-https-url-resolver = Použít poskytovatele
    .accesskey = s

# Variables:
#   $name (String) - Display name or URL for the DNS over HTTPS provider
connection-dns-over-https-url-item-default =
    .label = { $name } (výchozí)
    .tooltiptext = Použít výchozí URL adresu pro službu DNS over HTTPS

connection-dns-over-https-url-custom =
    .label = Vlastní
    .accesskey = n
    .tooltiptext = Zadejte vlastní URL adresu pro službu DNS over HTTPS

connection-dns-over-https-custom-label = Vlastní

connection-dialog-window =
    .title = Nastavení připojení
    .style =
        { PLATFORM() ->
            [macos] width: 44em !important
           *[other] width: 49em !important
        }

disable-extension-button = Zakázat rozšíření

# Variables:
#   $name (String) - The extension that is controlling the proxy settings.
#
# The extension-icon is the extension's icon, or a fallback image. It should be
# purely decoration for the actual extension name, with alt="".
proxy-settings-controlled-by-extension =
    Připojení { -brand-short-name.gender ->
        [masculine] { -brand-short-name(case: "gen") }
        [feminine] { -brand-short-name(case: "gen") }
        [neuter] { -brand-short-name(case: "gen") }
       *[other] aplikace { -brand-short-name }
    } k internetu spravuje rozšíření <img data-l10n-name="extension-icon" alt="" /> { $name }.

connection-proxy-legend = Nastavení proxy serverů pro přístup k internetu

proxy-type-no =
    .label = Bez proxy serveru
    .accesskey = B

proxy-type-wpad =
    .label = Automatické zjištění konfigurace proxy serverů
    .accesskey = A

proxy-type-system =
    .label = Použít nastavení proxy serverů v systému
    .accesskey = u

proxy-type-manual =
    .label = Ruční konfigurace proxy serverů:
    .accesskey = k

proxy-http-label =
    .value = HTTP proxy:
    .accesskey = H

http-port-label =
    .value = Port:
    .accesskey = p

proxy-http-sharing =
    .label = Použít tento proxy server také pro HTTPS
    .accesskey = s

proxy-https-label =
    .value = HTTPS proxy:
    .accesskey = H

ssl-port-label =
    .value = Port:
    .accesskey = o

proxy-socks-label =
    .value = SOCKS server:
    .accesskey = C

socks-port-label =
    .value = Port:
    .accesskey = t

proxy-socks4-label =
    .label = SOCKS v4
    .accesskey = K

proxy-socks5-label =
    .label = SOCKS v5
    .accesskey = v

proxy-type-auto =
    .label = URL pro automatickou konfiguraci proxy serverů:
    .accesskey = m

proxy-reload-label =
    .label = Znovu načíst
    .accesskey = Z

no-proxy-label =
    .value = Nepoužívat pro:
    .accesskey = N

no-proxy-example = Příklad: .mozilla.org, .net.nz, 192.168.1.0/24

# Do not translate "localhost", "127.0.0.1/8" and "::1". (You can translate "and".)
connection-proxy-noproxy-localhost-desc-2 = Spojení na localhost, 127.0.0.1/8 a ::1 nikdy proxy servery nepoužívají.

proxy-password-prompt =
    .label = Nedotazovat se na autentizaci, pokud je heslo uloženo
    .accesskey = e
    .tooltiptext = Tato volba zajistí provedení tiché autentizace k proxy, pokud pro ni máte uloženy přihlašovací údaje. Pokud autentizace selže, budete na ně dotázání.

proxy-remote-dns =
    .label = Použít proxy server pro DNS při použití SOCKS v5
    .accesskey = d

proxy-enable-doh =
    .label = Zapnout DNS over HTTPS
    .accesskey = p
