"""Family Panel: a sidebar panel for the family's school, agenda, meals, chores and screen time."""

from __future__ import annotations

from pathlib import Path

from homeassistant.components import frontend
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType

from .const import DOMAIN, I18N_URL, PANEL_PATH, PANEL_URL
from .panel import INVENTORY_CACHE, async_register_commands, async_register_panel

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Serve the panel and its language files, and add its commands."""
    base = Path(__file__).parent / "frontend"
    await hass.http.async_register_static_paths(
        [
            StaticPathConfig(PANEL_URL, str(base / "family-panel.js"), True),
            StaticPathConfig(I18N_URL, str(base / "i18n"), True),
        ]
    )
    async_register_commands(hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Add the panel to the sidebar; new sources picked in the options are read at once."""
    await async_register_panel(hass, entry)
    entry.async_on_unload(entry.add_update_listener(_options_updated))
    return True


async def _options_updated(hass: HomeAssistant, entry: ConfigEntry) -> None:
    hass.data.pop(INVENTORY_CACHE, None)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Remove the panel from the sidebar."""
    frontend.async_remove_panel(hass, PANEL_PATH)
    hass.data.pop(INVENTORY_CACHE, None)
    return True
