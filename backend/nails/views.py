from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Powder, PowderPhoto
from .serializers import PowderSerializer, PowderPhotoSerializer


class PowderViewSet(viewsets.ModelViewSet):
    serializer_class = PowderSerializer
    permission_classes = [IsAuthenticated]

    filterset_fields = [
        "colour_family",
        "finish",
        "intensity",
        "undertone",
        "is_favourite",
    ]

    search_fields = ["name", "brand", "product_code"]
    ordering_fields = ["name", "brand", "created_at", "updated_at"]

    def get_queryset(self):
        return Powder.objects.filter(owner=self.request.user)

class PowderPhotoViewSet(viewsets.ModelViewSet):
    serializer_class = PowderPhotoSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["powder", "photo_type"]

    def get_queryset(self):
        return PowderPhoto.objects.filter(
            powder__owner=self.request.user
        ).select_related("powder")