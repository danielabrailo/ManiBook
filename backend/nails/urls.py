from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import (
    PowderViewSet,
    PowderPhotoViewSet,
    ManicureViewSet,
    ManicurePhotoViewSet,
    TagViewSet,
    DesignViewSet,
    DesignPhotoViewSet,
    GenerateDesignView,
    SaveGeneratedDesignView
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

urlpatterns = [
    path(
        "designs/generate/",
        GenerateDesignView.as_view(),
        name="generate-design",
    ),
    path(
        "designs/save-generated/",
        SaveGeneratedDesignView.as_view(),
        name="save-generated-design",
    ),
] + router.urls
