from rest_framework.routers import DefaultRouter
from .views import PowderViewSet, PowderPhotoViewSet, TagViewSet

router = DefaultRouter()

router.register("powders", PowderViewSet, basename="powder")
router.register(
    "powder-photos",
    PowderPhotoViewSet,
    basename="powder-photo",
)
router.register("tags", TagViewSet, basename="tag")

urlpatterns = router.urls