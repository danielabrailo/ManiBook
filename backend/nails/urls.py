from rest_framework.routers import DefaultRouter
from .views import PowderViewSet

router = DefaultRouter()
router.register("powders", PowderViewSet, basename="powder")

urlpatterns = router.urls