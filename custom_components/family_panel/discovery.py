"""What the panel shows, found in the entity and device registries.

The panel reads states in the browser; this module only says which entity is which:

- the children, one per device of a school integration (Pronote, ENT ONE, Educartable, Skolengo) or of Family Link,
  the devices of one child merged by name, each entity given a role (``homework``, ``screen_time``…) from its
  translation key, else from the end of its entity id;
- the calendars, shopping lists, chores, meal plans, waste collections and countdowns: those picked in the options,
  else the ones of the integrations made for them;
- the saint of the day and the workday sensor, when those integrations are set up.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Any

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er

from .const import (
    CHORE_PLATFORMS,
    CONF_CALENDARS,
    CONF_CHORES,
    CONF_COUNTDOWNS,
    CONF_MEALS,
    CONF_PERSONS,
    CONF_SHOPPING,
    CONF_WASTE,
    FAMILY_LINK_PLATFORM,
    MEAL_PLATFORMS,
    SAINT_PLATFORM,
    SCHOOL_PLATFORMS,
    SHOPPING_PLATFORMS,
    WASTE_PLATFORMS,
    WORKDAY_PLATFORM,
)

# Role of a school entity per translation key, all integrations together (Pronote, ENT ONE, Educartable)
SCHOOL_ROLES = {
    "homework": "homework",
    "overall_average": "average",
    "averages": "averages",
    "grades": "grades",
    "lessons_today": "lessons_today",
    "lessons_tomorrow": "lessons_tomorrow",
    "lessons_next_day": "lessons_next_day",
    "absences": "absences",
    "delays": "delays",
    "class": "class",
    "information_and_surveys": "information",
    "unread_messages": "messages",
    "notifications": "messages",
    "words_to_sign": "to_sign",
    "carnet_to_sign": "to_sign",
    "documents_to_sign": "documents_to_sign",
    "school": "calendar",
    "events_calendar": "calendar",
    "homework_calendar": "homework_calendar",
    "homework_book": "homework_list",
    "homework_list": "homework_list",
    # What the Pronote card shows besides: punishments, the canteen's menus, evaluations and the periods
    "punishments": "punishments",
    "menus": "menus",
    "evaluations": "evaluations",
    "current_period": "current_period",
    "periods": "periods",
}
# Pronote's past periods (terms, semesters): their sensors per translation key, the period named by their
# `period_key` attribute, else by the end of their entity id
PERIOD_ROLES = {"grades_period": "grades", "averages_period": "averages", "overall_average_period": "average"}
PERIOD_ID = re.compile(r"_(?:grades|averages|overall_average)_(\w+)$")
LEGACY_PERIOD = re.compile(r"_(grades|averages|overall_average)_((?:trimestre|semestre)_\w+)$")
# ENT ONE's homework notebooks: one to-do list each (unique id ``…_homework_<notebook id>``), ticked to mark done
BOOK_ID = re.compile(r"_homework_([^_]+)$")
# The same roles read from the end of the entity id, for versions without translation keys (Pronote's English ids)
# and for the integrations whose keys are not listed above (Skolengo)
LEGACY_ROLES = (
    ("lessons_tomorrow", re.compile(r"_(?:timetable_tomorrow|tomorrow_s_timetable|lessons_tomorrow)$")),
    ("lessons_today", re.compile(r"_(?:timetable_today|today_s_timetable|lessons_today)$")),
    ("average", re.compile(r"_(?:overall_average|average|moyenne(?:_generale)?)$")),
    ("homework", re.compile(r"_(?:homework|devoirs)$")),
    ("grades", re.compile(r"_(?:grades|notes)$")),
    ("absences", re.compile(r"_absences$")),
    ("delays", re.compile(r"_(?:delays|retards)$")),
    ("messages", re.compile(r"_(?:unread_messages|messages|notifications)$")),
    ("to_sign", re.compile(r"_(?:words_to_sign|to_sign|a_signer)$")),
    ("punishments", re.compile(r"_(?:punishments|punitions)$")),
    ("menus", re.compile(r"_menus$")),
    ("information", re.compile(r"_information_and_surveys$")),
    ("current_period", re.compile(r"_current_period$")),
)
# Family Link roles: the integration's translation keys, used as they are
FAMILY_LINK_ROLES = {
    "status",
    "screen_time",
    "remaining_time",
    "daily_limit",
    "bonus",
    "blocked_apps",
    "next_restriction",
    "battery",
    "location",
    "lock",
    "school_mode",
    "bedtime",
    "add_bonus",
    "ring",
    "limit_reached",
    "bedtime_active",
    "bedtime_start",
}
# Prefixes some integrations give their device names, dropped from the child's name
NAME_PREFIX = re.compile(r"^(?:pronote|ent\s*one|educartable|skolengo|family\s*link)\s*[-:·]?\s*", re.IGNORECASE)
CHORE_WORDS = re.compile(r"chore|tache|tâche|menage|ménage|corvee|corvée|hausarbeit|klus", re.IGNORECASE)
MAX_CALENDARS = 6
POINTS_WORDS = re.compile(r"points?\b|_points?_|punkte|puntos|punti", re.IGNORECASE)


def _fold(text: str) -> str:
    """Lower case without accents, for comparing names."""
    return "".join(c for c in unicodedata.normalize("NFD", text.lower()) if unicodedata.category(c) != "Mn").strip()


def _child_name(device: dr.DeviceEntry | None, fallback: str) -> str:
    name = (device.name_by_user or device.name or "") if device else ""
    return NAME_PREFIX.sub("", name).strip() or fallback


def _school_role(entry: er.RegistryEntry) -> str | None:
    if entry.translation_key and entry.translation_key in SCHOOL_ROLES:
        return SCHOOL_ROLES[entry.translation_key]
    object_id = entry.entity_id.split(".", 1)[1]
    return next((role for role, pattern in LEGACY_ROLES if pattern.search(object_id)), None)


def _period(hass: HomeAssistant, entry: er.RegistryEntry) -> tuple[str, str] | None:
    """The past period of a Pronote sensor and its role there, else None."""
    state = hass.states.get(entry.entity_id)
    key = state.attributes.get("period_key") if state else None
    object_id = entry.entity_id.split(".", 1)[1]
    if entry.translation_key in PERIOD_ROLES:
        role = PERIOD_ROLES[entry.translation_key]
        key = key or ((m := PERIOD_ID.search(object_id)) and m.group(1))
    elif not entry.translation_key and (m := LEGACY_PERIOD.search(object_id)):
        role = "average" if m.group(1) == "overall_average" else m.group(1)
        key = key or m.group(2)
    else:
        return None
    return (str(key), role) if key else None


def _family_link_role(entry: er.RegistryEntry) -> str | None:
    if entry.translation_key in FAMILY_LINK_ROLES:
        return entry.translation_key
    if entry.domain == "device_tracker":
        return "location"
    return None


def _children(hass: HomeAssistant, entries: list[er.RegistryEntry]) -> list[dict[str, Any]]:
    """One child per name, from the devices of the school integrations and of Family Link."""
    devices = dr.async_get(hass)
    children: dict[str, dict[str, Any]] = {}
    groups: dict[tuple[str, str], list[er.RegistryEntry]] = {}
    for entry in entries:
        if entry.disabled_by or entry.platform not in (*SCHOOL_PLATFORMS, FAMILY_LINK_PLATFORM):
            continue
        groups.setdefault((entry.platform, entry.device_id or entry.config_entry_id or entry.platform), []).append(
            entry
        )
    for (platform, key), group in sorted(groups.items()):
        device = devices.async_get(key) if group[0].device_id else None
        name = _child_name(device, platform)
        child = children.setdefault(
            _fold(name).split(" ")[0],
            {"id": _fold(name).replace(" ", "_"), "name": name, "school": None, "family_link": None},
        )
        family_link = platform == FAMILY_LINK_PLATFORM
        if not family_link and child["school"] is None:
            # The school's name (often the full name) rather than the Family Link account's
            child["name"] = name
        part = child["family_link" if family_link else "school"] or {"source": platform, "entities": {}}
        for entry in group:
            if not family_link and (period := _period(hass, entry)):
                part.setdefault("periods", {}).setdefault(period[0], {})[period[1]] = entry.entity_id
                continue
            if not family_link and entry.domain == "todo" and (book := BOOK_ID.search(entry.unique_id or "")):
                part.setdefault("books", {})[book.group(1)] = entry.entity_id
            role = _family_link_role(entry) if family_link else _school_role(entry)
            if role:
                part["entities"].setdefault(role, entry.entity_id)
        if part["entities"]:
            child["family_link" if family_link else "school"] = part
    kids = [c for c in children.values() if c["school"] or c["family_link"]]
    # Each child's points (KidsChores, ChoreOps, an input_number…): a sensor or number named after them and "points"
    for kid in kids:
        first = _fold(kid["name"]).split(" ")[0]
        kid["points"] = next(
            (
                e.entity_id
                for e in entries
                if not e.disabled_by
                and e.domain in ("sensor", "input_number", "number")
                and POINTS_WORDS.search(e.entity_id)
                and first in _fold(e.entity_id.split(".", 1)[1]).split("_")
            ),
            None,
        )
    return kids


def _of(entries: list[er.RegistryEntry], domains: tuple[str, ...], platforms: tuple[str, ...]) -> list[str]:
    return [e.entity_id for e in entries if not e.disabled_by and e.domain in domains and e.platform in platforms]


@callback
def async_inventory(hass: HomeAssistant, options: dict[str, Any]) -> dict[str, Any]:
    """Children and sources, as the panel reads them (picked in the options, else found by integration)."""
    registry = er.async_get(hass)
    entries = list(registry.entities.values())
    taken = {*SCHOOL_PLATFORMS, *MEAL_PLATFORMS, *WASTE_PLATFORMS, FAMILY_LINK_PLATFORM}

    def picked(key: str, found: list[str]) -> list[str]:
        return list(options.get(key) or found)

    calendars = [
        state.entity_id
        for state in hass.states.async_all("calendar")
        if (entry := registry.async_get(state.entity_id)) is None or entry.platform not in taken
    ][:MAX_CALENDARS]
    todo_lists = [e for e in entries if e.domain == "todo" and not e.disabled_by]
    chores = _of(entries, ("todo", "sensor"), CHORE_PLATFORMS) + [
        e.entity_id for e in todo_lists if e.platform not in CHORE_PLATFORMS and CHORE_WORDS.search(e.entity_id)
    ]
    shopping = [e for e in _of(entries, ("todo",), SHOPPING_PLATFORMS) if e not in chores]
    first = lambda platform, domain: next(  # noqa: E731 - a one-line lookup
        (e.entity_id for e in entries if e.platform == platform and e.domain == domain and not e.disabled_by), None
    )
    return {
        "children": _children(hass, entries),
        "calendars": picked(CONF_CALENDARS, calendars),
        "shopping": picked(CONF_SHOPPING, shopping),
        "chores": picked(CONF_CHORES, chores),
        "meals": picked(CONF_MEALS, _of(entries, ("calendar",), MEAL_PLATFORMS)),
        "waste": picked(CONF_WASTE, _of(entries, ("sensor", "calendar"), WASTE_PLATFORMS)),
        "countdowns": picked(CONF_COUNTDOWNS, []),
        "persons": picked(CONF_PERSONS, sorted(hass.states.async_entity_ids("person"))),
        "saint": first(SAINT_PLATFORM, "sensor"),
        "workday": first(WORKDAY_PLATFORM, "binary_sensor"),
        # Mealie's config entries, for its meal plan actions (servings, times, planning a day)
        "mealie": sorted({e.config_entry_id for e in entries if e.platform == "mealie" and e.config_entry_id}),
    }
