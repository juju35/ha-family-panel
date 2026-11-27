"""Config flow: one entry, no question; the options pick the sources (else they are found by integration)."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import callback
from homeassistant.helpers.selector import EntitySelector, EntitySelectorConfig

from .const import (
    CONF_CALENDARS,
    CONF_CHORES,
    CONF_COUNTDOWNS,
    CONF_MEALS,
    CONF_PERSONS,
    CONF_SHOPPING,
    CONF_WASTE,
    DEFAULTS,
    DOMAIN,
)

# Entity domains each source may be picked from
SOURCE_DOMAINS = {
    CONF_PERSONS: ["person"],
    CONF_CALENDARS: ["calendar"],
    CONF_MEALS: ["calendar", "todo", "sensor"],
    CONF_SHOPPING: ["todo"],
    CONF_CHORES: ["todo", "sensor"],
    CONF_WASTE: ["sensor", "calendar"],
    CONF_COUNTDOWNS: ["sensor", "calendar", "input_datetime"],
}


class FamilyPanelConfigFlow(ConfigFlow, domain=DOMAIN):
    """Add the Family panel to the sidebar."""

    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is None:
            return self.async_show_form(step_id="user")
        return self.async_create_entry(title="Family Panel", data={}, options=dict(DEFAULTS))

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return FamilyPanelOptionsFlow()


class FamilyPanelOptionsFlow(OptionsFlow):
    """The sources: each list left empty is filled with the entities of the integrations made for it."""

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            return self.async_create_entry(data={**self.config_entry.options, **user_input})
        options = self.config_entry.options
        schema = vol.Schema(
            {
                vol.Optional(key, default=list(options.get(key, []))): EntitySelector(
                    EntitySelectorConfig(domain=domains, multiple=True)
                )
                for key, domains in SOURCE_DOMAINS.items()
            }
        )
        return self.async_show_form(step_id="init", data_schema=schema)
