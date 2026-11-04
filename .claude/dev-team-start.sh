#!/usr/bin/env bash
# Dev-Team-Start für dieses Projekt (wird von .claude/settings.json aufgerufen).
#
# Auf Simons Rechnern ist das Plugin dev-team installiert und erledigt alles selbst –
# dann tut dieses Skript nichts. In Cloud-Sitzungen (kein installiertes Plugin) holt es
# das Dev-Team von GitHub und stellt Grundgesetz, Agenten, Skills und Protokoll bereit.
# Darf die Sitzung nie blockieren: bei Fehlern still beenden.

modus="${1:-start}"
projekt="${CLAUDE_PROJECT_DIR:-$PWD}"

# Plugin lokal installiert? Dann übernimmt das Plugin.
# Nur wenn es installiert UND nicht abgeschaltet ist (in den Einstellungen "dev-team@roelz-plugins": true).
# Läuft vor jedem Werkzeugaufruf: deshalb nur Bash-Bordmittel, keine zusätzlichen Prozesse (grep, cat).
lies() { local x=""; [ -f "$1" ] && { IFS= read -r -d '' x < "$1" || true; }; printf -v "$2" '%s' "$x"; }
lies "$HOME/.claude/plugins/installed_plugins.json" _installiert
if [[ "$_installiert" == *dev-team@roelz-plugins* ]]; then
  lies "$HOME/.claude/settings.json" _s1; lies "$projekt/.claude/settings.local.json" _s2
  aus_re='"dev-team@roelz-plugins"[[:space:]]*:[[:space:]]*false'
  if ! [[ "$_s1" =~ $aus_re ]] && ! [[ "$_s2" =~ $aus_re ]]; then
    exit 0
  fi
fi
IFS= read -r -d '' eingabe || true

