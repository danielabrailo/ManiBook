from django.contrib import admin

from .models import (
    Powder,
    PowderPhoto,
    Manicure,
    ManicurePowder,
    ManicurePhoto,
    Design,
    DesignPowder,
    DesignPhoto,
    Tag,
)

admin.site.register(Powder)
admin.site.register(PowderPhoto)
admin.site.register(Manicure)
admin.site.register(ManicurePowder)
admin.site.register(ManicurePhoto)
admin.site.register(Design)
admin.site.register(DesignPowder)
admin.site.register(DesignPhoto)
admin.site.register(Tag)