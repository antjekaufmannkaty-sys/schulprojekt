# SchulApp – Projektbeschreibung für Claude Code

## Was ist das?
Eine Web-App für Lehrerin Antje Kaufmann. Zwei Modi:
1. **Quiz** – Kahoot-Style, Echtzeit, alle Schüler gleichzeitig, Timer, Rangliste
2. **Test** – Klassenarbeit, PIN-Login pro Schüler, eigenes Tempo, automatische Auswertung, manuelle Nachkorrektur + Benotung

## Tech-Stack
- **Next.js 14** (App Router, TypeScript)
- **Supabase** (Postgres + Realtime)
- **Vercel** (Hosting via GitHub)
- Keine Auth-Library – Schüler loggen sich per Name+Klasse (Quiz) oder PIN (Test) ein

## Umgebungsvariablen (in .env.local)
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Routen
| Route | Wer | Was |
|-------|-----|-----|
| `/` | alle | Startseite: Quiz oder Test wählen |
| `/quiz` | Schüler | Login: Name + Klasse + 6-stelliger Code |
| `/quiz/[sessionId]` | Schüler | Quiz spielen (Realtime) |
| `/test` | Schüler | Login: PIN + 6-stelliger Code |
| `/test/[sessionId]` | Schüler | Test ausfüllen (eigenes Tempo) |
| `/dashboard` | Lehrerin | Sessions verwalten, HTML hochladen |
| `/dashboard/session/[sessionId]` | Lehrerin | Quiz steuern / Ergebnisse + Noten |

## Datenmodell (Supabase)

### sessions
```sql
id UUID PK, type TEXT ('quiz'|'test'), title TEXT, status TEXT ('waiting'|'active'|'finished'),
questions JSONB, current_q INT, timer_secs INT, created_at TIMESTAMPTZ
```

### participants
```sql
id UUID PK, session_id UUID FK, name TEXT, klasse TEXT, pin TEXT,
score INT, answers JSONB, note TEXT, joined_at TIMESTAMPTZ
```

### events
```sql
id UUID PK, session_id UUID FK, type TEXT, payload JSONB, created_at TIMESTAMPTZ
```

### pins
```sql
id UUID PK, pin TEXT UNIQUE, name TEXT, klasse TEXT, created_at TIMESTAMPTZ
```

## Fragen-Format (HTML-Upload)
Lehrerin erstellt Fragen im Claude-Chat (per Skill), lädt die HTML-Datei im Dashboard hoch.
Die HTML-Datei enthält einen Block:
```html
<script id="questions" type="application/json">
[
  {
    "text": "Frage?",
    "options": ["A", "B", "C", "D"],
    "correct": 0,
    "points": 100,
    "timer": 30
  }
]
</script>
```

## Design
- Dark theme: `#0f0f13` Hintergrund, `#7c6fe0` Akzent
- Font: DM Sans (Google Fonts)
- Komplett responsiv (Schüler nutzen Handys)
- Kein externes UI-Framework, nur eigenes CSS in globals.css

## Session-Code
Die ersten 6 Zeichen der Session-UUID (ohne Bindestriche, uppercase) sind der Code für Schüler.

## Realtime-Logik
- Supabase Realtime auf Tabellen: `sessions`, `events`, `participants`
- Lehrer-Seite sendet Events → Schüler-Seiten hören per `postgres_changes`
- Quiz: Lehrer steuert Fragen, Timer läuft client-seitig
- Test: Schüler arbeiten unabhängig, geben am Ende ab

## Besonderheiten Test-Modus
- PIN wird gegen `pins`-Tabelle geprüft (vorher von Lehrerin importiert)
- Schüler navigiert frei zwischen Fragen (Nummern-Übersicht oben)
- Nach Abgabe: automatische Auswertung, Lehrerin kann Note manuell setzen
- "📋 Kopieren"-Button: exportiert Schülerdaten als Text → in Claude-Chat für Benotungs-Skill