# Lieferkette: Wer das Dev-Team auf einen geprüften Stand festnageln will, setzt DEV_TEAM_REF (Tag oder Commit)
# in der Cloud-Umgebung oder "plugin_stand" in .claude/dev-team.json. Ohne Angabe: aktueller Stand von main (mit Warnung).
repo_url="${DEV_TEAM_REPO:-https://github.com/roelzer/roelz-plugins.git}"
ref="${DEV_TEAM_REF:-}"
if [ -z "$ref" ] && [ -f "$projekt/.claude/dev-team.json" ]; then
  ref="$(sed -n 's/^[[:space:]]*"plugin_stand":[[:space:]]*"\([^"]*\)".*/\1/p' "$projekt/.claude/dev-team.json" | head -n 1)"
fi
cache="${XDG_CACHE_HOME:-$HOME/.cache}/roelz-plugins"
plugin="$cache/plugins/dev-team"

holen() {
  if [ -d "$cache/.git" ]; then
    if [ -n "$ref" ]; then
      timeout 60 git -C "$cache" fetch -q --depth 1 origin "$ref" >/dev/null 2>&1 && git -C "$cache" checkout -q FETCH_HEAD >/dev/null 2>&1 || true
    else
      timeout 60 git -C "$cache" pull -q --ff-only >/dev/null 2>&1 || true
    fi
  else
    mkdir -p "$(dirname "$cache")" 2>/dev/null
    timeout 90 git clone -q "$repo_url" "$cache" >/dev/null 2>&1 || return 1
    if [ -n "$ref" ]; then
      git -C "$cache" fetch -q origin "$ref" >/dev/null 2>&1; git -C "$cache" checkout -q "$ref" >/dev/null 2>&1 || { echo "⚠ DEV_TEAM_REF=$ref nicht gefunden."; return 1; }
    fi
  fi
  [ -f "$plugin/wissen/grundgesetz.md" ]
}

case "$modus" in
  start)
    if ! holen; then
      echo "⚠ Dev-Team konnte in dieser Cloud-Sitzung nicht geladen werden: Das Repo roelzer/roelz-plugins ist nicht erreichbar."
      echo "Du kannst normal arbeiten (lesen, ändern, testen, committen, den Arbeitsbranch pushen); es fehlen nur Team-Agenten und Agenten-Protokoll."
      echo "Projektleiter: Sag Simon das in einem Satz. Dauerhafte Abhilfe: roelzer/roelz-plugins in der Cloud-Umgebung hinzufügen und eine neue Sitzung starten."
      exit 0
    fi
    # Agenten und Skills ins Projekt kopieren (nicht committen, siehe .gitignore).
    mkdir -p "$projekt/.claude/agents" "$projekt/.claude/skills" 2>/dev/null
    for a in "$plugin"/agents/*.md; do
      cp "$a" "$projekt/.claude/agents/dev-team-$(basename "$a")" 2>/dev/null
    done
    for s in "$plugin"/skills/*/; do
      name="$(basename "$s")"
      ziel="$projekt/.claude/skills/dev-team-$name"
      mkdir -p "$ziel" 2>/dev/null
      # Pfade einsetzen; in der Cloud darf der Projektleiter alle Abläufe selbst starten.
      sed -e "s#\${CLAUDE_PLUGIN_ROOT}#$plugin#g" -e '/^disable-model-invocation:/d' "$s/SKILL.md" > "$ziel/SKILL.md" 2>/dev/null
    done
    # Sicherstellen, dass die Kopien nie ins Repo gelangen.
    gi="$projekt/.gitignore"
    for muster in ".claude/agents/dev-team-*.md" ".claude/skills/dev-team-*/"; do
      grep -qxF "$muster" "$gi" 2>/dev/null || echo "$muster" >> "$gi"
    done
    printf '%s' "$eingabe" | CLAUDE_PLUGIN_ROOT="$plugin" CLAUDE_PROJECT_DIR="$projekt" bash "$plugin/scripts/sitzungsstart.sh"
    echo
    if [ -z "$ref" ]; then
      echo "⚠ Lieferkette: Das Dev-Team wurde vom aktuellen Stand von main geladen, nicht von einem geprüften Stand. Projektleiter: Sag Simon das; festnageln mit \"plugin_stand\" in .claude/dev-team.json (nur mit seiner Freigabe)."
    else
      echo "Dev-Team-Stand festgenagelt auf: $ref"
    fi
    echo "Hinweis Cloud-Sitzung: Die Dev-Team-Befehle heißen hier mit Bindestrich, z. B. /dev-team-auftrag statt /dev-team:auftrag; die Agenten ohne Präfix, z. B. kritiker statt dev-team:kritiker. Für Aufgaben der Stufe Normal/Groß den Skill dev-team-auftrag verwenden."
    ;;
  agent)
    [ -d "$plugin" ] || exit 0
    printf '%s' "$eingabe" | CLAUDE_PLUGIN_ROOT="$plugin" bash "$plugin/scripts/agent-kontext.sh"
    ;;
  waechter)
    if [ -d "$plugin" ] && [ -f "$plugin/scripts/waechter.sh" ]; then
      printf '%s' "$eingabe" | CLAUDE_PLUGIN_ROOT="$plugin" CLAUDE_PROJECT_DIR="$projekt" bash "$plugin/scripts/waechter.sh"
      exit $?
    fi
    # Dev-Team nicht geladen (z. B. Cloud-Umgebung ohne roelzer/roelz-plugins): nichts sperren. Der Sitzungsstart
    # sagt dem Projektleiter, dass das Team fehlt.
    exit 0
    ;;
  fertig)
    [ -d "$plugin" ] || exit 0
    printf '%s' "$eingabe" | CLAUDE_PROJECT_DIR="$projekt" bash "$plugin/scripts/fertig-pruefung.sh"
    ;;
  durchlauf)
    [ -f "$plugin/scripts/durchlauf.sh" ] || exit 0
    printf '%s' "$eingabe" | CLAUDE_PROJECT_DIR="$projekt" bash "$plugin/scripts/durchlauf.sh"
    ;;
  kontext)
    [ -f "$plugin/scripts/kontext.sh" ] || exit 0
    printf '%s' "$eingabe" | CLAUDE_PLUGIN_ROOT="$plugin" CLAUDE_PROJECT_DIR="$projekt" bash "$plugin/scripts/kontext.sh" hinweis
    ;;
  log-start|log-ende)
    [ -d "$plugin" ] || exit 0
    printf '%s' "$eingabe" | CLAUDE_PROJECT_DIR="$projekt" bash "$plugin/scripts/agenten-log.sh" "${modus#log-}"
    ;;
esac
exit 0
