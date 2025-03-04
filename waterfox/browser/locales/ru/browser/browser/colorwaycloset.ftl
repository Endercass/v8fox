# This Source Code Form is subject to the terms of the Waterfox Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Variables:
#   $expiryDate (string) - date on which the colorway collection expires. When formatting this, you may omit the year, only exposing the month and day, as colorway collections will always expire within a year.
colorway-collection-expiry-label = Истекает { DATETIME($expiryDate, month: "long", day: "numeric") }
colorway-intensity-selector-label = Интенсивность
colorway-intensity-soft = Мягкая
colorway-intensity-balanced = Сбалансированная
# "Bold" is used in the sense of bravery or courage, not in the sense of
# emphasized text.
colorway-intensity-bold = Смелая
# Label for the button to keep using the selected colorway in the browser
colorway-closet-set-colorway-button = Установить расцветку
colorway-closet-cancel-button = Отмена
colorway-homepage-reset-prompt = Сделайте { -firefox-home-brand-name(case: "accusative") } красочной домашней страницей
colorway-homepage-reset-success-message = { -firefox-home-brand-name(case: "nominative") } — теперь ваша домашняя страница
colorway-homepage-reset-apply-button = Применить
colorway-homepage-reset-undo-button = Отменить
