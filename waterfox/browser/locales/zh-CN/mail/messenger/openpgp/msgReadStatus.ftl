# This Source Code Form is subject to the terms of the Waterfox Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


## Message Header Encryption Button

message-header-show-security-info-key = S

#   $type (String) - the shortcut key defined in the message-header-show-security-info-key
message-security-button =
    .title =
        { PLATFORM() ->
            [macos] 显示消息安全性信息（⌘ ⌥ { message-header-show-security-info-key }）
           *[other] 显示消息安全性信息（Ctrl+Alt+{ message-header-show-security-info-key }）
        }

openpgp-view-signer-key =
    .label = 查看签名者密钥
openpgp-view-your-encryption-key =
    .label = 查看您的解密密钥
openpgp-openpgp = OpenPGP

openpgp-no-sig = 无数字签名
openpgp-no-sig-info = 此消息中没有包含发送者的数字签名。缺少数字签名表明此消息可能是某个伪装拥有此邮件地址的人发送的。也有可能此消息在传送过程中已经被更改。
openpgp-uncertain-sig = 无法确认的数字签名
openpgp-invalid-sig = 无效的数字签名
openpgp-good-sig = 正确的数字签名

openpgp-sig-uncertain-no-key = 此消息包含数字签名 ，但无法确认签名是否正确。若要验证签名，需取得收件人公钥的副本。
openpgp-sig-uncertain-uid-mismatch = 此消息包含数字签名，但与已知的签名不匹配。消息是由与发件人公钥不符的电子邮件地址发出的。
openpgp-sig-uncertain-not-accepted = 此消息包含数字签名，但您尚未决定是否接受发件人的密钥。
openpgp-sig-invalid-rejected = 此消息包含数字签名，但您先前已决定要拒绝签名者的密钥。
openpgp-sig-invalid-technical-problem = 此消息包含数字签名，但检测到技术错误。可能已损坏或遭人窜改。
openpgp-sig-valid-unverified = 此消息包含您先前接受过的密钥所生成的有效数字签名。但您还未验证过密钥是否确属于该发件人。
openpgp-sig-valid-verified = 此消息包含由已验证的密钥所生成的有效数字签名。
openpgp-sig-valid-own-key = 此消息包含由您的个人密钥所生成的有效数字签名。

openpgp-sig-key-id = 签名者密钥 ID：{ $key }
openpgp-sig-key-id-with-subkey-id = 签名者密钥 ID：{ $key }（子密钥 ID：{ $subkey }）

openpgp-enc-key-id = 您的解密密钥 ID：{ $key }
openpgp-enc-key-with-subkey-id = 您的解密密钥 ID：{ $key }（子密钥 ID：{ $subkey }）

openpgp-enc-none = 消息未加密
openpgp-enc-none-label = 此消息发送前未被加密。未经加密的信息在互联网的传输过程中可能被他人窥探其内容。

openpgp-enc-invalid-label = 无法解密消息
openpgp-enc-invalid = 此消息发送给你之前已被加密，但是无法解密。

openpgp-enc-clueless = 处理此消息时发生未知问题。

openpgp-enc-valid-label = 消息已加密
openpgp-enc-valid = 此消息在发送给您之前已进行加密。通过加密，可确保消息只被该收到的收件人阅读。

openpgp-unknown-key-id = 未知密钥

openpgp-other-enc-additional-key-ids = 此外，消息已由下列密钥的拥有者加密：
openpgp-other-enc-all-key-ids = 消息已由下列密钥的拥有者加密：

openpgp-message-header-encrypted-ok-icon =
    .alt = 解密成功
openpgp-message-header-encrypted-notok-icon =
    .alt = 解密失败

openpgp-message-header-signed-ok-icon =
    .alt = 签名正确
# Mismatch icon is used for notok state as well
openpgp-message-header-signed-mismatch-icon =
    .alt = 签名错误
openpgp-message-header-signed-unknown-icon =
    .alt = 未知签名状态
openpgp-message-header-signed-verified-icon =
    .alt = 签名已验证
openpgp-message-header-signed-unverified-icon =
    .alt = 签名未验证
