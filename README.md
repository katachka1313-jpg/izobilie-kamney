# Изобилие из камней

Одностраничный сайт-витрина для мастера украшений ручной работы Олеси Чукоминой.

## Файлы

- `index.html` — структура страницы и контент.
- `styles.css` — светлое пастельное оформление и адаптив.
- `script.js` — мобильное меню.
- `assets/` — временные placeholder-фото украшений.

## Как открыть

Откройте `index.html` в браузере. Сервер не требуется.

## Отправка заявок через Cloudflare Worker

Форма отправляет JSON на same-origin endpoint `POST /api/request`. Cloudflare route из
`wrangler.toml` направляет только `izobiliekamney.ru/api/*` (а также `www`) в `worker.js`,
поэтому остальная часть статического сайта продолжает обслуживаться прежним origin.

Для production deployment:

1. Убедитесь, что домен `izobiliekamney.ru` добавлен в тот же Cloudflare account и его DNS-записи проксируются Cloudflare.
2. Задайте секреты: `npx wrangler secret put BOT_TOKEN`, `npx wrangler secret put CHAT_ID`,
   `npx wrangler secret put MAX_BOT_TOKEN` и `npx wrangler secret put MAX_CHAT_ID`.
3. Выполните из корня репозитория:
   `npx wrangler deploy worker.js --name izobilie-kamney-form --compatibility-date 2026-08-20`.

Деплой статического сайта на GitHub Pages **не деплоит Worker**. После деплоя откройте
Cloudflare Dashboard → **Workers & Pages** → `izobilie-kamney-form` → **Settings** →
**Domains & Routes**. В разделе Routes должны быть две записи с zone
`izobiliekamney.ru`: `izobiliekamney.ru/api/*` и `www.izobiliekamney.ru/api/*`.
Если их нет, нажмите **Add → Route**, вставьте каждый pattern и выберите zone
`izobiliekamney.ru`. В DNS записи корневого домена и `www` должны иметь статус
**Proxied** (оранжевое облако), иначе route Worker не перехватит запрос GitHub Pages.

Проверка маршрута после деплоя:

```bash
curl -i -X OPTIONS 'https://izobiliekamney.ru/api/request' \
  -H 'Origin: https://izobiliekamney.ru' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type'
```

Ожидаются HTTP `204` и заголовок
`Access-Control-Allow-Origin: https://izobiliekamney.ru`, а не HTML GitHub Pages.

Worker принимает `OPTIONS` и `POST` с `Content-Type: application/json`, проверяет origin и
передаёт валидную заявку в Telegram и MAX. Секреты нельзя добавлять в `script.js` или коммитить.

## Что заменить перед публикацией

В блоке первого экрана и карточках работ стоят placeholder-фото. В HTML рядом с ними оставлены комментарии:

```html
<!-- заменить на фото клиентки -->
```

Кнопки заказа ведут к форме заявки `#request` на этой же странице.
Канал указан в контактах: `https://t.me/Kamni_Olesia`.

## Информационные блоки

На странице добавлены блоки для покупателя:

- значения камней с placeholder-фото, мягкими символическими формулировками и подсказкой, кому может подойти камень;
- подбор украшения по дате рождения;
- инструкция по измерению размера браслета;
- оформление заказа через Telegram;
- оплата и безопасность без ввода банковских данных на сайте;
- финальный блок контактов с двумя Telegram-кнопками.

В витрине учтены браслеты, колье, серьги, украшения по дате рождения, подарочные украшения и индивидуальные заказы.

В блоке примеров работ используются реальные фото из папки `assets/фото примеры/`. Фото выровнены в одинаковые карточки с кадрированием по центру.
