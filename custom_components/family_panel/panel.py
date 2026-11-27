"""Sidebar panel and its WebSocket commands.

The panel (``frontend/family-panel.js``) has seven tabs: Today, School, Agenda, Meals, Chores, Screens and Settings.
It reads the states of the entities of other integrations and acts through their services, so it only needs:

- ``family_panel/inventory``: the children and the sources (which entity is which), with the settings;
- ``family_panel/update_settings``: the settings of the Settings tab (administrators only).

Every user may open the panel unless the "administrators only" setting is on.
"""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.components import frontend, panel_custom, websocket_api
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er

from .const import (
    CONF_ADMIN_ONLY,
    CONF_ILLUSTRATION_THEME,
    DEFAULTS,
    DOMAIN,
    PANEL_ICON,
    PANEL_PATH,
    PANEL_TITLE,
    PANEL_URL,
    THEMES,
    VERSION,
)
from .discovery import async_inventory


def settings(entry: ConfigEntry | None) -> dict[str, Any]:
    """The settings, defaults filled in (an option no longer offered is left out)."""
    options = entry.options if entry else {}
    return {key: options.get(key, default) for key, default in DEFAULTS.items()}


def _entry(hass: HomeAssistant) -> ConfigEntry | None:
    entries = hass.config_entries.async_entries(DOMAIN)
    return entries[0] if entries else None


async def async_register_panel(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Add Family to the sidebar, for every user unless the setting keeps it to administrators."""
    if PANEL_PATH in hass.data.get(frontend.DATA_PANELS, {}):
        frontend.async_remove_panel(hass, PANEL_PATH)
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_PATH,
        webcomponent_name="family-panel",
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        module_url=f"{PANEL_URL}?v={VERSION}",
        require_admin=settings(entry)[CONF_ADMIN_ONLY],
        config={"version": VERSION},
    )


# The last inventory, kept until the device or entity registry changes or the options change
INVENTORY_CACHE = f"{DOMAIN}_inventory"


@callback
def cached_inventory(hass: HomeAssistant) -> dict[str, Any]:
    """The inventory, scanned again only when something it reads may have changed."""
    entry = _entry(hass)
    key = (entry.entry_id, tuple(sorted((k, str(v)) for k, v in entry.options.items()))) if entry else None
    cache = hass.data.get(INVENTORY_CACHE)
    if cache is None or cache[0] != key:
        cache = hass.data[INVENTORY_CACHE] = (key, async_inventory(hass, dict(entry.options) if entry else {}))
    return cache[1]


@callback
def async_register_commands(hass: HomeAssistant) -> None:
    """The panel's WebSocket commands, and the inventory dropped when the registries change."""
    for command in (_ws_inventory, _ws_update_settings):
        websocket_api.async_register_command(hass, command)

    @callback
    def _drop(_: Event) -> None:
        hass.data.pop(INVENTORY_CACHE, None)

    hass.bus.async_listen(dr.EVENT_DEVICE_REGISTRY_UPDATED, _drop)
    hass.bus.async_listen(er.EVENT_ENTITY_REGISTRY_UPDATED, _drop)


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/inventory"})
@callback
def _ws_inventory(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    connection.send_result(msg["id"], {**cached_inventory(hass), "settings": settings(_entry(hass))})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/update_settings",
        vol.Optional(CONF_ADMIN_ONLY): bool,
        vol.Optional(CONF_ILLUSTRATION_THEME): vol.In(THEMES),
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def _ws_update_settings(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    entry = _entry(hass)
    if entry is None:
        connection.send_error(msg["id"], "not_found", "Family Panel is not set up")
        return
    changes = {key: msg[key] for key in DEFAULTS if key in msg}
    hass.config_entries.async_update_entry(entry, options={**entry.options, **changes})
    if CONF_ADMIN_ONLY in changes:
        await async_register_panel(hass, entry)
    connection.send_result(msg["id"], {"settings": settings(entry)})
