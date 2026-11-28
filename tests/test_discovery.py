"""The children and the sources, found in the registries."""

from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.family_panel.discovery import async_inventory


def _device(hass: HomeAssistant, domain: str, name: str) -> tuple[MockConfigEntry, str]:
    entry = MockConfigEntry(domain=domain, title=name)
    entry.add_to_hass(hass)
    device = dr.async_get(hass).async_get_or_create(
        config_entry_id=entry.entry_id, identifiers={(domain, name)}, name=name
    )
    return entry, device.id


def _entity(hass, entry, device_id, domain, platform, unique_id, key=None, object_id=None):
    return er.async_get(hass).async_get_or_create(
        domain,
        platform,
        unique_id,
        config_entry=entry,
        device_id=device_id,
        translation_key=key,
        suggested_object_id=object_id or unique_id,
    )


async def test_children_merged_by_name(hass: HomeAssistant):
    pronote, noe = _device(hass, "pronote", "Pronote - Noé Martin")
    _entity(hass, pronote, noe, "sensor", "pronote", "noe_hw", "homework")
    _entity(hass, pronote, noe, "sensor", "pronote", "noe_avg", "overall_average")
    # An older Pronote without translation keys: the role from the entity id
    _entity(hass, pronote, noe, "sensor", "pronote", "noe_tt", None, "pronote_noe_tomorrow_s_timetable")
    fl, noe_fl = _device(hass, "family_link", "Noé")
    _entity(hass, fl, noe_fl, "sensor", "family_link", "noe_screen", "screen_time")
    _entity(hass, fl, noe_fl, "switch", "family_link", "noe_lock", "lock")
    ent, alex = _device(hass, "ent_one", "Alex")
    _entity(hass, ent, alex, "sensor", "ent_one", "alex_sign", "words_to_sign")
    _entity(hass, ent, alex, "sensor", "ent_one", "alex_news", "news")  # not shown: no role

    inv = async_inventory(hass, {})
    by_name = {c["name"]: c for c in inv["children"]}
    assert set(by_name) == {"Noé Martin", "Alex"}
    noe_child = by_name["Noé Martin"]
    assert noe_child["school"]["source"] == "pronote"
    assert set(noe_child["school"]["entities"]) == {"homework", "average", "lessons_tomorrow"}
    assert noe_child["family_link"]["entities"] == {"screen_time": "sensor.noe_screen", "lock": "switch.noe_lock"}
    assert by_name["Alex"]["school"]["entities"] == {"to_sign": "sensor.alex_sign"}
    assert by_name["Alex"]["family_link"] is None


async def test_sources_by_integration_or_options(hass: HomeAssistant):
    mealie, meal_dev = _device(hass, "mealie", "Mealie")
    _entity(hass, mealie, meal_dev, "calendar", "mealie", "dinner")
    _entity(hass, mealie, meal_dev, "todo", "mealie", "shopping")
    bring, bring_dev = _device(hass, "bring", "Bring")
    _entity(hass, bring, bring_dev, "todo", "bring", "home")
    local, local_dev = _device(hass, "local_todo", "Lists")
    _entity(hass, local, local_dev, "todo", "local_todo", "chores_alex")
    wcs, wcs_dev = _device(hass, "waste_collection_schedule", "Waste")
    _entity(hass, wcs, wcs_dev, "sensor", "waste_collection_schedule", "recycling")
    saint, saint_dev = _device(hass, "saint_of_the_day", "Saint")
    _entity(hass, saint, saint_dev, "sensor", "saint_of_the_day", "saint")
    hass.states.async_set("calendar.family", "off")
    hass.states.async_set("calendar.dinner", "off")  # Mealie's: a meal plan, not a family calendar
    hass.states.async_set("person.parent", "home")

    inv = async_inventory(hass, {})
    assert inv["calendars"] == ["calendar.family"]
    assert inv["meals"] == ["calendar.dinner"]
    assert inv["shopping"] == ["todo.shopping", "todo.home"]
    assert inv["chores"] == ["todo.chores_alex"]
    assert inv["waste"] == ["sensor.recycling"]
    assert inv["saint"] == "sensor.saint"
    assert inv["persons"] == ["person.parent"]

    picked = async_inventory(hass, {"calendars": ["calendar.dinner"], "countdowns": ["sensor.holidays"]})
    assert picked["calendars"] == ["calendar.dinner"]
    assert picked["countdowns"] == ["sensor.holidays"]


async def test_periods_books_points_and_mealie(hass: HomeAssistant):
    """Pronote's past periods, ENT ONE's notebooks, a child's points sensor and Mealie's entries."""
    pronote, noe = _device(hass, "pronote", "Pronote - Noé")
    _entity(hass, pronote, noe, "sensor", "pronote", "noe_grades", "grades")
    _entity(hass, pronote, noe, "sensor", "pronote", "noe_punish", "punishments")
    _entity(hass, pronote, noe, "sensor", "pronote", "noe_menus", "menus")
    _entity(hass, pronote, noe, "sensor", "pronote", "noe_g1", "grades_period", "pronote_noe_grades_trimestre_1")
    avg = _entity(hass, pronote, noe, "sensor", "pronote", "noe_a1", "averages_period", "pronote_noe_averages_t1")
    hass.states.async_set(avg.entity_id, "3", {"period_key": "trimestre_1"})
    ent, alex = _device(hass, "ent_one", "Alex")
    _entity(hass, ent, alex, "sensor", "ent_one", "alex_sign", "words_to_sign")
    book = _entity(hass, ent, alex, "todo", "ent_one", f"{ent.entry_id}_homework_abc123", "homework_book", "ent_maths")
    _entity(hass, ent, alex, "sensor", "kidschores", "alex_pts", None, "kc_alex_points")
    mealie, meal_dev = _device(hass, "mealie", "Mealie")
    _entity(hass, mealie, meal_dev, "calendar", "mealie", "dinner")

    inv = async_inventory(hass, {})
    by_name = {c["name"]: c for c in inv["children"]}
    noe_child = by_name["Noé"]["school"]
    assert {"grades", "punishments", "menus"} <= set(noe_child["entities"])
    assert noe_child["periods"] == {
        "trimestre_1": {"grades": "sensor.pronote_noe_grades_trimestre_1", "averages": "sensor.pronote_noe_averages_t1"}
    }
    assert by_name["Alex"]["school"]["books"] == {"abc123": book.entity_id}
    assert by_name["Alex"]["points"] == "sensor.kc_alex_points"
    assert by_name["Noé"]["points"] is None
    assert inv["mealie"] == [mealie.entry_id]
