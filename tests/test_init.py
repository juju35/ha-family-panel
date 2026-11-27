"""Setup, the config and options flows, the sidebar panel and the WebSocket commands."""

from homeassistant.components import frontend
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.family_panel.const import DEFAULTS, DOMAIN, PANEL_ICON, PANEL_PATH


async def _setup(hass: HomeAssistant, options=None) -> MockConfigEntry:
    assert await async_setup_component(hass, "http", {})
    entry = MockConfigEntry(domain=DOMAIN, title="Family Panel", data={}, options=options or dict(DEFAULTS))
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def test_config_flow_single_entry(hass: HomeAssistant):
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": "user"})
    assert result["type"] == "form"
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    assert result["type"] == "create_entry"
    assert result["options"] == DEFAULTS
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": "user"})
    assert result["type"] == "abort"
    assert result["reason"] == "single_instance_allowed"


async def test_options_flow_picks_sources(hass: HomeAssistant):
    entry = await _setup(hass)
    hass.states.async_set("calendar.family", "off")
    result = await hass.config_entries.options.async_init(entry.entry_id)
    assert result["type"] == "form"
    result = await hass.config_entries.options.async_configure(result["flow_id"], {"calendars": ["calendar.family"]})
    assert result["type"] == "create_entry"
    assert entry.options["calendars"] == ["calendar.family"]
    # The settings of the Settings tab are kept
    assert entry.options["admin_only"] is False


async def test_panel_for_every_user_then_admins_only(hass: HomeAssistant, hass_ws_client):
    entry = await _setup(hass)
    panel = hass.data[frontend.DATA_PANELS][PANEL_PATH]
    assert panel.sidebar_icon == PANEL_ICON
    assert panel.require_admin is False
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": f"{DOMAIN}/update_settings", "admin_only": True})
    res = await client.receive_json()
    assert res["success"]
    assert res["result"]["settings"]["admin_only"] is True
    assert hass.data[frontend.DATA_PANELS][PANEL_PATH].require_admin is True
    await hass.config_entries.async_unload(entry.entry_id)
    assert PANEL_PATH not in hass.data[frontend.DATA_PANELS]


async def test_update_settings_checks_values(hass: HomeAssistant, hass_ws_client):
    await _setup(hass)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": f"{DOMAIN}/update_settings", "illustration_theme": "sunset"})
    res = await client.receive_json()
    assert not res["success"]


async def test_inventory_command(hass: HomeAssistant, hass_ws_client):
    await _setup(hass)
    hass.states.async_set("person.parent", "home")
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": f"{DOMAIN}/inventory"})
    res = await client.receive_json()
    assert res["success"]
    assert res["result"]["children"] == []
    assert res["result"]["persons"] == ["person.parent"]
    assert res["result"]["settings"] == DEFAULTS
