import { describe, expect, it } from 'vitest';
import logic from '../src/site-logic.js';

const {
    THEMES,
    STATUS_LABELS,
    TAB_TITLES,
    pickTheme,
    encodeImagePath,
    backgroundImageValue,
    statusLabel,
    statusDotClass,
    displayName,
    handle,
    avatarUrl,
    activityText,
    nextTitleIndex,
    normalizeMessage,
    buildWebhookPayload,
    lanyardUrl
} = logic;

describe('pickTheme', () => {
    it('selects a theme by the random value', () => {
        expect(pickTheme(THEMES, () => 0)).toBe(THEMES[0]);
        expect(pickTheme(THEMES, () => 0.99)).toBe(THEMES[1]);
    });

    it('clamps a random value of exactly 1 to the last theme', () => {
        expect(pickTheme(THEMES, () => 1)).toBe(THEMES[THEMES.length - 1]);
    });

    it('falls back to the built-in themes for an empty list', () => {
        expect(THEMES).toContain(pickTheme([], () => 0));
    });

    it('returns a usable theme when called without arguments', () => {
        const theme = pickTheme();
        expect(THEMES).toContain(theme);
    });

    it('exposes a class name, background and embed color on every theme', () => {
        for (const theme of THEMES) {
            expect(theme.className).toMatch(/^theme-/);
            expect(theme.bgImage).toMatch(/\.jpg$/);
            expect(typeof theme.embedColor).toBe('number');
        }
    });
});

describe('encodeImagePath / backgroundImageValue', () => {
    it('percent-encodes cyrillic names and spaces', () => {
        expect(encodeImagePath('Без названия (6).jpg')).toBe(
            '%D0%91%D0%B5%D0%B7%20%D0%BD%D0%B0%D0%B7%D0%B2%D0%B0%D0%BD%D0%B8%D1%8F%20(6).jpg'
        );
    });

    it('keeps path separators unencoded', () => {
        expect(encodeImagePath('img/a b/c.jpg')).toBe('img/a%20b/c.jpg');
    });

    it('wraps the encoded path in a css url()', () => {
        expect(backgroundImageValue('a b.jpg')).toBe("url('a%20b.jpg')");
    });
});

describe('statusLabel / statusDotClass', () => {
    it.each([
        ['online', 'В сети'],
        ['idle', 'Не активен'],
        ['dnd', 'Не беспокоить'],
        ['offline', 'Офлайн']
    ])('maps %s to its russian label', (status, label) => {
        expect(statusLabel(status)).toBe(label);
    });

    it('falls back to the offline label for unknown or missing statuses', () => {
        expect(statusLabel('streaming')).toBe(STATUS_LABELS.offline);
        expect(statusLabel(undefined)).toBe(STATUS_LABELS.offline);
    });

    it('builds the dot class from a known status', () => {
        expect(statusDotClass('dnd')).toBe('status-dot status-dnd');
    });

    it('builds an offline dot class for unknown statuses', () => {
        expect(statusDotClass('weird')).toBe('status-dot status-offline');
        expect(statusDotClass(undefined)).toBe('status-dot status-offline');
    });

    it('does not leak inherited object properties as statuses', () => {
        expect(statusLabel('toString')).toBe(STATUS_LABELS.offline);
    });
});

describe('displayName / handle', () => {
    it('prefers the global name over the username', () => {
        expect(displayName({ global_name: 'Sobaka', username: 'sobaka234411' })).toBe('Sobaka');
    });

    it('falls back to the username when no global name is set', () => {
        expect(displayName({ global_name: null, username: 'sobaka234411' })).toBe('sobaka234411');
    });

    it('returns an empty string for missing users', () => {
        expect(displayName(undefined)).toBe('');
        expect(displayName({})).toBe('');
    });

    it('prefixes the username with @', () => {
        expect(handle({ username: 'sobaka234411' })).toBe('@sobaka234411');
    });

    it('returns an empty handle when the username is missing', () => {
        expect(handle({})).toBe('');
        expect(handle(null)).toBe('');
    });
});

