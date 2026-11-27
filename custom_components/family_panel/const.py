"""Constants for the Family Panel integration."""

DOMAIN = "family_panel"
VERSION = "1.0.0"

# Files served by the integration, and the sidebar panel (its own path, not /family_panel, so the frontend's panel
# route never shadows the files)
URL_BASE = f"/{DOMAIN}"
PANEL_URL = f"{URL_BASE}/family-panel.js"
I18N_URL = f"{URL_BASE}/i18n"
PANEL_PATH = "family"
PANEL_TITLE = "Family"
PANEL_ICON = "mdi:account-group"

# Integrations the panel reads, by platform of their entities
SCHOOL_PLATFORMS = ("pronote", "ent_one", "educartable", "skolengo")
FAMILY_LINK_PLATFORM = "family_link"
MEAL_PLATFORMS = ("mealie", "cookidoo")
SHOPPING_PLATFORMS = ("shopping_list", "bring", "mealie", "ourgroceries", "anylist")
CHORE_PLATFORMS = ("donetick", "grocy")
WASTE_PLATFORMS = ("waste_collection_schedule",)
SAINT_PLATFORM = "saint_of_the_day"
WORKDAY_PLATFORM = "workday"

# Sources picked in the options (entity lists); left empty, the panel finds them by integration
CONF_CALENDARS = "calendars"
CONF_SHOPPING = "shopping"
CONF_CHORES = "chores"
CONF_MEALS = "meals"
CONF_WASTE = "waste"
CONF_COUNTDOWNS = "countdowns"
CONF_PERSONS = "persons"

# Settings edited in the panel's Settings tab
CONF_ADMIN_ONLY = "admin_only"
CONF_ILLUSTRATION_THEME = "illustration_theme"
THEMES = ("auto", "day", "night")
DEFAULTS = {
    CONF_ADMIN_ONLY: False,
    CONF_ILLUSTRATION_THEME: "auto",
}
