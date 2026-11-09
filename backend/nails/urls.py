from rest_framework.routers import DefaultRouter
from .views import PowderViewSet, PowderPhotoViewSet

router = DefaultRouter()

router.register("powders", PowderViewSet, basename="powder")
router.register(
    "powder-photos",
    PowderPhotoViewSet,
    basename="powder-photo",
)

urlpatterns = router.urls