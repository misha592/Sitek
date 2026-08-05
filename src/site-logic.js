(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.SitekLogic = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var THEMES = [
        {
            className: 'theme-sunset',
            bgImage: 'Без названия (6).jpg',
            captionText: 'I am vibecoder',
            embedColor: 14456376
        },
        {
            className: 'theme-ghoul',
            bgImage: '☆ Suzuya Juuzou ☆_Tokyo Ghoul.jpg',
            captionText: 'ВСЯ ЭТА КРОВЬ МНЕ (знаю что Briar)',
            embedColor: 15672356
        }
    ];

    var STATUS_LABELS = {
        online: 'В сети',
        idle: 'Не активен',
        dnd: 'Не беспокоить',
        offline: 'Офлайн'
    };

    var TAB_TITLES = ['>-<', '•_•', '~_~', '^_-', 'x_x', 'о_о'];

    function pickTheme(themes, random) {
        var list = themes && themes.length ? themes : THEMES;
        var rng = typeof random === 'function' ? random : Math.random;
        var index = Math.floor(rng() * list.length);
        if (!(index >= 0)) index = 0;
        if (index >= list.length) index = list.length - 1;
        return list[index];
    }

    function encodeImagePath(path) {
        return String(path)
            .split('/')
            .map(encodeURIComponent)
            .join('/');
    }

    function backgroundImageValue(path) {
        return "url('" + encodeImagePath(path) + "')";
    }

    function statusLabel(status) {
        return Object.prototype.hasOwnProperty.call(STATUS_LABELS, status)
            ? STATUS_LABELS[status]
            : STATUS_LABELS.offline;
    }

    function statusDotClass(status) {
        var known = Object.prototype.hasOwnProperty.call(STATUS_LABELS, status);
        return 'status-dot status-' + (known ? status : 'offline');
    }

    function displayName(discordUser) {
        if (!discordUser) return '';
        return discordUser.global_name || discordUser.username || '';
    }

    function handle(discordUser) {
        var name = discordUser && discordUser.username;
        return name ? '@' + name : '';
    }

    function avatarUrl(userId, avatarHash) {
        if (!avatarHash) return null;
        var ext = String(avatarHash).indexOf('a_') === 0 ? 'gif' : 'png';
        return (
            'https://cdn.discordapp.com/avatars/' +
            userId +
            '/' +
            avatarHash +
            '.' +
            ext +
            '?size=256'
        );
    }

    function activityText(user) {
        if (!user) return '';
        var activities = user.activities || [];
        var custom = activities.filter(function (a) {
            return a && a.type === 4;
        })[0];
        if (custom && custom.state) return custom.state;

        var game = activities.filter(function (a) {
            return a && a.type === 0;
        })[0];
        if (game) return 'В игре: ' + game.name;

        if (user.listening_to_spotify && user.spotify) {
            return 'Слушает: ' + user.spotify.song;
        }
        return '';
    }

    function nextTitleIndex(index, titles) {
        var list = titles && titles.length ? titles : TAB_TITLES;
        return (index + 1) % list.length;
    }

    function normalizeMessage(text) {
        return String(text == null ? '' : text).trim();
    }

    function buildWebhookPayload(text, theme, timestamp) {
        var color = (theme && theme.embedColor) || THEMES[0].embedColor;
        return {
            embeds: [
                {
                    title: '📩 Новое личное сообщение с сайта!',
                    description: '**Текст:** ' + normalizeMessage(text),
                    color: color,
                    timestamp: (timestamp || new Date()).toISOString()
                }
            ]
        };
    }

    function lanyardUrl(userId) {
        return 'https://api.lanyard.rest/v1/users/' + userId;
    }

    return {
        THEMES: THEMES,
        STATUS_LABELS: STATUS_LABELS,
        TAB_TITLES: TAB_TITLES,
        pickTheme: pickTheme,
        encodeImagePath: encodeImagePath,
        backgroundImageValue: backgroundImageValue,
        statusLabel: statusLabel,
        statusDotClass: statusDotClass,
        displayName: displayName,
        handle: handle,
        avatarUrl: avatarUrl,
        activityText: activityText,
        nextTitleIndex: nextTitleIndex,
        normalizeMessage: normalizeMessage,
        buildWebhookPayload: buildWebhookPayload,
        lanyardUrl: lanyardUrl
    };
});