describe('avatarUrl', () => {
    it('uses the png extension for static avatars', () => {
        expect(avatarUrl('42', 'abc123')).toBe(
            'https://cdn.discordapp.com/avatars/42/abc123.png?size=256'
        );
    });

    it('uses the gif extension for animated avatars', () => {
        expect(avatarUrl('42', 'a_abc123')).toBe(
            'https://cdn.discordapp.com/avatars/42/a_abc123.gif?size=256'
        );
    });

    it('only treats a leading a_ as animated', () => {
        expect(avatarUrl('42', 'ba_bc')).toContain('.png');
    });

    it('returns null when the user has no avatar hash', () => {
        expect(avatarUrl('42', null)).toBeNull();
        expect(avatarUrl('42', '')).toBeNull();
    });
});

describe('activityText', () => {
    it('prefers a custom status', () => {
        const user = {
            activities: [
                { type: 0, name: 'Dota 2' },
                { type: 4, state: 'chilling' }
            ]
        };
        expect(activityText(user)).toBe('chilling');
    });

    it('ignores a custom status without state text', () => {
        const user = {
            activities: [
                { type: 4 },
                { type: 0, name: 'Dota 2' }
            ]
        };
        expect(activityText(user)).toBe('В игре: Dota 2');
    });

    it('falls back to spotify when no other activity applies', () => {
        const user = {
            activities: [{ type: 2 }],
            listening_to_spotify: true,
            spotify: { song: 'Unravel' }
        };
        expect(activityText(user)).toBe('Слушает: Unravel');
    });

    it('ignores spotify data when the user is not listening', () => {
        const user = { activities: [], listening_to_spotify: false, spotify: { song: 'Unravel' } };
        expect(activityText(user)).toBe('');
    });

    it('returns an empty string for missing or empty activity data', () => {
        expect(activityText(undefined)).toBe('');
        expect(activityText({})).toBe('');
        expect(activityText({ activities: [null] })).toBe('');
    });
});

describe('nextTitleIndex', () => {
    it('advances through the titles', () => {
        expect(nextTitleIndex(0, TAB_TITLES)).toBe(1);
    });

    it('wraps around at the end of the list', () => {
        expect(nextTitleIndex(TAB_TITLES.length - 1, TAB_TITLES)).toBe(0);
    });

    it('defaults to the built-in titles', () => {
        expect(nextTitleIndex(TAB_TITLES.length - 1)).toBe(0);
        expect(nextTitleIndex(0, [])).toBe(1);
    });
});

describe('normalizeMessage', () => {
    it('trims surrounding whitespace', () => {
        expect(normalizeMessage('  hi  ')).toBe('hi');
    });

    it('turns whitespace-only and nullish input into an empty string', () => {
        expect(normalizeMessage('   \n')).toBe('');
        expect(normalizeMessage(null)).toBe('');
        expect(normalizeMessage(undefined)).toBe('');
    });
});

describe('buildWebhookPayload', () => {
    const at = new Date('2026-01-02T03:04:05.000Z');

    it('builds a single embed with the trimmed message and theme color', () => {
        const payload = buildWebhookPayload('  hello  ', THEMES[1], at);
        expect(payload.embeds).toHaveLength(1);
        expect(payload.embeds[0]).toMatchObject({
            title: '📩 Новое личное сообщение с сайта!',
            description: '**Текст:** hello',
            color: THEMES[1].embedColor,
            timestamp: '2026-01-02T03:04:05.000Z'
        });
    });

    it('falls back to the first theme color for an unknown theme', () => {
        expect(buildWebhookPayload('x', undefined, at).embeds[0].color).toBe(THEMES[0].embedColor);
        expect(buildWebhookPayload('x', {}, at).embeds[0].color).toBe(THEMES[0].embedColor);
    });

    it('uses the current time when no timestamp is given', () => {
        const before = Date.now();
        const timestamp = buildWebhookPayload('x', THEMES[0]).embeds[0].timestamp;
        expect(Date.parse(timestamp)).toBeGreaterThanOrEqual(before);
    });

    it('is json serializable', () => {
        expect(JSON.parse(JSON.stringify(buildWebhookPayload('hi', THEMES[0], at)))).toEqual(
            buildWebhookPayload('hi', THEMES[0], at)
        );
    });
});

describe('lanyardUrl', () => {
    it('points at the lanyard user endpoint', () => {
        expect(lanyardUrl('1447973979171323946')).toBe(
            'https://api.lanyard.rest/v1/users/1447973979171323946'
        );
    });
});
