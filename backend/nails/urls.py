from rest_framework.routers import DefaultRouter
from .views import (
    PowderViewSet,
    PowderPhotoViewSet,
    ManicureViewSet,
    ManicurePhotoViewSet,
    TagViewSet,
    DesignViewSet,
    DesignPhotoViewSet
)

router = DefaultRouter()

router.register("powders", PowderViewSet, basename="powder")
router.register(
    "powder-photos",
    PowderPhotoViewSet,
    basename="powder-photo",
)
router.register("manicures", ManicureViewSet, basename="manicure")
router.register("manicure-photos", ManicurePhotoViewSet, basename="manicure-photo")
router.register("tags", TagViewSet, basename="tag")
router.register("designs", DesignViewSet, basename="design")
router.register("design-photos", DesignPhotoViewSet, basename="design-photo")

urlpatterns = router.urls