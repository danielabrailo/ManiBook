
from django.conf import settings
from django.db import models


class Powder(models.Model):
    class ColourFamily(models.TextChoices):
        RED = "red", "Red"
        PINK = "pink", "Pink"
        ORANGE = "orange", "Orange"
        YELLOW = "yellow", "Yellow"
        GREEN = "green", "Green"
        BLUE = "blue", "Blue"
        PURPLE = "purple", "Purple"
        BROWN = "brown", "Brown"
        NEUTRAL = "neutral", "Neutral"
        BLACK = "black", "Black"
        WHITE = "white", "White"
        MULTICOLOUR = "multicolour", "Multicolour"
        OTHER = "other", "Other"

    class Finish(models.TextChoices):
        SOLID = "solid", "Solid"
        GLITTER = "glitter", "Glitter"
        SHIMMER = "shimmer", "Shimmer"
        CHROME = "chrome", "Chrome"
        HOLOGRAPHIC = "holographic", "Holographic"
        FLAKE = "flake", "Flake"
        THERMAL = "thermal", "Thermal"
        OTHER = "other", "Other"

    class Intensity(models.TextChoices):
        LIGHT = "light", "Light"
        MEDIUM = "medium", "Medium"
        DARK = "dark", "Dark"

    class Undertone(models.TextChoices):
        WARM = "warm", "Warm"
        COOL = "cool", "Cool"
        NEUTRAL = "neutral", "Neutral"
        UNKNOWN = "unknown", "Unknown"

    class Coverage(models.TextChoices):
        SHEER = "sheer", "Sheer"
        BUILDABLE = "buildable", "Buildable"
        OPAQUE = "opaque", "Opaque"
        UNKNOWN = "unknown", "Unknown"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="powders",
    )
    name = models.CharField(max_length=150)
    brand = models.CharField(max_length=100, blank=True)
    product_code = models.CharField(max_length=100, blank=True)
    colour_family = models.CharField(
        max_length=20, choices=ColourFamily.choices,
        default=ColourFamily.OTHER,
    )
    hex_colour = models.CharField(max_length=7, blank=True)
    finish = models.CharField(
        max_length=20, choices=Finish.choices,
        default=Finish.SOLID,
    )
    intensity = models.CharField(
        max_length=10, choices=Intensity.choices,
        blank=True,
    )
    undertone = models.CharField(
        max_length=10, choices=Undertone.choices,
        default=Undertone.UNKNOWN,
    )
    coverage = models.CharField(
        max_length=12, choices=Coverage.choices,
        default=Coverage.UNKNOWN,
    )
    is_favourite = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "brand", "name"],
                name="unique_powder_per_owner_brand_name",
            ),
        ]

    def __str__(self):
        return f"{self.brand} - {self.name}" if self.brand else self.name


class PowderPhoto(models.Model):
    class PhotoType(models.TextChoices):
        PRODUCT = "product", "Product"
        SWATCH = "swatch", "Swatch"
        INSPIRATION = "inspiration", "Inspiration"

    powder = models.ForeignKey(
        Powder, on_delete=models.CASCADE, related_name="photos"
    )
    image = models.ImageField(upload_to="powders/%Y/%m/")
    photo_type = models.CharField(
        max_length=20, choices=PhotoType.choices
    )
    caption = models.CharField(max_length=200, blank=True)
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.powder.name} - {self.photo_type}"


class Manicure(models.Model):
    class NailShape(models.TextChoices):
        ALMOND = "almond", "Almond"
        OVAL = "oval", "Oval"
        SQUARE = "square", "Square"
        COFFIN = "coffin", "Coffin"
        STILETTO = "stiletto", "Stiletto"
        ROUND = "round", "Round"
        OTHER = "other", "Other"

    class Technique(models.TextChoices):
        SOLID = "solid", "Solid"
        FRENCH = "french", "French"
        OMBRE = "ombre", "Ombré"
        NAIL_ART = "nail_art", "Nail art"
        MIXED = "mixed", "Mixed"
        OTHER = "other", "Other"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="manicures",
    )
    title = models.CharField(max_length=200)
    completed_at = models.DateField()
    nail_shape = models.CharField(
        max_length=20, choices=NailShape.choices,
        default=NailShape.ALMOND,
    )
    technique = models.CharField(
        max_length=20, choices=Technique.choices,
        default=Technique.SOLID,
    )
    nail_length = models.CharField(max_length=20, blank=True)
    notes = models.TextField(blank=True)
    wear_duration_days = models.PositiveIntegerField(null=True, blank=True)
    removal_date = models.DateField(null=True, blank=True)
    powders = models.ManyToManyField(
        Powder,
        through="ManicurePowder",
        related_name="manicures",
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-completed_at", "-created_at"]

    def __str__(self):
        return self.title


class ManicurePowder(models.Model):
    manicure = models.ForeignKey(
        Manicure, on_delete=models.CASCADE, related_name="powder_usages"
    )
    powder = models.ForeignKey(
        Powder, on_delete=models.CASCADE, related_name="manicure_usages"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["manicure", "powder"],
                name="unique_powder_per_manicure",
            ),
        ]

    def __str__(self):
        return f"{self.manicure.title}: {self.powder.name}"


class ManicurePhoto(models.Model):
    manicure = models.ForeignKey(
        Manicure, on_delete=models.CASCADE, related_name="photos"
    )
    image = models.ImageField(upload_to="manicures/%Y/%m/")
    caption = models.CharField(max_length=200, blank=True)
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)


class Design(models.Model):
    class Source(models.TextChoices):
        MANUAL = "manual", "Manual"
        AI = "ai", "AI-generated"
        INSPIRATION = "inspiration", "Inspiration"

    class Status(models.TextChoices):
        IDEA = "idea", "Idea"
        PLANNED = "planned", "Planned"
        TRIED = "tried", "Tried"
        ARCHIVED = "archived", "Archived"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="designs",
    )
    title = models.CharField(max_length=200)
    source = models.CharField(
        max_length=20, choices=Source.choices, default=Source.MANUAL
    )
    style = models.CharField(max_length=50, blank=True)
    nail_shape = models.CharField(max_length=20, blank=True)
    instructions = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.IDEA
    )
    powders = models.ManyToManyField(
        Powder, through="DesignPowder",
        related_name="designs", blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class DesignPowder(models.Model):
    design = models.ForeignKey(
        Design, on_delete=models.CASCADE, related_name="powder_choices"
    )
    powder = models.ForeignKey(
        Powder, on_delete=models.CASCADE, related_name="design_choices"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["design", "powder"],
                name="unique_powder_per_design",
            ),
        ]


class DesignPhoto(models.Model):
    design = models.ForeignKey(
        Design, on_delete=models.CASCADE, related_name="photos"
    )
    image = models.ImageField(upload_to="designs/%Y/%m/")
    caption = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Tag(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="nail_tags",
    )
    name = models.CharField(max_length=50)
    powders = models.ManyToManyField(
        Powder, related_name="tags", blank=True
    )
    manicures = models.ManyToManyField(
        Manicure, related_name="tags", blank=True
    )
    designs = models.ManyToManyField(
        Design, related_name="tags", blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "name"],
                name="unique_tag_name_per_owner",
            ),
        ]

    def __str__(self):
        return self.name
