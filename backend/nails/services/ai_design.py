
import re

from django.db.models import Count

from nails.models import Powder


HEX_COLOUR_PATTERN = re.compile(r"^#[0-9A-Fa-f]{6}$")


class PowderSelectionError(Exception):
    """Raised when powder selection cannot produce a valid palette."""


def is_valid_hex_colour(value):
    """Return whether a colour is a valid six-digit hexadecimal colour."""
    return bool(value and HEX_COLOUR_PATTERN.fullmatch(value))


def select_eligible_powders(
    *,
    user,
    colour_mode="any",
    selected_powder_ids=None,
    finishes=None,
    colour_families=None,
    undertones=None,
    favourites_only=False,
    limit=30,
):
    """
    Select powders owned by the user that are eligible for AI design generation.

    colour_mode:
        - any: use any eligible powder.
        - underused: prioritise powders used in fewer manicures.
        - selected: use only manually selected powders.

    Returns:
        A dictionary containing eligible powder metadata and exclusion counts.
    """

    if colour_mode not in {"any", "underused", "selected"}:
        raise PowderSelectionError("Invalid colour selection mode.")

    if not isinstance(limit, int) or isinstance(limit, bool) or not 1 <= limit <= 50:
        raise PowderSelectionError("Powder limit must be between 1 and 50.")

    selected_powder_ids = selected_powder_ids or []
    finishes = finishes or []
    colour_families = colour_families or []
    undertones = undertones or []

    queryset = Powder.objects.filter(owner=user)

    # For manual selection, verify every requested ID belongs to the user.
    if colour_mode == "selected":
        if not selected_powder_ids:
            raise PowderSelectionError(
                "Select at least one powder for this colour mode."
            )

        selected_ids = set(selected_powder_ids)

        if len(selected_ids) != len(selected_powder_ids):
            raise PowderSelectionError("Duplicate powder IDs are not allowed.")

        owned_ids = set(
            queryset.filter(id__in=selected_ids).values_list("id", flat=True)
        )

        if owned_ids != selected_ids:
            raise PowderSelectionError(
                "One or more selected powders do not belong to your collection."
            )

        queryset = queryset.filter(id__in=selected_ids)

    # Apply optional filters.
    if finishes:
        queryset = queryset.filter(finish__in=finishes)

    if colour_families:
        queryset = queryset.filter(colour_family__in=colour_families)

    if undertones:
        queryset = queryset.filter(undertone__in=undertones)

    if favourites_only:
        queryset = queryset.filter(is_favourite=True)

    # Count distinct manicures using each powder.
    queryset = queryset.annotate(
        usage_count=Count("manicures", distinct=True)
    )

    if colour_mode == "underused":
        queryset = queryset.order_by("usage_count", "name")
    else:
        queryset = queryset.order_by("name")

    powders = list(queryset)
    
    # Exclude powders without usable hex colours.
    eligible_powders = [
        powder
        for powder in powders
        if is_valid_hex_colour(powder.hex_colour)
    ]

    excluded_count = len(powders) - len(eligible_powders)

    if not eligible_powders:
        raise PowderSelectionError(
            "No eligible powders found. Check your filters and make sure "
            "your powders have valid hexadecimal colours."
        )

    # For any and selected modes, preserve the existing collection ordering.
    # For underused, the ordering above prioritises least-used powders.
    selected_powders = eligible_powders[:limit]

    return {
        "powders": [
            {
                "id": powder.id,
                "name": powder.name,
                "brand": powder.brand,
                "hex_colour": powder.hex_colour.upper(),
                "colour_family": powder.colour_family,
                "finish": powder.finish,
                "intensity": powder.intensity,
                "undertone": powder.undertone,
                "coverage": powder.coverage,
                "is_favourite": powder.is_favourite,
                "usage_count": powder.usage_count,
            }
            for powder in selected_powders
        ],
        "total_matching": len(powders),
        "total_eligible": len(eligible_powders),
        "excluded_missing_or_invalid_hex": excluded_count,
    }
