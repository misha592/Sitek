# Sitek

Статическая bio-страница (`index.html`): тема выбирается случайно, статус Discord
берётся из [Lanyard](https://github.com/Phineas/lanyard), форма отправляет
сообщение в Discord.

## Форма сообщений

Discord-вебхук — это секрет: любой, кто открыл страницу, видит всё, что в ней
написано. Поэтому страница отправляет сообщение не в Discord напрямую, а на
релей, который хранит вебхук у себя.

1. Удали старый вебхук в настройках канала Discord и создай новый (старый уже
   лежал в открытом виде в истории git).
2. Задеплой `relay/worker.js` как Cloudflare Worker:
   ```
   wrangler secret put DISCORD_WEBHOOK_URL   # новый вебхук
   wrangler deploy                            # ALLOWED_ORIGIN = адрес сайта
   ```
3. Впиши публичный адрес воркера в `MESSAGE_ENDPOINT` в `index.html`.

Пока `MESSAGE_ENDPOINT` пустой, форма отключена — сама страница работает.
